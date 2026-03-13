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
  chooseTextColorForBackground
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
  henge25, 
  makeHenge, 
  arcRadiusForHotspotTouch  
} from './henge.js';

import { 
  sequence 
} from './sequence.js';

//import {
//  enableCsound
//} from './initCsound.js';

import { 
  makeAudioEngine 
} from "./audioEngine.js";

import { 
  installUIHandlers 
} from './uiControls.js';

import {
  FamilyIndex,
  ColorFamily
} from './color.js';

import { frameRender } from './renderer.js';

import { 
  MAX_STATES, 
  STATE_DUR, 
  MAX_DUR, 
  CONCERT_CLK, 
  PREVIEW_CLK,
  FULL_HENGE
} from './globals.js';

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

  // Keep your existing variable names if you want
  const cnv = cnvP;
  const ctx = ctxP;

  // 2) status uses pane geometry
  const status = initStatus(ctx);
  
  // 3) slots uses pane geometry

  const { slots, ctxS } = makeHenge(ctx, henge25);

  ctx.keyRadius = ctxS.keyRadius;

  setSlots(slots);

  console.log('[main] ctxS entries:', Object.entries(ctxS));		

  // 4) build slot atlas
  await ensurePhoneAtlasForSlots(slots);

  // 5) re-initialise geometry when user rotates phone
  installResizeHandler(ctxB, status);

  // 6) initialise audio engine
  const audio = makeAudioEngine();
  
  // 7) attach UI to visible pane canvas
  installUIHandlers(ctxP, cnvP, status, audio);

  // 8) initialise Mode Select View
  prepareAndRenderBackground(ctxB, status);

  // 9) render arrB/arrS/arrT to composite layer arrP
  setRender(() => {
    frameRender(status); 
  });

  // 10) initial paint
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
    role: 				roleAtLaunch,		// 'leader' or 'consort'

// Animation state
    running:    		false,    			// true in Running View
    index: 				0,					// increments in Running View
    isEndScreen:		false,    			// true in End View
    concertClock:		CONCERT_CLK, 		// 1000 ms/beat		
    previewClock:		PREVIEW_CLK, 		// 42.8 ms/beat
    msPerBeat:     		CONCERT_CLK,		// default : concert
    fullHenge: 	   		FULL_HENGE,			// pre-start state index (18)

	STATE_DUR: 			STATE_DUR,			// clock ticks per state
	startWall:			null,				// performance.now()
	runStateDurationMs: null,				// current duration
	audioReady:			false,
	testToneEnabled: 	false,
	debugKeys:			false,

// Mode state
    modeChosen:    		'concert', 			// 'concert' or 'preview'

// Role state
    roleConfirmed: 		(roleAtLaunch === 'consort'),	// 'leader' or 'consort'

// Animation/Stage lighting
	_view: null,              				// tracks current 1 of 4 views
	endFadeStarted: 	false,
	stopAfterFade:  	false,
    bgFamily:			ColorFamily.NONE,	// none selected
	bgFamilyTarget: 	ColorFamily.NONE,
	textColor: 			'white',

	lightsDownDone: 	false,    	// start-view fade fired?
	lightsUpDone:   	false,   	// end-view fade fired?
	stopAfterFade:  	false,  	// stop RAF when fade finishes
  };
}

function installResizeHandler(ctxB, status) {
  // debounce state (kept inside the handler closure)
  let tId = null;

  window.addEventListener(
    'resize',
    () => {
      // collapse bursts of resize events into one refresh
      if (tId) clearTimeout(tId);

      tId = setTimeout(() => {
        tId = null;
        prepareAndRenderBackground(ctxB, status);

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
