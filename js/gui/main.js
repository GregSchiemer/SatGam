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
  makeAudioEngine 
} from "./audioEngine.js";

import { 
  installUIHandlers 
} from './uiControls.js';

import {
  FamilyIndex,
  ColorFamily,
  COLOR_MAP
} from './color.js';

import { 
  sequence 
} from './sequence.js';

import { createGraphicScore } from './graphicScore.js';

import { frameRender } from './renderer.js';

//import { sendClientStatus } from './clientStatus.js';

import { 
  MAX_STATES, 
  STATE_DUR, 
  MAX_DUR, 
  CONCERT_CLK, 
  PREVIEW_CLK,
  FULL_HENGE
} from './globals.js';

import { makeClockBus } from './clockBus.js';

import { installPhoneDiag, setPhoneDiag } from './phoneDiag.js';

let _lastPhonesKey = null;
console.log('[main] page loaded', window.location.pathname);


function deriveResponsiveGeometry(canvas) {
  if (!canvas) {
    throw new Error(
      'deriveResponsiveGeometry: canvas is required'
    );
  }

  const referenceDesignW = parseInt(
    canvas.dataset.designW,
    10
  );

  const referenceDesignH = parseInt(
    canvas.dataset.designH,
    10
  );

  if (
    !Number.isFinite(referenceDesignW) ||
    !Number.isFinite(referenceDesignH) ||
    referenceDesignW <= 0 ||
    referenceDesignH <= 0
  ) {
    throw new Error(
      `deriveResponsiveGeometry: invalid reference design dimensions: ` +
      `designW=${canvas.dataset.designW}, ` +
      `designH=${canvas.dataset.designH}`
    );
  }

  const viewportW =
    window.visualViewport?.width ??
    window.innerWidth;

  const viewportH =
    window.visualViewport?.height ??
    window.innerHeight;

  if (
    !Number.isFinite(viewportW) ||
    !Number.isFinite(viewportH) ||
    viewportW <= 0 ||
    viewportH <= 0
  ) {
    throw new Error(
      `deriveResponsiveGeometry: invalid viewport dimensions: ` +
      `${viewportW} × ${viewportH}`
    );
  }

  // Preserve the reference logical width and derive a logical height
  // whose aspect ratio matches the current viewport.
  const designW = referenceDesignW;

  const designH = Math.round(
    designW * (viewportH / viewportW)
  );

  const geometry = {
    referenceDesignW,
    referenceDesignH,
    viewportW,
    viewportH,
    designW,
    designH,
  };

  console.log('[responsive geometry]', {
    referenceDesign: [
      referenceDesignW,
      referenceDesignH,
    ],

    viewport: [
      viewportW,
      viewportH,
    ],

    derivedDesign: [
      designW,
      designH,
    ],

    inner: [
      window.innerWidth,
      window.innerHeight,
    ],

    visual: window.visualViewport
      ? [
          window.visualViewport.width,
          window.visualViewport.height,
        ]
      : null,

    visualOffset: window.visualViewport
      ? [
          window.visualViewport.offsetLeft,
          window.visualViewport.offsetTop,
        ]
      : null,

    visualScale:
      window.visualViewport?.scale ?? null,

    dpr:
      window.devicePixelRatio || 1,

    referenceDesignAspect:
      referenceDesignW / referenceDesignH,

    viewportAspect:
      viewportW / viewportH,

    derivedDesignAspect:
      designW / designH,
  });

  return geometry;
}

// ---------------------------------------------------------------------------
//  App entry point
// ---------------------------------------------------------------------------

export async function initApp() {
  console.log('✅ GUI initialised');

  // 1) Determine and report responsive geometry
  const cnvP = document.getElementById('mobile');

  if (!cnvP) {
    throw new Error(
      'initApp: no <canvas id="mobile"> found in DOM'
    );
  }

  const {
    designW,
    designH,
  } = deriveResponsiveGeometry(cnvP);

  // 2) Create visible and off-screen canvas surfaces
  const { ctxP, ctxB, ctxF, ctxT } = initCanvases({
    designW,
    designH,
    mode: 'fit',
  });

  // Preserve the existing short variable names
  const cnv = cnvP;
  const ctx = ctxP;

  // 3) Create the pre-rendered graphic score
  const graphicScore = createGraphicScore({
    sequence,
    colorMap: COLOR_MAP,
    dpr: ctxP.dpr,
  });

  // 4) Create application status from the pane geometry
  const status = initStatus(ctx);

  installPhoneDiag(status);
  setPhoneDiag({ phase: 'status-created' });

  // 5) Initialise the network/clock bus
  initBus(status);
  setPhoneDiag({ phase: 'bus-init-called' });

  // sendClientStatus(status, 'bus-init-called');
  console.log('[main] role =', status.role);

  // 6) Create Phonehenge slots using pane geometry
  const { slots, ctxS } = makeHenge(ctx, henge25);

  ctx.keyRadius = ctxS.keyRadius;
  setSlots(slots);

  console.log('[main] ctxS entries:', Object.entries(ctxS));

  // 7) Build the phone-sprite atlas
  await ensurePhoneAtlasForSlots(slots);

  // 8) Reinitialise geometry when the phone rotates
  installResizeHandler(ctxB, status);

  // 9) Initialise the audio engine
  const audio = makeAudioEngine();

  // 10) Attach UI handlers to the visible pane canvas
  installUIHandlers(ctxP, cnvP, status, audio);

  // 11) Initialise the Mode Select view
  prepareAndRenderBackground(ctxB, status);

  // 12) Render arrB/arrS/arrT to composite layer arrP
  setRender(() => {
    frameRender(status);
  });

  // 13) Perform the initial paint
  refresh();

  setPhoneDiag({ phase: 'rendered' });

  // sendClientStatus(status, 'page-loaded');
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
    
    // Concert-safe repeat-run fix:
    // A reset after End View must force consort phones to reacquire
    // their local wake/audio gesture before the next run.
    if (status.role === 'consort') {
      console.log('[consort] reset: clearing consortWakeArmed');
      status.consortWakeArmed = false;
    }    
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
    consortWakeArmed: false,		 // auto lock time

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
