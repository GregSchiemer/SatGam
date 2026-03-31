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
  startAnimation,
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

import { makeClockBus } from './clockBus.js';

let _lastPhonesKey = null;
console.log('[main] page loaded', window.location.pathname);
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
  
  initBus(status);
  console.log('[main] role =', status.role);

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

function initBus(status) {
  console.log('[bus init]', {
    statusId: status.statusId,
    role: status.role,
    path: location.pathname
  });

//  console.log('[bus init]', { role: status.role, statusId: status.statusId });  

  if (status.clockBus) {
    console.warn('[bus guard @main] existing clockBus reused', {
      statusId: status.statusId,
      busId: status.clockBus?.busId,
      socketId: status.clockBus?.socketId,
      role: status.role
    });
    return status.clockBus;
  }

  const q = new URLSearchParams(window.location.search).get('wsPort');
  const wsPort = q && /^\d+$/.test(q) ? Number(q) : undefined;

  status.clockBus = makeClockBus({
    role: status.role,
    wsPort: wsPort,
    statusId: status.statusId,
    onMsg: (msg) => handleClockMsg(msg, status),
  });

  console.log('[bus made]', {
    statusId: status.statusId,
    busId: status.clockBus?.busId,
    socketId: status.clockBus?.socketId,
    role: status.role
  });

  return status.clockBus;
}

export function leaderStartClock(status) {
  if (status.role !== 'leader') return;
  if (!status.clockBus) return;
  if (status.netRunning) return;

  const mode = status.modeChosen || status.lastConfirmedMode || 'concert';

  // Set to false only if you want start/stop without checkpoint ticks.
  const sendTicks = true;

  status.netRunning = true;
  status.netTickCount = 0;
  status.netLastTickMs = null;

  status.clockBus.send({
    type: 'config',
    mode,
    sendTicks,
    checkpointEveryBeats: STATE_DUR,
  });

  status.clockBus.send({ type: 'start' });

  status.clockBus.startTicking(() => status.msPerBeat, {
    sendTicks,
    checkpointEveryBeats: STATE_DUR,
  });

  console.log('[leader] bus start', {
    mode,
    msPerBeat: status.msPerBeat,
    sendTicks,
    checkpointEveryBeats: STATE_DUR,
  });
}

export function leaderStopClock(status) {
  if (status.role !== 'leader') return;
  if (!status.clockBus) return;

  status.netRunning = false;
  status.clockBus.stopTicking();
  status.clockBus.send({ type: 'stop' });

  console.log('[leader] bus stop', {
    tickCount: status.clockBus?.tickCount ?? 0,
  });
}

function resetConsortTapState(status) {
  status.tapsThisState = 0;
  status.hengeLocked = false;
}

function handleClockMsg(msg, status) {
  if (status.role !== 'consort') return;

  if (msg.type === 'config') {
    status.netMode = msg.mode || 'concert';
    status.netSendTicks = msg.sendTicks !== false;
    status.netCheckpointEveryBeats =
      Number(msg.checkpointEveryBeats ?? STATE_DUR);

    status.msPerBeat =
      status.netMode === 'preview' ? PREVIEW_CLK : CONCERT_CLK;

    console.log('[consort] CONFIG', {
      mode: status.netMode,
      sendTicks: status.netSendTicks,
      checkpointEveryBeats: status.netCheckpointEveryBeats,
      msPerBeat: status.msPerBeat,
    });
    return;
  }

  if (msg.type === 'start') {
    status.netRunning = true;
    status.netTickCount = 0;
    status.netLastTickMs = Date.now();

    status.modeChosen = status.netMode || 'concert';
    status.lastConfirmedMode = status.modeChosen;
    status.modeConfirmed = true;

    status.running = true;
    status.isEndScreen = false;
    status.index = 0;

    status.startWall = performance.now();
    status.runStateDurationMs = MAX_STATES * STATE_DUR * status.msPerBeat;

    // State 1 begins here.
    resetConsortTapState(status);

    console.log('[consort] START', {
      mode: status.modeChosen,
      msPerBeat: status.msPerBeat,
      runStateDurationMs: status.runStateDurationMs,
      tapsThisState: status.tapsThisState,
      hengeLocked: status.hengeLocked,
    });

    startAnimation();
    refresh();
    return;
  }

  if (msg.type === 'tick') {
    status.netTickCount = (status.netTickCount ?? 0) + 1;
    status.netLastTickMs = Date.now();

    const prevIndex = status.index;

    // START enters State 1 (index 0).
    // First sparse checkpoint moves to State 2 (index 1).
    status.index = Math.min(status.netTickCount, MAX_STATES - 1);

    if (status.index !== prevIndex) {
      resetConsortTapState(status);
    }

    console.log('[consort] TICK', {
      tickCount: status.netTickCount,
      prevIndex,
      index: status.index,
      maxStates: MAX_STATES,
      tapsThisState: status.tapsThisState,
      hengeLocked: status.hengeLocked,
    });

    refresh();
    return;
  }

  if (msg.type === 'stop') {
    status.netRunning = false;

    const expectedTicks =
      status.netSendTicks === false ? 0 : (MAX_STATES - 1);

    console.log('[consort] STOP', {
      receivedTicks: status.netTickCount ?? 0,
      expectedTicks,
      discrepancy: (status.netTickCount ?? 0) - expectedTicks,
    });

    status.running = false;
    refresh();
  }
}
/*
function handleClockMsg(msg, status) {
  if (status.role !== 'consort') return;

  if (msg.type === 'config') {
    status.netMode = msg.mode || 'concert';
    status.netSendTicks = msg.sendTicks !== false;
    status.netCheckpointEveryBeats =
      Number(msg.checkpointEveryBeats ?? STATE_DUR);

    status.msPerBeat =
      status.netMode === 'preview' ? PREVIEW_CLK : CONCERT_CLK;

    console.log('[consort] CONFIG', {
      mode: status.netMode,
      sendTicks: status.netSendTicks,
      checkpointEveryBeats: status.netCheckpointEveryBeats,
      msPerBeat: status.msPerBeat,
    });
    return;
  }

  if (msg.type === 'start') {
    status.netRunning = true;
    status.netTickCount = 0;
    status.netLastTickMs = Date.now();

    status.modeChosen = status.netMode || 'concert';
    status.lastConfirmedMode = status.modeChosen;
    status.modeConfirmed = true;

    status.running = true;
    status.isEndScreen = false;
    status.index = 0;

    status.startWall = performance.now();
    status.runStateDurationMs = MAX_STATES * STATE_DUR * status.msPerBeat;

    console.log('[consort] START', {
      mode: status.modeChosen,
      msPerBeat: status.msPerBeat,
      runStateDurationMs: status.runStateDurationMs,
    });

    // Start the same local animation loop used by leader clock-tap.
//    startAnimation(status);
    startAnimation();

    refresh?.();
    return;
  }

  if (msg.type === 'tick') {
    status.netTickCount = (status.netTickCount ?? 0) + 1;
    status.netLastTickMs = Date.now();

    // State 1 is entered on START (index 0).
    // First sparse checkpoint should correspond to State 2 (index 1).
    status.index = Math.min(status.netTickCount, MAX_STATES - 1);

    console.log('[consort] TICK', {
      tickCount: status.netTickCount,
      index: status.index,
      maxStates: MAX_STATES,
    });

    refresh?.();
    return;
  }

  if (msg.type === 'stop') {
    status.netRunning = false;

    const expectedTicks =
      status.netSendTicks === false ? 0 : (MAX_STATES - 1);

    console.log('[consort] STOP', {
      receivedTicks: status.netTickCount ?? 0,
      expectedTicks,
      discrepancy: (status.netTickCount ?? 0) - expectedTicks,
    });

    status.running = false;
    refresh?.();
  }
}
*/

