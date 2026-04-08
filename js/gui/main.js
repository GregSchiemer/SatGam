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
  renderStartConsort,
  renderReadyToPlay,
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


export function handleClockMsg(msg, status) {
  if (status.role !== 'consort') return;

  if (msg.type === 'config') {
    const mode = msg.mode || 'concert';

    status.netMode = mode;
    status.netSendTicks = (msg.sendTicks !== false);
    status.netCheckpointEveryBeats =
      Number(msg.checkpointEveryBeats ?? status.STATE_DUR ?? 24);

    status.msPerBeat = (mode === 'preview') ? PREVIEW_CLK : CONCERT_CLK;

    status.modeChosen = mode;
    status.lastConfirmedMode = mode;
    status.modeConfirmed = true;
    status.leaderModeConfirmed = true;

    // These drive the renderer’s Start View gating
    status.cuedToStart = true;
    status.running = false;
    status.isEndScreen = false;
    status.index = 0;
    status.view = 'start';

    console.log('[consort] CONFIG', {
      mode: status.netMode,
      modeChosen: status.modeChosen,
      modeConfirmed: status.modeConfirmed,
      leaderModeConfirmed: status.leaderModeConfirmed,
      cuedToStart: status.cuedToStart,
      msPerBeat: status.msPerBeat,
      view: status.view,
      index: status.index,
    });

    refresh();
    return;
  }

  if (msg.type === 'start') {
    status.netRunning = true;
    status.netTickCount = 0;

    const now = initialiseRunState(status);
    status.netLastTickMs = now;

    console.log('[consort] START before startAnimation()', {
      modeChosen: status.modeChosen,
      modeConfirmed: status.modeConfirmed,
      msPerBeat: status.msPerBeat,
      STATE_DUR: status.STATE_DUR,
      view: status.view,
      index: status.index,
      cuedToStart: status.cuedToStart,
      running: status.running,
      isEndScreen: status.isEndScreen,
      startWall: status.startWall,
      runStateDurationMs: status.runStateDurationMs,
    });

    refresh();
    startAnimation();
    return;
  }

  if (msg.type === 'tick') {
    if (!status.netRunning) return;

    status.netTickCount = msg.count ?? (status.netTickCount + 1);
    status.netLastTickMs = performance.now();
    return;
  }

  if (msg.type === 'stop') {
    status.netRunning = false;
    status.running = false;
    refresh();
    return;
  }

  if (msg.type === 'reset') {
    stopAnimation();

    status.netRunning = false;
    status.netTickCount = 0;
    status.netLastTickMs = null;

    status.running = false;
    status.isEndScreen = false;
    status.modeConfirmed = false;
    status.leaderModeConfirmed = false;
    status.cuedToStart = false;

    status.startWall = null;
    status.runStateDurationMs = null;

    status.index = 0;
    status.lastKeyIndex = null;

    status.modeChosen = msg.mode || status.lastConfirmedMode || status.modeChosen || 'concert';
    status.view = 'entry';

    if (status.modeChosen === 'preview') {
      status.msPerBeat = status.previewClock;
    } else {
      status.msPerBeat = status.concertClock;
    }

    console.log('[consort] RESET', {
      modeChosen: status.modeChosen,
      modeConfirmed: status.modeConfirmed,
      leaderModeConfirmed: status.leaderModeConfirmed,
      cuedToStart: status.cuedToStart,
      running: status.running,
      isEndScreen: status.isEndScreen,
      view: status.view,
      index: status.index,
    });

    refresh();
    return;
  }
}

