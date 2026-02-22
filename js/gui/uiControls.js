// js/gui/uiControls.js

import { 
  prepareAndRenderBackground,
  selectAndRenderBackground,
  composeFrame,
  beginBackgroundCrossfade,  
  eventToCtxPoint,
  getSlots, 
  radializeSlots,
  arrB
} from './canvasUtils.js';

import { 
  drawPhoneAt,
  familyForIndex, 
} from './sprites.js';

import { 
  renderStartLeader, 
  renderStartBoth 
} from './text.js';

import { 
  startAnimation, 
  stopAnimation 
} from './animation.js';

import { isInsideCircle, logStatusProbe } from './helpers.js';
import { getFamilyMask, sequence } from './sequence.js';
import { drawHenge } from './henge.js';
import { refresh } from './runTime.js';

import { FamilyIndex, ColorFamily } from './color.js';

//import { startSequenceSanityRun }  from './main.js';

import { pingBeep } from "./satgamPing.js";

//import { primeAudioContext, enableCsound, playTestTone, getCsoundInfo } from "./csoundInit.js";
import { primeAudioContext, enableCsound, playTestTone } from "./csoundInit.js";

function isLeader(status) {
  return status.role === 'leader';
}

// ---------------------------------------------
//  PUBLIC ENTRY POINT
// ---------------------------------------------
export function installUIHandlers(ctx, canvas, status) {
  installLeaderModeSelectHandler(ctx, canvas, status);
  installLeaderModeConfirmHandler(ctx, canvas, status);
  installLeaderStopHandler(ctx, canvas, status);
  installClockStartHandler(ctx, canvas, status);
  installEndScreenTapHandler(ctx, canvas, status);
//  installHengeHandler(ctx, canvas, status);
  installFadeToBlackHandler(ctx, canvas, status);
  installCsoundHandler(ctx, canvas, status);
//  installPingHandler(ctx, canvas, status);
}

// --- helper: PointerEvent -> DESIGN coords (works for fixed and fit) ---
function eventToDesignPoint(ev, canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const cssX = ev.clientX - rect.left;
  const cssY = ev.clientY - rect.top;

  // Map CSS pixels to DESIGN units.
  // In 'fixed' mode rect.width === ctx.w, so scaleX/Y === 1.
  const scaleX = ctx.w / rect.width;
  const scaleY = ctx.h / rect.height;

  return { x: cssX * scaleX, y: cssY * scaleY };
}

// ---------------------------------------------------------------------------
//  Leader: choose PREVIEW/CONCERT by tapping left/right hot spots
// ---------------------------------------------------------------------------
export function installLeaderModeSelectHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role !== 'leader') return;
    if (status.modeConfirmed) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    console.log('[select] pointer', {
      x, y,
      left: ctx.left,
      right: ctx.right,
      y1: ctx.mid.y,
      r: ctx.tapRadius
    });

    const tapLeft  = isInsideCircle(x, y, ctx.left.x,  ctx.left.y,  ctx.tapRadius);
    const tapRight = isInsideCircle(x, y, ctx.right.x, ctx.right.y, ctx.tapRadius);

    if (!tapLeft && !tapRight) return;

    if (tapLeft) {
      status.modeChosen = 'preview';
      status.msPerBeat  = status.previewClock;
      console.log('[mode] PREVIEW selected, msPerBeat =', status.msPerBeat);
    } else {
      status.modeChosen = 'concert';
      status.msPerBeat  = status.concertClock;
      console.log('[mode] CONCERT selected, msPerBeat =', status.msPerBeat);
    }

    console.log('[select] state after mode tap:', {
      modeChosen: status.modeChosen,
      msPerBeat: status.msPerBeat
    });

    refresh();
  });
}

// ---------------------------------------------------------------------------
//  Leader: confirm by tapping bottom text hot spot (ctx.low)
// ---------------------------------------------------------------------------

export function installLeaderModeConfirmHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role !== 'leader') return;
    if (status.modeConfirmed) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    const x1 = ctx.low.x;
    const y1 = ctx.low.y;
    const r  = ctx.tapRadius;

    console.log('[confirm] pointer', { x, y, x1, y1, r });

    const tapConfirm = isInsideCircle(x, y, x1, y1, r);
    if (!tapConfirm) return;

    status.modeConfirmed = true;
    status.running = false;
    status.isEndScreen = false;

    // Lock tempo to chosen mode
    if (status.modeChosen === 'preview') {
      status.msPerBeat = status.previewClock;
      console.log('[confirm] using mode for start view preview');
    } else {
      status.msPerBeat = status.concertClock;
      console.log('[confirm] using mode for start view concert');
    }

    status.startWall = null;
    status.runStateDurationMs = null;

    console.log('[confirm] mode confirmed via bottom text tap');
    console.log('[confirm] state at confirm tap', {
      modeChosen: status.modeChosen,
      msPerBeat: status.msPerBeat
    });

    // ✅ Make the view transition happen immediately
    refresh();

    // ✅ Prime + start Csound on the CONFIRM gesture (concert “warm-up”)
    // Guard so it only happens once (but allow retry if it fails)

