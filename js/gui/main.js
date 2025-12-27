// js/gui/main.js

import {
//  initCanvas,
  initSurfaces,
  renderSavedBackground,
  prepareAndRenderBackground,
  getSlots,
  setSlots,
  composeFrame,
  arrPane,
  arrB,
  arrF,
  arrT,
} from './canvasUtils.js';

//import { arrPane, arrB, arrF, arrT, composeFrame, getSlots } from './canvasUtils.js';

import {
  renderStartLeader,
  renderStartBoth,
  renderRunning,
  renderEnd,
} from './text.js';

import {
  setRender,
  refresh,
} from './runTime.js';

import {
  stopAnimation,
} from './animation.js';

import {
  ensurePhoneAtlasForSlots,
  downloadFamilyRingPNG,
  drawPhoneAt,
  familyForIndex,
  radializeSlots,
} from './sprites.js';

import { clockify } from './helpers.js';
import { makeHengeOf } from './henge.js';

import { sequence } from './sequence.js';
import { installUIHandlers } from './uiControls.js';

// MLS / sequence configuration

const MAX_STATES	= sequence.length;  // 31
const STATE_DUR		= 24;				// beats
const CONCERT_CLK	= 1000;				// ms
const PREVIEW_CLK	= 42;				// ms
const MAX_DUR = 
  MAX_STATES * STATE_DUR * CONCERT_CLK;	// 744000 ms
const FULL_HENGE	= 18;				// pre-start state index

let _lastPhonesKey = null;

// ---------------------------------------------------------------------------
//  App entry point
// ---------------------------------------------------------------------------

export async function initApp() {
  console.log('✅ GUI initialised');
  console.log('🧪 main.js pairing-check build 2025-12-24 A');

  // 1) Surfaces from <canvas data-*> contract
  const canvasPane = document.getElementById('mobile');
  const designW    = parseInt(canvasPane.dataset.designW, 10);
  const designH	   = parseInt(canvasPane.dataset.designH, 10);
  const mode       = canvasPane.dataset.mode;

  const { ctxPane, ctxB, ctxF, ctxT } = initSurfaces({
    paneId: canvasPane.id,
    designW,
    designH,
    mode,
  });

console.log('[pairing check @main]', {
  pane: ctxPane.canvas === canvasPane,
  bg:   ctxB.canvas    === arrB[0].canvas,
  fg:   ctxF.canvas    === arrF[0].canvas,
  text: ctxT.canvas    === arrT[0].canvas,
  paneSize: [canvasPane.width, canvasPane.height],
  bgSize:   [arrB[0].canvas.width, arrB[0].canvas.height],
  fgSize:   [arrF[0].canvas.width, arrF[0].canvas.height],
  textSize: [arrT[0].canvas.width, arrT[0].canvas.height],
});

  // Keep your existing variable names if you want
  const canvas = canvasPane;
  const ctx    = ctxPane;

  // 2) status uses pane geometry
  const status = createInitialStatus(ctx);

  // 3) background draws into offscreen background layer
  prepareAndRenderBackground(ctxB);

  // 5) slots are geometry; use pane ctx for sizing reference
  const slots = makeHengeOf(ctx, 25);
  setSlots(slots);

  await ensurePhoneAtlasForSlots(slots);

  // 6) re-initialise after physically rotating phone
  installResizeHandler();
  
  // 7) UI attaches to the visible pane canvas
  installUIHandlers(ctxPane, canvasPane, status);

  // 8) renderer should NOT be passed ctx/canvas that represent an offscreen layer
  setRender(() => {
    frameRender(status); // preferred if frameRender reads arrPane/arrB/arrF/arrT
  });

  // 9) initial paint
  refresh();
}


// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

// Create the initial status object: all process/runtime flags live here.
function createInitialStatus(ctx) {
  const roleAtLaunch = window.location.pathname.includes('leader')
    ? 'leader'
    : 'consort';

  console.log('[main] role =', roleAtLaunch);

  return {
    // Role
    role: 			roleAtLaunch,  			// 'leader' or 'consort'

    // Animation state
    running:    	false,               	// true while MLS sequence is running
    index: 			0,
    startWall:     	0,                   	// performance.now() when the show starts
    isEndScreen:	false,               	// true only while END view is shown
    concertClock:	CONCERT_CLK, 			
    previewClock:	PREVIEW_CLK, 
    msPerBeat:     	CONCERT_CLK,    		// tempo in ms/beat (default = concert)
    fullHenge: 	   	FULL_HENGE,          	// pre-start state index (18)

    // Mode state
    modeChosen:    	'concert',           	// 'concert' or 'preview'
    modeConfirmed: 	(roleAtLaunch === 'consort'),	// consorts skip mode-select; leaders don't
  };
}

function installResizeHandler() {
  // debounce state (kept inside the handler closure)
  let tId = null;

  window.addEventListener(
    'resize',
    () => {
      // collapse bursts of resize events into one refresh
      if (tId) clearTimeout(tId);

      tId = setTimeout(() => {
        tId = null;
        prepareAndRenderBackground(arrB[0].ctx);

        refresh();
      }, 120);
    },
    { passive: true }
  );
}

