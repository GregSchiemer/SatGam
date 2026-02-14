// js/gui/renderer.js

import { arrP, arrB, arrF, arrS, arrT, getSlots } from './canvasUtils.js';
import { prepareAndRenderBackground, selectAndRenderBackground, blendBgCanvasesInto, beginBackgroundCrossfade } from './canvasUtils.js';
import { renderStartLeader, renderStartBoth, renderRunning, renderEnd, chooseTextColorForBackground } from './text.js';
import { FamilyIndex, ColorFamily } from './color.js';
import { familyForIndex, drawPhoneAt } from './sprites.js'; 
import { MAX_STATES, STATE_DUR, MAX_DUR, CONCERT_CLK, PREVIEW_CLK } from './globals.js'; 
import { sequence } from './sequence.js';
import { stopAnimation, startAnimation } from './animation.js';
import { clockify, easeInOutQuad01, isConcertMode } from './helpers.js';

// ==============================
// —— Background (cross-cutting) ——
// ==============================

// 1.1 Play an in-progress crossfade (and optionally stop ticking when finished)
function playBackgroundCrossfadeIfActive(ctxB, cnvB, status) {
  if (!status.bgFade || !status.bgFade.active) return false;

  const now = performance.now();
  const t = easeInOutQuad01(now, status.bgFade);
  blendBgCanvasesInto(ctxB, cnvB, status._bgFade.from, status._bgFade.to, t);

  if (t >= 1) {
    status.bgFade.active = false;

    // If we were only ticking to run an auto-fade (start/end), stop after fade completes.
    if (status.stopAfterFade && !status.running) {
      status.stopAfterFade = false;
      stopAnimation();
    }
  }
  return true;
}

// 1.2 Paint a steady background when not fading
function paintSteadyBackground(ctxB, status) {
  if (status.running && status.bgFamily != null) selectAndRenderBackground(ctxB, status);
  else prepareAndRenderBackground(ctxB);
}

// 1) Render background layer (fade takes precedence)
function renderBackgroundLayer(ctxB, cnvB, status) {
  if (playBackgroundCrossfadeIfActive(ctxB, cnvB, status)) return;
  paintSteadyBackground(ctxB, status);
}

// ===============================
// —— Composition (cross-cutting) ——
// ===============================

function blit(ctxDst, cnvSrc) {
  ctxDst.drawImage(
    cnvSrc,
    0, 0, cnvSrc.width, cnvSrc.height,
    0, 0, ctxDst.w, ctxDst.h
  );
}

export function composeFrame({ drawB = true, drawF = false, drawS = true, drawT = true } = {}) {
  const { ctx: ctxP } = arrP[0];
  const { canvas: cnvB } = arrB[0];
  const { canvas: cnvF } = arrF[0];
  const { canvas: cnvS } = arrS[0];
  const { canvas: cnvT } = arrT[0];

  ctxP.clearRect(0, 0, ctxP.w, ctxP.h);

  if (drawB) blit(ctxP, cnvB);
  if (drawF) blit(ctxP, cnvF);
  if (drawS) blit(ctxP, cnvS);
  if (drawT) blit(ctxP, cnvT);
}

// 2) Clear text layer
function clearTextLayer(ctxT) {
  ctxT.clearRect(0, 0, ctxT.w, ctxT.h);
}

// =====================
// —— View detection ——
// =====================

const VIEW_MODE  = 'mode';
const VIEW_START = 'start';
const VIEW_RUN   = 'run';
const VIEW_END   = 'end';

// 3.1 Decide which view we are in (layman: “what screen should the audience see?”)
function currentView(status) {
  if (status.role === 'leader' && !status.modeConfirmed) return VIEW_MODE;
  if (status.isEndScreen) return VIEW_END;
  if (status.running) return VIEW_RUN;
  return VIEW_START;
}

// 3.2 Detect view entry (layman: “did we just arrive at a new screen?”)
function didEnterNewView(status, view) {
  return status._view !== view;
}

function rememberCurrentView(status, view) {
  status._view = view;
}

// ===============================
// —— Auto fades on view entry ——
// ===============================

// 4.1 House lights down (Start View entry → fade to black)
function startHouseLightsDownOnce(status, ctxB) {
  if (status.lightsDownDone) return;

  status.lightsDownDone = true;
  status.stopAfterFade = true;     // tick only until fade completes (we’re not running)
  beginBackgroundCrossfade(status, ctxB, ColorFamily.BLACK, 5000);
  startAnimation();                // ensure frames while fading
}

