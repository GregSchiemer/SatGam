// js/gui/main.js

import {
  initCanvases,
  renderSavedBackground,
  prepareAndRenderBackground,
  selectAndRenderBackground,
  getSlots,
  setSlots,
  radializeSlots,
  composeFrame,
  ensureBgFadeBuffers,
  beginBackgroundCrossfade,
  blendBgCanvasesInto,  
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
  renderDebug,
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
  drawPhoneAt,
  familyForIndex,
} from './sprites.js';

import { 
  clockify, 
  set2Pi,
  easeInOutQuad01, 
} from './helpers.js';

import { 
  makeHenge25, 
  makeHenge, 
  arcRadiusForHotspotTouch  
} from './henge.js';

import { 
  sequence 
} from './sequence.js';

import { 
  installUIHandlers 
} from './uiControls.js';

import {
  FamilyIndex 
} from './color.js';

export function startSequenceSanityRun(status) {
  const ctxB = arrB[0].ctx;
  const ctxS = arrS[0].ctx;
  const ctxT = arrT[0].ctx;

  // Neutral background once
  prepareAndRenderBackground(ctxB);

  const durMs = STATE_DUR * status.msPerBeat; // e.g. 24 * 1000 = 24000
  const N = sequence.length;                  // should be 31

  // --- isolate from normal runtime renderer ---
  // Stop any prior sanity timer
  if (status._sanityTimer) {
    clearInterval(status._sanityTimer);
    status._sanityTimer = null;
  }

  // Prevent the normal frameRender from running while sanity is active
  // (refresh() can be called by other UI handlers; we don't want it to overwrite debug)
  if (!status._sanityPrevRender) {
    status._sanityPrevRender = true; // marker; we always restore to frameRender(status) at end
  }
  setRender(() => {}); // no-op renderer during sanity

  // Sanity mode state (do NOT set status.running = true)
  status.sanity = true;
  status.isEndScreen = false;
  status.index = 0;

//  const DRAW_PHONES = false; // keep false until the 31 indices/patterns look right
  const DRAW_PHONES = true;
  
  // helper: draw one sanity frame i -> screen
  function drawSanityFrame(i) {
    status.index = i;

    ctxT.clearRect(0, 0, ctxT.w, ctxT.h);
    ctxS.clearRect(0, 0, ctxS.w, ctxS.h);

    const totalSec = i * STATE_DUR;
    const mins = Math.floor(totalSec / 60);
    const secs = String(totalSec % 60).padStart(2, '0');

    const bits = sequence[i];
    const bitPattern = bits ? bits.join('\t') : '(missing)';

    renderDebug(ctxT, { status, mins, secs, bitPattern });

    // Only enable once you want to test phone activation mapping
    if (DRAW_PHONES) {
      // IMPORTANT: only works if syncPhonesToSpritesLayer is in scope/imported
      syncPhonesToSpritesLayer(i);
    }

    composeFrame({ drawB: true, drawS: true, drawT: true });
  }

  // First frame immediately (no refresh)
  drawSanityFrame(0);

  // Drive the debug display at 1Hz, while state changes happen at STATE_DUR-second boundaries.
  status.sanityStartMs = performance.now();
  let lastIdx = -1;

  status._sanityTimer = setInterval(() => {
    const nowMs = performance.now();
	const elapsedSec = Math.floor((nowMs - status.sanityStartMs) / status.msPerBeat); 	// PREVIEW  
//    const elapsedSec = Math.floor((nowMs - status.sanityStartMs) / 1000);				// CONCERT

    // Total run is 31 states × 24 seconds = 744 seconds (12:24)
    const totalSec = MAX_STATES * STATE_DUR; // 31*24 = 744
    if (elapsedSec >= totalSec) {
      clearInterval(status._sanityTimer);
      status._sanityTimer = null;

      // Show end view
      status.sanity = false;
      status.isEndScreen = true;

      ctxT.clearRect(0, 0, ctxT.w, ctxT.h);
      ctxS.clearRect(0, 0, ctxS.w, ctxS.h);
      renderEnd(ctxT, status);
      composeFrame({ drawB: true, drawS: true, drawT: true });

      // Restore normal renderer
      setRender(() => {
        frameRender(status);
      });

      return;
    }

    // Which state are we in?
    const idx = Math.floor(elapsedSec / STATE_DUR); // 0..30
    status.index = Math.min(idx, MAX_STATES - 1);

    // Derive clock text
    const mins = Math.floor(elapsedSec / 60);
    const secs = String(elapsedSec % 60).padStart(2, '0');

    const bits = sequence[status.index];
    const bitPattern = bits ? bits.join('\t') : '(missing)';

    // Clear + draw debug every second
    ctxT.clearRect(0, 0, ctxT.w, ctxT.h);
    renderDebug(ctxT, { status, mins, secs, bitPattern });

    // Only redraw sprites when the state index changes
    if (DRAW_PHONES && status.index !== lastIdx) {
//      ctxS.clearRect(0, 0, ctxS.w, ctxS.h);
      syncPhonesToSpritesLayer(status.index);
      lastIdx = status.index;
    }

	// Only redraw sprites when the state index changes
//	if (DRAW_PHONES && status.index !== lastIdx) {
//	  syncPhonesToSpritesLayer(status.index);   // this clears + draws into arrS[0].ctx
//	  lastIdx = status.index;
//	}

    composeFrame({ drawB: true, drawS: true, drawT: true });
	}, status.msPerBeat);	// PREVIEW  
//  }, 1000);				// CONCERT

}


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
  const cnvP = document.getElementById('mobile');
  const designW    = parseInt(cnvP.dataset.designW, 10);
  const designH	   = parseInt(cnvP.dataset.designH, 10);

  const { ctxP, ctxB, ctxF, ctxT } = initCanvases({
    designW,
    designH,
  });

