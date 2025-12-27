

// js/gui/main.js



import {
  initCanvas,
  renderSavedBackground,
  prepareAndRenderBackground,
  getSlots,
  setSlots,
} from './canvasUtils.js';

import {
  renderStartLeader,
  renderStartBoth,
  renderRunning,
  renderEnd,
} from './text.js';

import {
  setRender,
  stepOnce,
  setRole,
  getRole,
//  setMode,
  getMode,
} from './runTime.js';

import { 
  startAnimation, 
  stopAnimation,
  setOnEndCallback,
} from './animation.js';

import {
  ensurePhoneAtlasForSlots,
  drawPhoneAt,
  familyForIndex,
} from './sprites.js';

import { clockify } from './helpers.js'
import { makeHengeOf } from './henge.js';
import { runStateModeFromQuery, radializeSlots } from './stateMode.js';
import { sequence } from './sequence.js';
import { installUIHandlers } from './uiControls.js';


/*
//
// Constants for the MLS animation
//

const TOTAL_STATES = sequence.length; // 31
//const BEATS_PER_STATE = 24;          // 24 beats per state

const NUM_STATES = sequence.length;           // 31
const BEATS_PER_STATE = 24;                  // you can import if you already export it
const MS_PER_BEAT_CONCERT = 1000;            // 1s/beat in concert

const TOTAL_CONCERT_MS =
  NUM_STATES * BEATS_PER_STATE * MS_PER_BEAT_CONCERT; // 31*24*1000 = 744000

// Keep references so showEndScreen() can work from animation.js
//let lastCtx = null;
//let lastCanvas = null;
//let lastStatus = null;

//let isEndScreen = false;

// Helpers
//Where is it meant to live 
export async function initApp() {
//  console.log('✅ GUI initialised');

  // 1) Canvas / ctx
  const { ctx, canvas } = initCanvas('mobile');

  // Make sure this is early in initApp:
//  installEndScreenTapHandler({ canvas, ctx });

  // 2) Detect role and tell runtime
  const roleAtLaunch = window.location.pathname.includes('leader') ? 'leader' : 'consort';
  console.log('[main] roleAtLaunch =', roleAtLaunch);
//  setRole(role);

  // 3) Show status object
    const status = {
    running:       false,               // false → not playing yet
    startWall:     0,                   // performance.now() when the show starts
    msPerBeat:     ctx.concertClock,	// default tempo
    PRE_INDEX:     18,                  // pre-start state index
    modeChosen:    'concert',     		// concert-ready at launch
    modeConfirmed: false, 				// consort skips mode-select
    role: 		   roleAtLaunch,                               // 'leader' or 'consort'
    isEndScreen:   false,                // <— moved from global isEndScreen
  };


  // 4) Background (neutral family index = 0)
  const f = 0;
  prepareAndRenderBackground(f);

  // 5) STATE MODE: e.g. ?state=K
  //    If this returns true, stateMode.js has installed its own renderer and drawn once.
  if (await runStateModeFromQuery(ctx)) {
    return;
  }

  // 6) Normal henge path

  // Read n from ?n=5|10|15|20|25; default 25
//  const params = new URLSearchParams(window.location.search);
//  const rawN = Number(params.get('n'));
//  const allowedN = [5, 10, 15, 20, 25];
//  const n = allowedN.includes(rawN) ? rawN : 25;

  // Build + store slots
  const slots = makeHengeOf(ctx, 25);
  setSlots(slots);                   		// ← this replaces initHenge’s side-effect
  await ensurePhoneAtlasForSlots(slots);	// Build/resize atlas to match these slots

  // 7) Keep background + henge correct on resize
  window.addEventListener('resize', () => {
    prepareAndRenderBackground(f);
    stepOnce();
  });

  // 8) Interactions
  installUIHandlers(ctx, canvas, status);

  // 9) Renderer: decides what to draw based on role + status + time

setRender(() => {
  // 1) Always redraw neutral background
  prepareAndRenderBackground(ctx);

//  const currentRole = getRole();

  // 2) LEADER: MODE-SELECT PHASE (no henge)
  if (status.role === 'leader' && !status.modeConfirmed) {
        status.msPerBeat = ctx.previewClock; // ? 'preview' : 'concert';
//    const mode =
//      status.msPerBeat === ctx.previewClock ? 'preview' : 'concert';

//    renderStartLeader(ctx, {
//      mode,
//      msPerBeat: status.msPerBeat,
//      modeChosen: status.modeChosen,
//    });
    renderStartLeader(ctx, status);

    return;
  }

  // 3) From here: START / RUNNING / END views for both leader & consort.

  const baseSlots = getSlots();
  if (!baseSlots?.length) return;

  const arr = radializeSlots(ctx, baseSlots);

  let stateIndex = status.PRE_INDEX;
  let elapsedMs = 0;
  let ended = false;

  if (status.running) {
    const now = performance.now();
    elapsedMs = now - status.startWall;

    const stateDurationMs = BEATS_PER_STATE * status.msPerBeat;
    const idx = Math.floor(elapsedMs / stateDurationMs);

    if (idx >= NUM_STATES) {
      // We’ve reached the end of the MLS sequence.
      stateIndex = NUM_STATES - 1;  // 30
      status.running = false;
      ended = true;
    } else {
      stateIndex = idx;
    }
  }

  // Guard against out-of-range just in case
  if (stateIndex < 0) stateIndex = 0;
  if (stateIndex >= NUM_STATES) stateIndex = NUM_STATES - 1;

  // 4) Draw phones for this state
  const bits = sequence[stateIndex]; // [5] array: ON/OFF per family

  for (let i = 0; i < arr.length; i++) {
    const slot = arr[i];
    const family = familyForIndex(i);
    const famIndex = i % 5;          // 0..4
    const active = !!bits[famIndex]; // ON if that family is 1 in this state

    drawPhoneAt(ctx, { ...slot, family, active, shadow: true });
  }

  // 5) If we just ended, show the END view and stop animation.
  if (ended) {
    renderSavedBackground(ctx, canvas);
    renderEnd();
    status.isEndScreen = true;     // <— no global, the flag lives on status now

    stopAnimation();  // no more animation frames
    // (We’ll still accept pointer events — see next section.)
    return;
  }

  // 6) Otherwise, overlay START or RUNNING with appropriate clock speed
  const mode = getMode();  // 'preview' or 'concert'

  // Derive the clock time:
  // - CONCERT: real time (elapsedMs)
  // - PREVIEW: fast-forward from 00:00 to 12:24 in 31 seconds
  let clockMs;

//  if (mode === 'preview') {
  if (status.modeChosen === 'preview') {
    // Total duration of the preview run at the current preview tempo
    const totalPreviewMs =
      NUM_STATES * BEATS_PER_STATE * status.msPerBeat;

    // Normalize 0..1 through the preview, clamp at 1
    const frac = totalPreviewMs > 0
      ? Math.min(1, elapsedMs / totalPreviewMs)
      : 0;

    // Map that fraction onto the full concert duration (744000 ms)
    clockMs = frac * TOTAL_CONCERT_MS;
  } else {
    // Concert mode: show true elapsed time
    clockMs = elapsedMs;
  }

  const { mins, secs } = clockify(clockMs);

  if (!status.running) {
    // START view: tap clock to start
    renderStartBoth(ctx, status);
//    renderStartBoth({ mode });
  } else {
    // RUNNING view: show MLS index + clock
    renderRunning({ stateIndex, mins, secs });
  }
});

  // 10) Initial draw
  stepOnce();
}

// Boot after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => console.error('[main] init failed:', err));
});
*/