// 4.2 House lights up (End View entry → fade to neutral)
function startHouseLightsUpOnce(status, ctxB) {
  if (status.lightsUpDone) return;

  status.lightsUpDone = true;
  status.stopAfterFade = true;     // tick only until fade completes (we’re not running)
  beginBackgroundCrossfade(status, ctxB, ColorFamily.NONE, 5000);
  startAnimation();                // ensure frames while fading
}

// 4) Run entry actions when we arrive at a new view
function onEnterView(status, view, ctxB) {
  if (view === VIEW_MODE) {
    // new cycle begins
    status.lightsDownDone = false;
    status.lightsUpDone   = false;
    status.stopAfterFade  = false;
    return;
  }

  // ✅ Auto fades only in CONCERT mode
  if (!isConcertMode(status)) return;

  if (view === VIEW_START) {
    startHouseLightsDownOnce(status, ctxB);
    return;
  }

  if (view === VIEW_END) {
    startHouseLightsUpOnce(status, ctxB);
    return;
  }

  if (view === VIEW_RUN) status.stopAfterFade = false;
}


// ===========================
// —— Mode Select View ——
// ===========================

function isModeSelectView(status) {
  return status.role === 'leader' && !status.modeConfirmed;
}

function renderModeSelectView(ctxT, ctxS, status) {
  if (!status.running) status.msPerBeat = status.previewClock;

  renderStartLeader(ctxT, status);
  renderPhonesLayer(ctxS, status);
  composeFrame({ drawB: true, drawS: true, drawT: true });
}

// =======================
// —— Running View ——
// =======================

function ensureRunTiming(status) {
  return (typeof status.startWall === 'number' &&
          typeof status.runStateDurationMs === 'number');
}

function enterEndScreen(status) {
  status.running = false;
  status.isEndScreen = true;
  // DO NOT stopAnimation() here if you want “house lights up” to run.
  // stopAnimation() is handled after fade completes via stopAfterFade.
}

function failRunTimingContract(status) {
  if (ensureRunTiming(status)) return false;

  console.error('[frameRender] running but missing startWall/runStateDurationMs', {
    startWall: status.startWall,
    runStateDurationMs: status.runStateDurationMs,
  });

  enterEndScreen(status);
  return true;
}

function computeElapsedMs(status, nowMs) {
  return nowMs - status.startWall;
}

function ensureNextBoundaryIsInitialised(status) {
  if (typeof status.nextStateWallMs === 'number') return;
  status.nextStateWallMs = status.startWall + status.runStateDurationMs;
}

function applyBoundaryStepIfDue(status, nowMs) {
  if (nowMs < status.nextStateWallMs) return;

  const steps =
    Math.floor((nowMs - status.nextStateWallMs) / status.runStateDurationMs) + 1;

  status.index += steps;
  status.nextStateWallMs += steps * status.runStateDurationMs;
}

function applyEndConditionIfReached(status, maxStates) {
  if (status.index < maxStates) return;

  status.index = maxStates - 1;
  enterEndScreen(status);
}

function advanceRunningState(status, nowMs, maxStates) {
  if (failRunTimingContract(status)) return 0;

  const elapsedMs = computeElapsedMs(status, nowMs);
  ensureNextBoundaryIsInitialised(status);
  applyBoundaryStepIfDue(status, nowMs);
  applyEndConditionIfReached(status, maxStates);

  return elapsedMs;
}

// =====================
// —— Start / End ——
// =====================

function applyIdleIndex(status) {
  if (!status.isEndScreen) status.index = status.fullHenge;
}

function clampIndex(status, maxStates) {
  if (status.index < 0) status.index = 0;
  if (status.index >= maxStates) status.index = maxStates - 1;
}

function slotsReady() {
  const slots = getSlots();
  return Array.isArray(slots) && slots.length > 0;
}

function renderWithoutSlots(ctxS, status) {
  renderPhonesLayer(ctxS, status);
  composeFrame({ drawB: true, drawS: true, drawT: true });
}