/*
export function handleClockMsg(msg, status) {
  if (status.role !== 'consort') return;

  if (msg.type === 'config') {
    const mode = msg.mode || 'concert';

    status.netMode = mode;
    status.netSendTicks = (msg.sendTicks !== false);
    status.netCheckpointEveryBeats =
      Number(msg.checkpointEveryBeats ?? STATE_DUR);

    status.msPerBeat = (mode === 'preview') ? PREVIEW_CLK : CONCERT_CLK;

    status.modeChosen = mode;
    status.lastConfirmedMode = mode;
    status.modeConfirmed = true;
    status.leaderModeConfirmed = true;

    // These drive the renderer’s Start View gating
    status.cuedToStart = true;
    status.running = false;
    status.isEndScreen = false;
    status.index = 0;
    status.view = 'start';

    console.log('[consort] CONFIG', {
      mode: status.netMode,
      modeChosen: status.modeChosen,
      modeConfirmed: status.modeConfirmed,
      leaderModeConfirmed: status.leaderModeConfirmed,
      cuedToStart: status.cuedToStart,
      msPerBeat: status.msPerBeat,
      view: status.view,
      index: status.index,
    });

    refresh();   // <-- force immediate repaint to Start View
    return;
  }

if (msg.type === 'start') {
  status.netRunning = true;
  status.netTickCount = 0;

  const now = initialiseRunState(status);
  status.netLastTickMs = now;

  console.log('[consort] START before startAnimation()', {
    modeChosen: status.modeChosen,
    modeConfirmed: status.modeConfirmed,
    msPerBeat: status.msPerBeat,
    STATE_DUR: status.STATE_DUR,
    view: status.view,
    index: status.index,
    cuedToStart: status.cuedToStart,
    running: status.running,
    isEndScreen: status.isEndScreen,
    startWall: status.startWall,
    runStateDurationMs: status.runStateDurationMs,
  });

  refresh();
  startAnimation();
  return;
}


  if (msg.type === 'tick') {
    if (!status.netRunning) return;

    status.netTickCount = msg.count ?? (status.netTickCount + 1);
    status.netLastTickMs = performance.now();
    return;
  }

  if (msg.type === 'stop') {
    status.netRunning = false;
    status.running = false;
    refresh();
    return;
  }
}
*/


function initialiseRunState(status) {
  const now = performance.now();

  status.index = 0;
  status.cuedToStart = false;
  status.running = true;
  status.isEndScreen = false;
  status.view = 'running';

  // Start-of-run timing
//  status.startWall = now;
//  status.runStateDurationMs = status.STATE_DUR * status.msPerBeat;

  status.startWall = now;
  status.runStateDurationMs = (status.STATE_DUR ?? 24) * status.msPerBeat;
  status.nextStateWallMs = status.startWall + status.runStateDurationMs;

  return now;
}

function initStatus(ctx) {
  const roleAtLaunch = window.location.pathname.includes('leader')
    ? 'leader'
    : 'consort';

  const marker = Math.random().toString(16).slice(2);

  console.log('[main] role =', roleAtLaunch);

  return {
    // =========================
    // Identity / fixed facts
    // =========================
    statusId: marker,
    role: roleAtLaunch,              // 'leader' | 'consort'
    roleConfirmed: true,             // role is known at launch; kept only as a legacy field

    // =========================
    // Leader mode workflow
    // =========================
    modeChosen: 'concert',           // current selected mode
    lastConfirmedMode: 'concert',    // last mode confirmed by leader
    modeConfirmed: false,            // leader only: Entry View has been confirmed
    confirmPending: false,           // leader confirm in progress
	leaderModeConfirmed: false,
	
    // =========================
    // Consort / NetBus workflow
    // =========================
    clockBus: null,
    cuedToStart: false,              // consort only: got CONFIG, waiting for START
    netMode: 'concert',
    netRunning: false,
    netTickCount: 0,
    netLastTickMs: null,
    netSendTicks: true,
    netCheckpointEveryBeats: STATE_DUR,

    // =========================
    // Shared performance state
    // =========================
    running: false,                  // true only in Running View
    isEndScreen: false,              // true only in End View
    index: 0,                        // current MLS state index
    fullHenge: FULL_HENGE,           // static full-henge preset index
    lastKeyIndex: null,              // most recent tapped key number
    tapsThisState: 0,
    tapLimit: 5,
    hengeLocked: false,
    showHenge: true,

    // =========================
    // Timing
    // =========================
    concertClock: CONCERT_CLK,
    previewClock: PREVIEW_CLK,
    msPerBeat: CONCERT_CLK,          // default mode timing
    STATE_DUR: STATE_DUR,            // kept as a convenience mirror of the global
    startWall: null,                 // performance.now() at run start
    runStateDurationMs: null,        // duration of one rendered state block
    nextStateWallMs: null,           // next state boundary for local timing

    // =========================
    // Audio
    // =========================
    audioReady: false,
    audioStage: 'idle',              // 'idle' | 'loading' | 'prepared' | 'failed'
    csoundPrimed: false,
    testToneEnabled: false,			 // debug only
    debugKeys: false,				 // debug only

    // =========================
    // Rendering / view state
    // =========================
    _view: null,                     // 'entry' | 'start' | 'run' | 'end'
    textColor: 'white',

    bgFamily: ColorFamily.NONE,
    bgFamilyTarget: ColorFamily.NONE,
    bgFade: null,
    _bgFade: null,

    lightsDownDone: false,
    lightsUpDone: false,
    endFadeStarted: false,
    stopAfterFade: false,
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
