// js/gui/main.js

import {
//  initCanvas,
  initSurfaces,
  renderSavedBackground,
  prepareAndRenderBackground,
  getSlots,
  setSlots,
  radializeSlots,
  composeFrame,
  arrP,
  arrB,
  arrF,
  arrS,
  arrT,
} from './canvasUtils.js';

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
//  downloadFamilyRingPNG,
  drawPhoneAt,
  familyForIndex,
//  radializeSlots,
} from './sprites.js';

import { clockify, set2Pi } from './helpers.js';
import { makeHenge25, makeHenge, arcRadiusForHotspotTouch  } from './henge.js';

//import { makeHengeOf, makeHenge25 } from './henge.js';


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

  // 1) Surfaces from <canvas data-*> contract
  const canvasPane = document.getElementById('mobile');
  const designW    = parseInt(canvasPane.dataset.designW, 10);
  const designH	   = parseInt(canvasPane.dataset.designH, 10);
  const mode       = canvasPane.dataset.mode;

  const { ctxP, ctxB, ctxF, ctxT } = initSurfaces({
//    paneId: canvasPane.id,
    designW,
    designH,
    mode,
  });

console.log('[pairing check @main]', {
  pane: ctxP.canvas === canvasPane,
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
  const ctx    = ctxP;

  // 2) status uses pane geometry
  const status = createInitialStatus(ctx);

  status.debugKeys = true;
  
  // 3) draw background layer offscreen 
  prepareAndRenderBackground(ctxB);

  // 4) slots uses pane geometry

	const N = 25;
	const phoneW = 30; //40;
	const phoneH = 56; //70;
	const keyRadius = 18; // can be whatever; it doesn't affect foot-touch
	
	const arcRadius = (phoneW / (2 * Math.tan(Math.PI / N))); // feet-touch
	
	const { slots, ctxS } = makeHenge(ctx, {
	  N,
	  arcRadiusMode: 'feet',
	  arcRadius, //: 105,
	  phoneW,
	  phoneH,
	  keyRadius,
	});

	ctx.keyRadius = ctxS.keyRadius;     // or ctxP.keyRadius, whichever you use consistently

	setSlots(slots);

    console.log('[main] ctxS entries:', Object.entries(ctxS));		


  // 5) build slot atlas
  await ensurePhoneAtlasForSlots(slots);


  // 6) re-initialise geometry when user rotates phone
  installResizeHandler();
  
  // 7) attach UI to visible pane canvas
  installUIHandlers(ctxP, canvasPane, status);

  // 8) render arrB/arrF/arrT to composite layer arrP
  setRender(() => {
    frameRender(status);
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

// Phones-layer renderer.
// - End screen: NO phones (leave ctxF cleared).
// - Mode-select leader view: NO phones.
// - Running: render current animated frame.
// - Start view: render full henge.
function renderPhonesLayer(ctxF, status) {
  // Ensure phones layer is blank unless we explicitly draw phones below.
  // (frameRender already clears ctxF, but this makes the helper self-contained.)
  ctxF.clearRect(0, 0, ctxF.w, ctxF.h);

  // 1) Leader mode select: text-only
  if (status.role === 'leader' && !status.modeConfirmed) return;

  // 2) End screen: intentionally no phones
  if (status.isEndScreen) return;

  // 3) Otherwise draw phones
  const idx = status.running ? status.index : status.fullHenge;
  syncPhonesToForeground(idx);
}

function frameRender(status) {
  const ctxP = arrP[0].ctx;
  const ctxB    = arrB[0].ctx;
  const ctxF    = arrF[0].ctx;
  const ctxT    = arrT[0].ctx;

  prepareAndRenderBackground(ctxB);
  ctxT.clearRect(0, 0, ctxT.w, ctxT.h);

  if (status.role === 'leader' && !status.modeConfirmed) {
    status.msPerBeat = status.previewClock;
    renderStartLeader(ctxT, status);
    renderPhonesLayer(ctxF, status);
    composeFrame({ drawB: true, drawF: true, drawT: true });
    return;
  }

  const baseSlots = getSlots();
  if (!baseSlots?.length) {
    renderPhonesLayer(ctxF, status);
    composeFrame({ drawB: true, drawF: true, drawT: true });
    return;
  }

  let elapsedMs = 0;

  if (status.running) {
    elapsedMs = performance.now() - status.startWall;
    const stateDurationMs = STATE_DUR * status.msPerBeat;
    const idx = Math.floor(elapsedMs / stateDurationMs);

    if (idx >= MAX_STATES) {
      status.index       = MAX_STATES - 1;
      status.running     = false;
      status.isEndScreen = true;
      stopAnimation();
    } else {
      status.index = idx;
    }
  } else {
    if (!status.isEndScreen) status.index = status.fullHenge;
  }

  if (status.index < 0) status.index = 0;
  if (status.index >= MAX_STATES) status.index = MAX_STATES - 1;

  renderPhonesLayer(ctxF, status);

  if (status.isEndScreen) {
    renderEnd(ctxT, status);
  } else {
    const clockMs = computeClockMs(status, elapsedMs);
    const { mins, secs } = clockify(clockMs);

    if (status.running) renderRunning(ctxT, { status, mins, secs });
    else renderStartBoth(ctxT, status);
  }

	// DEBUG overlay drawn on top of text
	drawKeyDebugOverlay(ctxF, ctxP, status);

	// 8) Composite
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

const slots = getSlots();
const bits = sequence[stateIndex]; // expected: [5] values (0/1)
const ctxP = arrP[0].ctx;
const ctxF    = arrF[0].ctx;
  
for (let i = 0; i < slots.length; i++) {
  const slot = slots[i];
  const family = familyForIndex(i);
  const active = (bits[i % 5] !== 0);

  const theta = slot.theta ?? slot.angle ?? 0;               // position angle
//  const angle = theta + (ctxP.orientBias ?? ctxP.pi2); // draw rotation
  const angle = theta + (ctxP.orientBias ?? Math.PI / 2); // draw rotation

  drawPhoneAt(ctxF, { ...slot, angle, family, active, shadow: true });
  }
}

function drawKeyDebugOverlay(ctxF, ctxP, status) {
  if (!status.debugKeys) return;

  const slots = getSlots();

  if (!slots?.length) return;

  // Prefer per-slot hotspot radius; fallback to ctxP.keyRadius
  const r = (slots[0]?.hot?.r ?? ctxP.keyRadius ?? 16);
  const pi2 = ctxP.pi2 ?? (Math.PI * 2);

  ctxF.save();

  // --- Blue circles for ALL keys ---
  ctxF.lineWidth = 1;
  ctxF.strokeStyle = 'rgba(0, 0, 255, 0.6)';
  for (const s of slots) {
    const x = s.hot?.x ?? s.x;
    const y = s.hot?.y ?? s.y;

    ctxF.beginPath();
    ctxF.arc(x, y, r, 0, pi2);
    ctxF.stroke();
  }

  // --- Red circle at last tap point ---
  const t = status.debugTap;
  if (t) {
    ctxF.lineWidth = 2;
    ctxF.strokeStyle = 'rgba(255, 0, 0, 0.85)';
    ctxF.beginPath();
    ctxF.arc(t.x, t.y, r, 0, pi2);
    ctxF.stroke();

    // centre dot
    ctxF.fillStyle = 'rgba(255, 0, 0, 0.85)';
    ctxF.beginPath();
    ctxF.arc(t.x, t.y, 3, 0, pi2);
    ctxF.fill();
  }

  ctxF.restore();
}