// ✅ Prime + start Csound on the CONFIRM gesture
if (!status.csoundPrimed) {
  status.csoundPrimed = true;
  status.audioReady = false;

  console.log("[confirm] priming Csound + test beep");

  primeAudioContext()
    .then(() => enableCsound())
    .then(() => playTestTone({ freq: 440, dur: 0.2, amp: 0.25 }))
    .then(() => {
      status.audioReady = true;
      refresh(); // update bottom line to "AUDIO READY"
    })
    .catch((e) => {
      status.csoundPrimed = false; // allow retry on next confirm if needed
      status.audioReady = false;
      console.error("❌ Csound prime/beep failed:", e);
      refresh();
    });
   }
  }, { capture: true });
}

// ---------------------------------------------------------------------------
//  Leader: stop while running (tap TOP text hot spot)
// ---------------------------------------------------------------------------
export function installLeaderStopHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role !== 'leader') return;
    if (!status.running) return;

	const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    // Use top text position as STOP hotspot
    const x1 = ctx.top.x;
    const y1 = ctx.top.y;
    const r  = ctx.tapRadius;

    const tapStop = isInsideCircle(x, y, x1, y1, r);
    if (!tapStop) return;

    console.log('[stop] leader stop via top text tap');

    stopAnimation();
    status.running = false;
    status.startWall = 0;

    refresh();
  });
}

// ---------------------------------------------------------------------------
//  Clock tap: start animation (center clock hot spot at ctx.mid)
// ---------------------------------------------------------------------------

export function installClockStartHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role === 'leader' && !status.modeConfirmed) return;

    // 🔧 Use the same coordinate space as installHengeHandler
    const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    const x1 = ctx.mid.x;
    const y1 = ctx.mid.y;
    const r  = ctx.tapRadius;

    if (!isInsideCircle(x, y, x1, y1, r)) return;

	// Leader END screen is handled by installEndScreenTapHandler()
	if (status.role === 'leader' && status.isEndScreen) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    if (status.isEndScreen) {
      status.running = false;
      status.isEndScreen = false;
      status.index = status.fullHenge;

      status.startWall = null;
      status.runStateDurationMs = null;
      status.nextStateWallMs = null;

      refresh();
      return;
    }

    if (status.running) return;

    status.msPerBeat = (status.modeChosen === 'preview')
      ? status.previewClock
      : status.concertClock;

    status.runStateDurationMs = status.STATE_DUR * status.msPerBeat;
    status.startWall = performance.now();
    status.nextStateWallMs = status.startWall + status.runStateDurationMs;

    status.index = 0;
    status.running = true;          // 🔧 must be truthy while running
    status.isEndScreen = false;

    startAnimation();               // 🔧 don’t silently skip
    refresh();
  }, { capture: true });
}


// ---------------------------------------------------------------------------
//  End screen: leader can tap clock to reselect mode (back to mode-select)
// ---------------------------------------------------------------------------
export function installEndScreenTapHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role !== 'leader') return;
    if (!status.isEndScreen) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    const reSelect = isInsideCircle(x, y, ctx.mid.x, ctx.mid.y, ctx.tapRadius);
    if (!reSelect) {
      console.log('[end] ignored: outside end screen hot spot');
      return;
    }

    console.log('[end] reselect: returning to mode select');

    // Stop anything still ticking
    stopAnimation();

    status.running = false;
    status.startWall = 0;
    status.lastKeyIndex = null;
    status.isEndScreen = false;

    // Return leader to mode-select phase
    status.modeConfirmed = false;

    refresh();
  }, { capture: true });
}

// ---------------------------------------------------------------------------
//  Leader & Consort: trigger sound by tapping henge hot spots
// ---------------------------------------------------------------------------

function installCsoundHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    // Ignore taps until leader has confirmed mode
    if (status.role === 'leader' && !status.modeConfirmed) return;

    // No henge tap actions in preview mode
    if (status.modeChosen === 'preview') return;

    // Ignore end screen
    if (status.isEndScreen) return;

    const slots = getSlots();
    if (!slots?.length) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);
    let hitSlotHotspot = false;

    // Don’t compete with the centre clock/start hotspot
    if (isInsideCircle(x, y, ctx.mid.x, ctx.mid.y, ctx.tapRadius)) return;

    // Only treat taps as henge taps if they hit a real slot hotspot
    for (const s of slots) {
      if (isInsideCircle(x, y, s.x, s.y, ctx.keyRadius)) {
        hitSlotHotspot = true;
        break;
      }
    }
    if (!hitSlotHotspot) return;

    const tap = pickSlotFromPoint(slots, x, y, ctx);
    if (!tap) return;

    const tapI = tap.i ?? tap.index ?? null;
    if (tapI == null) return;

    const tapFamily = familyForIndex(tapI);
    const keyID = tapI + 1; // 1..25

    // Debug/status bookkeeping
    status.debugTap = { x, y, tapI, tapFamily };
    status.tapFamily = tapFamily;      // ✅ keep real family (no modulo / no .length)
    status.lastKeyIndex = keyID;       // ✅ used by Start View "Key N" message

    // Optional probe (safe to remove later)
    logStatusProbe("[tap/pre-branch]", status, { keyID, tapFamily });

    console.log('[installCsoundHandler] tapped key :', keyID);

    // ✅ Start View: repaint immediately so "Key N" updates without DevTools
    if (!status.running) {
      refresh();
      return;
    }

    // ✅ Running View: only allow active family taps for this state
    const familyOn = isFamilyOnInState(tapFamily, status.index);

    // Optional probe (safe to remove later)
    logStatusProbe("[tap/run gate]", status, { keyID, tapFamily, familyOn });

    if (!familyOn) return;

    // ✅ Trigger background colour change / crossfade during running view
    // Adjust duration to taste (e.g. 240..480ms)
    const ctxB = arrB?.[0]?.ctx;
    if (ctxB) {
      beginBackgroundCrossfade(status, ctxB, tapFamily, 3320);
    }

    // Usually not needed in running mode if your render loop is active,
    // but harmless if you want an immediate repaint kick:
    // refresh();

  }, { capture: true });
}
/*
function installCsoundHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role === 'leader' && !status.modeConfirmed) return;
    if (status.modeChosen === 'preview') return;
    if (status.isEndScreen) return;

    const slots = getSlots();
    if (!slots?.length) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);
    let hitSlotHotspot = false;

    // ✅ Don’t compete with the clock start handler (centre hot spot)
    if (isInsideCircle(x, y, ctx.mid.x, ctx.mid.y, ctx.tapRadius)) return;

    // ✅ Only treat taps as "henge taps" if they hit a real slot hot spot
    for (const s of slots) {
      if (isInsideCircle(x, y, s.x, s.y, ctx.keyRadius)) {
        hitSlotHotspot = true;
        break;
      }
    }
    if (!hitSlotHotspot) return;

    const tap = pickSlotFromPoint(slots, x, y, ctx);
    if (!tap) return;

    const tapI = tap.i ?? tap.index ?? null;
    if (tapI == null) return;

    const tapFamily = familyForIndex(tapI);

    status.debugTap = { x, y, tapI, tapFamily };
    const keyID = tapI + 1;

    status.tapFamily = tapI % FamilyIndex.length;
    status.lastKeyIndex = keyID; // Key 1..25
    
    console.log('[installCsoundHandler] tapped key :', keyID);

	logStatusProbe("[tap/pre-branch]", status, { //
	  keyID,
	  tapFamily,
	});

if (!status.running) {
  refresh();
  return;
}

const familyOn = isFamilyOnInState(status); //tap Family, st atus.index);

logStatusProbe("[tap/run gate]", status, {
  keyID,
  tapFamily,
  familyOn,
});

if (!familyOn) return;
// ✅ Start View: repaint immediately so "Key N" updates without DevTools
	if (!status.running) {
	  refresh();
	  return;
	}
  }, { capture: true });
}
*/

function installHengeHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role === 'leader' && !status.modeConfirmed) return;
    if (status.modeChosen === 'preview') return;
    if (status.isEndScreen) return;

    const slots = getSlots();
    if (!slots?.length) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);
	let hitSlotHotspot = null;

    // ✅ Don’t compete with the clock start handler (centre hot spot)
    if (isInsideCircle(x, y, ctx.mid.x, ctx.mid.y, ctx.tapRadius)) return;

    // ✅ NEW: only treat taps as "henge taps" if they hit a real slot hot spot
    for (const s of slots) {
      const sx = s.x;
      const sy = s.y;

      if (isInsideCircle(x, y, sx, sy, ctx.keyRadius)) {
        hitSlotHotspot = true;
        break;
      }
    }
    if (!hitSlotHotspot) return;

    const tap = pickSlotFromPoint(slots, x, y, ctx);
    if (!tap) return;

    const tapI = tap.i ?? tap.index ?? null;
    if (tapI == null) return;

    const tapFamily = familyForIndex(tapI);
    status.tappedFamily = tapI % FamilyIndex.length;

    status.debugTap = { x, y, tapI, tapFamily };
	const keyID = tapI + 1;    
    status.lastKeyIndex = keyID; // Key 1..25
    
    console.log('[installHengeHandler] keyID :', keyID);
    console.log('[textColor]', { bgFamily: status.bgFamily, tapFamily: tapFamily, textColor: status.textColor });

    // START VIEW: show Key ID without swallowing clock events)
    if (!status.running) {
      refresh();
      return;
    }

    // RUNNING: block off-family taps
    if (!isFamilyOnInState(status, tapFamily)) return;
//if (!isFamilyO nInState(tapF amily, sta tus.i ndex)) return;

    // RUNNING: now we can own the event + trigger fade
    ev.preventDefault();
    ev.stopImmediatePropagation();
    beginBackgroundCrossfade(status, arrB[0].ctx, tapFamily, 2320);
  }, { capture: true });
}

function installPingHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', async (ev) => {
    if (status.role === 'leader' && !status.modeConfirmed) return;
    if (status.modeChosen === 'preview') return;
    if (status.isEndScreen) return;

    const slots = getSlots();
    if (!slots?.length) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);
    let hitSlotHotspot = null;

    // ✅ Don’t compete with the clock start handler (centre hot spot)
    if (isInsideCircle(x, y, ctx.mid.x, ctx.mid.y, ctx.tapRadius)) return;

    // ✅ Only treat taps as "henge taps" if they hit a real slot hot spot
    for (const s of slots) {
      if (isInsideCircle(x, y, s.x, s.y, ctx.keyRadius)) {
        hitSlotHotspot = true;
        break;
      }
    }
    if (!hitSlotHotspot) return;

    const tap = pickSlotFromPoint(slots, x, y, ctx);
    if (!tap) return;

    const tapI = tap.i ?? tap.index ?? null;
    if (tapI == null) return;

    const tapFamily = familyForIndex(tapI);

    status.debugTap = { x, y, tapI, tapFamily };
    const keyID = tapI + 1;

    status.lastKeyIndex = keyID; // Key 1..25
    console.log('[installPingHandler] tapped key :', keyID);

    // ✅ Ping test: tap Key 1 => init (gesture-safe) + short beep

//function installPingHandler(ctx, canvas, status) {
//  canvas.addEventListener("pointerup", async (ev) => {
    // ... your existing hit-testing to get keyID ...

    if (keyID === 1) {
      console.log("[installPingHandler] key 1 -> ping");
      try {
        await pingBeep({ hz: 440, dur: 0.2, amp: 0.25 });
      } catch (e) {
        console.error("❌ Ping failed:", e);
      }
    }
  }, { capture: true });
}


//function installFadeToBlackHandler(ctx, canvas, status) {
export function installFadeToBlackHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (!status.running) return;                 // only mid-performance
    if (status.role === 'leader' && !status.modeConfirmed) return;
    if (status.isEndScreen) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    // Hotspot around the top state-number text
    const hx = ctx.mid.x;
    const hy = ctx.h * 0.10;
    const r  = ctx.tapRadius;

    if (!isInsideCircle(x, y, hx, hy, r)) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    // Trigger fade-to-black from current bg
    beginBackgroundCrossfade(status, arrB[0].ctx, ColorFamily.BLACK, 5000);

    // Ensure bgFamily reflects “black” after fade completes
    status.bgFamily = ColorFamily.BLACK;
  }, { capture: true });
}

// returns true if this family is "on" in the current state
function isFamilyOnInState(family, stateIndex) {
  const bits = sequence?.[stateIndex];
  if (!bits) return true; // out of range -> don't block taps

  const bitPos = FamilyIndex[family];
  if (!Number.isInteger(bitPos)) {
    throw new Error(`FamilyIndex missing for family=${family}`);
  }

  return bits[bitPos] !== 0;
}

export function pickSlotFromPoint(slots, x, y, ctx) {
  if (!Array.isArray(slots) || slots.length === 0) return null;

  const r = ctx.keyRadius; //const r = (ctx?.keyRadius ?? 34);

  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i];
    if (isInsideCircle(x, y, s.x, s.y, r)) return s;
  }
  return null;
}