//console.log('[pairing check @main]', {
//  pane: ctxP.canvas === cnvP,
//  bg:   ctxB.canvas === arrB[0].canvas,
//  fg:   ctxF.canvas === arrF[0].canvas,
//  text: ctxT.canvas === arrT[0].canvas,
//  paneSize: [cnvP.width, cnvP.height],
//  bgSize:   [arrB[0].canvas.width, arrB[0].canvas.height],
//  fgSize:   [arrF[0].canvas.width, arrF[0].canvas.height],
//  textSize: [arrT[0].canvas.width, arrT[0].canvas.height],
//});

  // Keep your existing variable names if you want
  const cnv = cnvP;
  const ctx = ctxP;

  // 2) status uses pane geometry
  const status = initStatus(ctx);
// main.js (inside initApp, right after initStatus)
//
// Make STATE_DUR available to UI handlers (clock start)
  status.STATE_DUR = STATE_DUR;

// Ensure clean start values
  status.startWall = null;
  status.runStateDurationMs = null;

  status.debugKeys = false;
  
  // 3) draw background layer offscreen 
  prepareAndRenderBackground(ctxB);

  // 4) slots uses pane geometry

	const N = 25;
	const phoneW = 30; //40;
	const phoneH = 56; //70;
	const keyRadius = 18; // can be whatever; it doesn't affect foot-touch
	
	const arcRadius = (phoneW / (2 * Math.tan(Math.PI / N))); // feet-touch

//	const { slots } = makeHenge(ctx, {
	
	const { slots, ctxS } = makeHenge(ctx, {
	  N,
	  arcRadiusMode: 'feet',
	  phoneW,
	  phoneH,
	  arcRadius,
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
  installUIHandlers(ctxP, cnvP, status);

  // 8) render arrB/arrS/arrT to composite layer arrP
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
function initStatus(ctx) {
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
// - End screen: render empty henge (inactive phones).
// - Mode-select leader view: NO phones.
// - Running: render current animated frame.
// - Start view: render full henge (active phones).
function renderPhonesLayer(ctxS, status) {
  // Ensure phones layer is blank unless we explicitly draw phones below.
  ctxS.clearRect(0, 0, ctxS.w, ctxS.h);

  // 1) Leader mode select: text-only
  if (status.role === 'leader' && !status.modeConfirmed) return;

  // 2) End screen: intentionally no phones
  if (status.isEndScreen) return;

  // 3) Otherwise draw phones
  const idx = status.running ? status.index : status.fullHenge;
  syncPhonesToSpritesLayer(idx);
}

function frameRender(status) {
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

// Paint one MLS state into the SPRITES layer (ctxS), using sequence[stateIndex].
export function syncPhonesToSpritesLayer(stateIndex) {
  const slots = getSlots();
  if (!slots?.length) return;

  const ctxS = arrS[0].ctx;      // destination: sprites layer

  // Defensive default: if sequence[stateIndex] missing, treat all families active
  const bits = sequence?.[stateIndex] ?? [1, 1, 1, 1, 1];

  // Clear sprites layer first
  ctxS.clearRect(0, 0, ctxS.w, ctxS.h);

  for (let i = 0; i < slots.length; i++) {
    const slot   = slots[i];
    const family = familyForIndex(i);          // 0..4 (expected)
    const bitPos = FamilyIndex[family];
  	if (!Number.isInteger(bitPos)) {
      throw new Error(`FamilyIndex missing for family=${family} (index i=${i})`);
  	}
	const active = (bits[bitPos] !== 0);
	const radialOrientation = Math.PI / 2;

    const theta = slot.theta ?? slot.angle ?? 0;
    const angle = theta + radialOrientation;//(ctxS.orientBias ?? Math.PI / 2);

    drawPhoneAt(ctxS, { ...slot, angle, family, active, shadow: true });
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



