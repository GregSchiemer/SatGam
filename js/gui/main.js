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
  FamilyIndex,
  ColorFamily
} from './color.js';

import { 
  MAX_STATES, 
  STATE_DUR, 
  MAX_DUR, 
  CONCERT_CLK, 
  PREVIEW_CLK,
  FULL_HENGE
} from './globals.js'; 

import { frameRender } from './renderer.js';

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
	endFadeStarted: false,
	stopAfterFade:  false,

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