// Create the initial status object: all process/runtime flags live here.
function initStatus(ctx) {
  const roleAtLaunch = window.location.pathname.includes('leader')
    ? 'leader'
    : 'consort';

  const statusId = Math.random().toString(16).slice(2);

  console.log('[main] role =', roleAtLaunch);

  return {
  statusId,

// Role
    role: 				roleAtLaunch,		// 'leader' or 'consort'

// Animation state
	clockBus: 			null,
	netRunning: 		false,				// instead of _clockRunning
	netTickCount: 		0,					// instead of tickCount
	netLastTickMs: 		null,				// instead of lastTickMs

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

	tapsThisState: 		0,     	// tap counter
	tapLimit: 			3,
	hengeLocked: 		false,
	showHenge: 			true,    // required for gate rendering

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


/*
function handleClockMsg(msg, status) {
  if (status.role !== 'consort') return;

  if (msg.type === 'config') {
    status.netMode = msg.mode || 'concert';
    status.netSendTicks = msg.sendTicks !== false;
    status.netCheckpointEveryBeats =
      Number(msg.checkpointEveryBeats ?? STATE_DUR);

    status.msPerBeat =
      status.netMode === 'preview' ? PREVIEW_CLK : CONCERT_CLK;

    console.log('[consort] CONFIG', {
      mode: status.netMode,
      sendTicks: status.netSendTicks,
      checkpointEveryBeats: status.netCheckpointEveryBeats,
      msPerBeat: status.msPerBeat,
    });
    return;
  }

  if (msg.type === 'start') {
    status.netRunning = true;
    status.netTickCount = 0;
    status.netLastTickMs = Date.now();

    status.modeChosen = status.netMode || 'concert';
    status.lastConfirmedMode = status.modeChosen;
    status.modeConfirmed = true;

    status.running = true;
    status.isEndScreen = false;
    status.index = 0;

    status.startWall = performance.now();
    status.runStateDurationMs = MAX_STATES * STATE_DUR * status.msPerBeat;

    console.log('[consort] START', {
      mode: status.modeChosen,
      msPerBeat: status.msPerBeat,
      runStateDurationMs: status.runStateDurationMs,
    });

    refresh?.();
    return;
  }

  if (msg.type === 'tick') {
    status.netTickCount = (status.netTickCount ?? 0) + 1;
    status.netLastTickMs = Date.now();

    console.log('[consort] TICK', {
      tickCount: status.netTickCount,
      maxStates: MAX_STATES,
    });

    return;
  }

  if (msg.type === 'stop') {
    status.netRunning = false;

    const expectedTicks =
      status.netSendTicks === false ? 0 : MAX_STATES;

    console.log('[consort] STOP', {
      receivedTicks: status.netTickCount ?? 0,
      expectedTicks,
      discrepancy: (status.netTickCount ?? 0) - expectedTicks,
    });

    status.running = false;
    refresh?.();
  }
}
*/