//import { arrPane, arrB, arrF, arrT, composeFrame, getSlots } from './canvasUtils.js';
// also uses: prepareAndRenderBackground, renderStartLeader, renderStartBoth, renderRunning, renderEnd,
// radializeSlots, drawPhoneAt, familyForIndex, sequence, clockify, stopAnimation
function frameRender(status) {
  const ctxPane = arrPane[0].ctx;
  const ctxB    = arrB[0].ctx;
  const ctxF    = arrF[0].ctx;
  const ctxT    = arrT[0].ctx;

  // 1) Background layer (brute force for now)
  prepareAndRenderBackground(ctxB);

  // 2) Clear dynamic layers
  ctxF.clearRect(0, 0, ctxF.w, ctxF.h);
  ctxT.clearRect(0, 0, ctxT.w, ctxT.h);

  // 3) Leader mode-select: TEXT ONLY (no phones)
  if (status.role === 'leader' && !status.modeConfirmed) {
    // Show preview tempo as the candidate during mode select
    status.msPerBeat = status.previewClock;

    renderStartLeader(ctxT, status);
    composeFrame({ drawB: true, drawF: true, drawT: true });
    return;
  }

  // 4) Slots (needed for both static and animated phones)
  const baseSlots = getSlots();
  if (!baseSlots?.length) {
    // Nothing to draw except background/text (text will be empty here)
    composeFrame({ drawB: true, drawF: true, drawT: true });
    return;
  }

  const slots = radializeSlots(ctxPane, baseSlots);

  // 5) Compute MLS state index (STATIC when not running, ANIMATED when running)
  let elapsedMs = 0;
  let ended = false;

  if (status.running) {
    elapsedMs = performance.now() - status.startWall;

    const stateDurationMs = STATE_DUR * status.msPerBeat;
    const idx = Math.floor(elapsedMs / stateDurationMs);

    if (idx >= MAX_STATES) {
      status.index   = MAX_STATES - 1;
      status.running = false;
      ended          = true;
    } else {
      status.index = idx;
    }
  } else {
    // Start view: fixed "full henge" look (same for concert + preview)
    status.index = status.fullHenge;
  }

  // Clamp (belt-and-braces)
  if (status.index < 0) status.index = 0;
  if (status.index >= MAX_STATES) status.index = MAX_STATES - 1;

  // 6) Phones layer (static in start view; animated when running)

  syncPhonesToForeground(status.index);
  composeFrame({ drawB: true, drawF: true, drawT: true });

  // 7) Text overlay (START / RUNNING / END)
  if (ended) {
//    refresh();
    renderEnd(ctxT, status);
    status.isEndScreen = true;
    stopAnimation();
//    refresh();
  } else {
    const clockMs = computeClockMs(status, elapsedMs);
    const { mins, secs } = clockify(clockMs);

    if (!status.running) {
      renderStartBoth(ctxT, status);           // start screen over static henge
    } else {
      renderRunning(ctxT, { status, mins, secs }); // running overlay over animated henge
    }
  }

  // 8) Composite layers onto the visible pane
  composeFrame({ drawB: true, drawF: true, drawT: true });
}

// - CONCERT: 00:00 to 12:24 real time
// - PREVIEW: 00:00 to 12:24 fast-forward
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

// Paint one MLS state into the FOREGROUND layer (ctxF), using sequence[stateIndex].
function syncPhonesToForeground(stateIndex) {
  const ctxPane = arrPane[0].ctx;
  const ctxF    = arrF[0].ctx;

  const baseSlots = getSlots();
  const slots     = radializeSlots(ctxPane, baseSlots);

  // clear foreground layer
  ctxF.clearRect(0, 0, ctxF.w, ctxF.h);

  const bits = sequence[stateIndex]; // expected: [5] values (0/1)

  // ---- ONE log per function call (not per phone) ----
  // persistent call counter (survives across frames)
  syncPhonesToForeground._calls = (syncPhonesToForeground._calls || 0) + 1;
  const callId = syncPhonesToForeground._calls;

  console.log('[syncPhonesToForeground] BEGIN', {
    callId,
    stateIndex,
    bits,
    baseLen: Array.isArray(baseSlots) ? baseSlots.length : null,
    slotsLen: Array.isArray(slots) ? slots.length : null,
    ctxF_wh: [ctxF.w, ctxF.h],
  });

  // draw phones
  for (let i = 0; i < slots.length; i++) {
    const slot   = slots[i];
    const family = familyForIndex(i);
    const active = (bits[i % 5] !== 0);

    // sample a few only
    if (i < 3) {
      console.log('[syncPhonesToForeground] slot sample', i, {
        x: slot.x, y: slot.y, w: slot.w, h: slot.h, family, active
      });
    }

    drawPhoneAt(ctxF, { ...slot, family, active, shadow: true });
  }

  console.log('[syncPhonesToForeground] END', { callId, drawn: slots.length });
}
