// js/gui/renderer.js

import { arrP, arrB, arrF, arrS, arrT, getSlots } from './canvasUtils.js';
import { prepareAndRenderBackground, selectAndRenderBackground, blendBgCanvasesInto } from './canvasUtils.js';
import { renderStartLeader, renderStartBoth, renderRunning, renderEnd } from './text.js';
import { FamilyIndex, ColorFamily } from './color.js';
import { familyForIndex, drawPhoneAt } from './sprites.js'; 
import { MAX_STATES, STATE_DUR, MAX_DUR, CONCERT_CLK, PREVIEW_CLK } from './globals.js'; 
import { sequence } from './sequence.js';
import { stopAnimation } from './animation.js';
import { clockify, easeInOutQuad01 } from './helpers.js';

// ---------- compositing ----------
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

function blit(ctxDst, cnvSrc) {
  ctxDst.drawImage(
    cnvSrc,
    0, 0, cnvSrc.width, cnvSrc.height,
    0, 0, ctxDst.w, ctxDst.h
  );
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

// ---------- render storyboard ----------

function crossFadeBackground(ctxB, cnvB, status){
  const now = performance.now();
  const t = easeInOutQuad01(now, status.bgFade);
  blendBgCanvasesInto(ctxB, cnvB, status._bgFade.from, status._bgFade.to, t);
  if (t >= 1) status.bgFade.active = false;
  return;  
} // 1.1

function switchBackground(ctxB, status) {
  if (status.running && status.bgFamily != null) {
    selectAndRenderBackground(ctxB, status);
  } else {
    prepareAndRenderBackground(ctxB);
  }
  return;
} // 1.2

function clearModeSelectView(ctxT) {
ctxT.clearRect(0, 0, ctxT.w, ctxT.h);
} // 1.3

function testModeSelect(status) {
  return status.role === 'leader' && !status.modeConfirmed;
} // 2.1

function confirmModeSelect(ctxT, ctxS, status) {
  // Don’t let mode-select influence an already-running animation
  if (!status.running) status.msPerBeat = status.previewClock;
  renderStartLeader(ctxT, status);
  renderPhonesLayer(ctxS, status);
  composeFrame({ drawB: true, drawS: true, drawT: true });
} // 2.2

function spritesReady() {
  const slots = getSlots();
  return Array.isArray(slots) && slots.length > 0;
} // 3.1

function renderSprites(ctxS, status) {
  renderPhonesLayer(ctxS, status);
  composeFrame({ drawB: true, drawS: true, drawT: true });
} // 3.2

function validateTimeValue(status) {
  return (typeof status.startWall === 'number' &&
          typeof status.runStateDurationMs === 'number');
}

function enterEndScreen(status) {
  status.running = false;
  status.isEndScreen = true;
  stopAnimation();
  // (later you’ll trigger the “house lights up” fade here)
}

function advanceRunningState(status, nowMs, maxStates) {
  // Contract check
  if (!validateTimeValue(status)) {
    console.error('[frameRender] running but missing startWall/runStateDurationMs', {
      startWall: status.startWall,
      runStateDurationMs: status.runStateDurationMs,
    });
    enterEndScreen(status);
    return 0; // elapsedMs
  }

  const elapsedMs = nowMs - status.startWall;

  // Initialise boundary once 
  if (typeof status.nextStateWallMs !== 'number') {
    status.nextStateWallMs = status.startWall + status.runStateDurationMs;
  }

  // Step index deterministically
  if (nowMs >= status.nextStateWallMs) {
    const steps =
      Math.floor((nowMs - status.nextStateWallMs) / status.runStateDurationMs) + 1;

    status.index += steps;
    status.nextStateWallMs += steps * status.runStateDurationMs;
  }

  // End condition
  if (status.index >= maxStates) {
    status.index = maxStates - 1;
    enterEndScreen(status);
  }
  
  return elapsedMs;
}

function applyIdleIndex(status) {
  if (!status.isEndScreen) status.index = status.fullHenge;
}

function clampIndex(status, maxStates) {
  if (status.index < 0) status.index = 0;
  if (status.index >= maxStates) status.index = maxStates - 1;
}

// ---------- main render ----------
export function frameRender(status) {
  const ctxP = arrP[0].ctx;
  const ctxB = arrB[0].ctx;
  const ctxS = arrS[0].ctx;
  const ctxT = arrT[0].ctx;

// 1) Render Background
  const cnvB = arrB[0].canvas;
	
  if (status.bgFade?.active) {
	crossFadeBackground(ctxB, cnvB, status); // 1.1
  } else {
	switchBackground(ctxB, status); // 1.2
  }
	
  clearModeSelectView(ctxT); // 1.3     
  
// 2) Render Start View
  if (testModeSelect(status)) {	// 2.1
	confirmModeSelect(ctxT, ctxS, status); // 2.2
	return;
  }

// 3) Render available sprites
  if (!spritesReady()) { // 3.1
 	renderSprites(ctxS, status); // 3.2
	return;
  }

// 4) Advance MLS state

  let elapsedMs = 0;
	
  if (status.running) {
	elapsedMs = advanceRunningState(status, performance.now(), MAX_STATES);
  } else {
	applyIdleIndex(status);
  }
  clampIndex(status, MAX_STATES);
  
// 5) Phones into sprites layer 

  renderPhonesLayer(ctxS, status);

// 6) Text
  if (status.isEndScreen) {
    renderEnd(ctxT, status);
  } else {
    const clockMs = computeClockMs(status, elapsedMs);
    const { mins, secs } = clockify(clockMs);
    if (status.running) renderRunning(ctxT, { status, mins, secs });
    else renderStartBoth(ctxT, status);
  }

// 7) Composite (no debug foreground)
  composeFrame({ drawB: true, drawS: true, drawT: true });
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

