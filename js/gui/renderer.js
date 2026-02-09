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

// ---------- main render ----------
export function frameRender(status) {
  const ctxP = arrP[0].ctx;
  const ctxB = arrB[0].ctx;
  const ctxS = arrS[0].ctx;
  const ctxT = arrT[0].ctx;

// 1) Background (supports crossfade)
const cnvB = arrB[0].canvas;

if (status.bgFade?.active) {
  const now = performance.now();
  const t = easeInOutQuad01(now, status.bgFade);
  blendBgCanvasesInto(ctxB, cnvB, status._bgFade.from, status._bgFade.to, t);
  if (t >= 1) status.bgFade.active = false;  
} else {
  if (status.running && status.bgFamily != null) {
    selectAndRenderBackground(ctxB, status);
  } else {
    prepareAndRenderBackground(ctxB);
  }
}
	     
  ctxT.clearRect(0, 0, ctxT.w, ctxT.h);

  // 2) Leader mode-select view: text-only + no running
  if (status.role === 'leader' && !status.modeConfirmed) {
    // Keep this, but DO NOT let it influence an already-running animation
    if (!status.running) status.msPerBeat = status.previewClock;

    renderStartLeader(ctxT, status);
    renderPhonesLayer(ctxS, status);
    composeFrame({ drawB: true, drawS: true, drawT: true });

    return;
  }

  // 3) If slots missing, still render whatever phones layer logic decides
  const baseSlots = getSlots();
  if (!baseSlots?.length) {
    renderPhonesLayer(ctxS, status);
    composeFrame({ drawB: true, drawS: true, drawT: true });
    return;
  }

const MAX_STATES = sequence.length; // MUST be 31

let elapsedMs = 0;

if (status.running) {
  const nowMs = performance.now();

  // Hard contract: must be set at clock tap
  if (typeof status.startWall !== 'number' || typeof status.runStateDurationMs !== 'number') {
    console.error('[frameRender] running but missing startWall/runStateDurationMs', {
      startWall: status.startWall,
      runStateDurationMs: status.runStateDurationMs,
    });
    status.running = false;
    status.isEndScreen = true;
    stopAnimation();
//    beginBackgroundCrossfade(status, arrB[0].ctx, ColorFamily.NONE, 5000);
  } else {
    elapsedMs = nowMs - status.startWall;

    // Initialize the next boundary once
    if (typeof status.nextStateWallMs !== 'number') {
      status.nextStateWallMs = status.startWall + status.runStateDurationMs;
    }

    // Advance index deterministically when boundaries are crossed
    if (nowMs >= status.nextStateWallMs) {
      const steps =
        Math.floor((nowMs - status.nextStateWallMs) / status.runStateDurationMs) + 1;

      status.index += steps;
      status.nextStateWallMs += steps * status.runStateDurationMs;
    }

    // End condition
    if (status.index 	>= MAX_STATES) {
      status.index       = MAX_STATES - 1;
      status.running     = false;
      status.isEndScreen = true;
      stopAnimation();
//      beginBackgroundCrossfade(status, arrB[0].ctx, ColorFamily.NONE, 5000);
    }
  }
} else {
  if (!status.isEndScreen) status.index = status.fullHenge;
}

  // Clamp (keeps everything in bounds even if idx computed at boundary)
  if (status.index < 0) status.index = 0;
  if (status.index >= MAX_STATES) status.index = MAX_STATES - 1;

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