// Step A (in renderer.js)
function renderTextLayer(ctxT, status, elapsedMs) {
  ctxT.fillStyle = chooseTextColorForBackground(status);  // returns 'black' or 'white'

  if (status.isEndScreen) {
    renderEnd(ctxT, status);
    return;
  }

  const clockMs = computeClockMs(status, elapsedMs);
  const { mins, secs } = clockify(clockMs);

  if (status.running) renderRunning(ctxT, { status, mins, secs });
  else renderStartBoth(ctxT, status);
}


// ======================
// —— MAIN STORYBOARD ——
// ======================

export function frameRender(status) {
  const ctxB = arrB[0].ctx;
  const ctxS = arrS[0].ctx;
  const ctxT = arrT[0].ctx;
  const cnvB = arrB[0].canvas;

  // 0) Decide view + run “enter view” actions once
  const view = currentView(status);
  if (didEnterNewView(status, view)) {
    rememberCurrentView(status, view);
    onEnterView(status, view, ctxB);
  }

  // 1) Render background (fade playback or steady paint)
  renderBackgroundLayer(ctxB, cnvB, status);

  // 2) Clear text layer for fresh draw
  clearTextLayer(ctxT);

  // 3) Mode Select View (leader only)
  if (isModeSelectView(status)) {
    renderModeSelectView(ctxT, ctxS, status);
    return;
  }

  // 4) If slots missing, render what we can and exit
  if (!slotsReady()) {
    renderWithoutSlots(ctxS, status);
    return;
  }

  // 5) Advance show state (only when running)
  let elapsedMs = 0;
  if (status.running) elapsedMs = advanceRunningState(status, performance.now(), MAX_STATES);
  else applyIdleIndex(status);

  // 6) Keep state index in range
  clampIndex(status, MAX_STATES);

  // 7) Render phones/sprites for this view/state
  renderPhonesLayer(ctxS, status);

  // 8) Render text overlay (start/running/end)
  renderTextLayer(ctxT, status, elapsedMs);

  // 9) Composite layers to pane
  composeFrame({ drawB: true, drawS: true, drawT: true });
}


// ---------- phones ----------
function renderPhonesLayer(ctxS, status) {
  ctxS.clearRect(0, 0, ctxS.w, ctxS.h);

  // 1) Mode select view
  if (status.role === 'leader' && !status.modeConfirmed) return;

  // 2) End view
  if (status.isEndScreen) {
    syncPhonesToSpritesLayer(status.index, { maskBits: [0, 0, 0, 0, 0] });
    return;
  }

  // 3) Start view
  if (!status.running) {
    syncPhonesToSpritesLayer(status.fullHenge, { maskBits: [1, 1, 1, 1, 1] });
    return;
  }

  // 4) Running view
  syncPhonesToSpritesLayer(status.index);
}


// - CONCERT: real time - PREVIEW: fast-forward.
function computeClockMs(status, elapsedMs) {
  if (status.modeChosen === 'preview') {
    const totalPreviewMs =
      MAX_STATES * STATE_DUR * status.msPerBeat;

    if (totalPreviewMs <= 0) return 0;

    const frac = Math.min(1, elapsedMs / totalPreviewMs);
    return frac * MAX_DUR;
  }

  // Concert mode: show true elapsed time
  return elapsedMs;
}


// Paint one MLS state into the SPRITES layer.
export function syncPhonesToSpritesLayer(stateIndex, { maskBits = null } = {}) {
  const slots = getSlots();
  if (!slots?.length) return;

  const ctxS = arrS[0].ctx;

  // Prefer explicit override; otherwise use MLS sequence.
  const bits = maskBits ?? sequence[stateIndex]; // <- no optional chaining

  // If you still want a fallback full-on mask for out-of-range indices:
  const safeBits = bits ?? [1, 1, 1, 1, 1];

  ctxS.clearRect(0, 0, ctxS.w, ctxS.h);

  for (let i = 0; i < slots.length; i++) {
    const slot   = slots[i];
    const family = familyForIndex(i);
    const bitPos = FamilyIndex[family];
    if (!Number.isInteger(bitPos)) {
      throw new Error(`FamilyIndex missing for family=${family} (index i=${i})`);
    }

    const active = (safeBits[bitPos] !== 0);

    const radialOrientation = Math.PI / 2;
    const theta = slot.theta ?? slot.angle ?? 0;
    const angle = theta + radialOrientation;

    drawPhoneAt(ctxS, { ...slot, angle, family, active, shadow: true });
  }
}