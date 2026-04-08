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
  renderStartConsort, 
  renderReadyToPlay, 
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

import { leaderStartClock } from './main.js';
 
import { pingBeep } from "./satgamPing.js";

import { primeAudioContext, enableCsound, playTestTone } from "./csoundInit.js";

import { startPerformanceWakeLock } from './wakeLock.js';

import { 
//  MAX_STATES, 
  STATE_DUR, 
//  MAX_DUR, 
//  CONCERT_CLK, 
//  PREVIEW_CLK,
//  FULL_HENGE
} from './globals.js';

function isLeader(status) {
  return status.role === 'leader';
}

// ---------------------------------------------
//  PUBLIC ENTRY POINT
// ---------------------------------------------
export function installUIHandlers(ctx, canvas, status, audio) {
  installLeaderEntryHandler(ctx, canvas, status);
  installLeaderModeConfirmHandler(ctx, canvas, status, audio);
  installClockStartHandler(ctx, canvas, status);
  installEndScreenTapHandler(ctx, canvas, status);
  installFadeToBlackHandler(ctx, canvas, status);
  installCsoundHandler(ctx, canvas, status, audio);

//  installHengeHandler(ctx, canvas, status);
//  installLeaderModeConfirmHandler(ctx, canvas, status);
//  installLeaderStopHandler(ctx, canvas, status);
//  installCsoundHandler(ctx, canvas, status, csound);
//  installCsoundHandler(ctx, canvas, status);
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

function mayPlayPhoneTap(status) {
  if (status.modeChosen === 'preview') return !status.running;
  if (status.modeChosen === 'concert') return !!status.running;
  return false;
}
// ---------------------------------------------------------------------------
//  Leader: choose PREVIEW/CONCERT by tapping left/right hot spots
// ---------------------------------------------------------------------------
export function installLeaderEntryHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role !== 'leader') return;
    if (status.leaderModeConfirmed) return;

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
      console.log('[mode] PREVIEW selected to be confirmed, msPerBeat =', status.msPerBeat);
    } else {
      status.modeChosen = 'concert';
      status.msPerBeat  = status.concertClock;
      console.log('[mode] CONCERT selected to be confirmed, msPerBeat =', status.msPerBeat);
    }

    console.log('[Entry View] unconfirmed state after mode selection:', {
      modeChosen: status.modeChosen,
      msPerBeat: status.msPerBeat
    });

    refresh();
  });
}

// ---------------------------------------------------------------------------
//  Leader: confirm by tapping bottom text hot spot (ctx.low)
// ---------------------------------------------------------------------------


function installLeaderModeConfirmHandler(ctx, canvas, status, audio) {
  canvas.addEventListener('pointerup', async (ev) => {
    if (status.role !== 'leader') return;
    if (status.leaderModeConfirmed) return;
    if (status.confirmPending) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    const x1 = ctx.low.x;
    const y1 = ctx.low.y;
    const r  = ctx.tapRadius;

    console.log('[confirm] pointer', { x, y, x1, y1, r });

    const tapConfirm = isInsideCircle(x, y, x1, y1, r);
    if (!tapConfirm) return;

    console.log('[leader confirm] tapped confirm hotspot', {
      role: status.role,
      modeChosen: status.modeChosen,
      leaderModeConfirmed: status.leaderModeConfirmed,
      confirmPending: status.confirmPending,
      hasClockBus: !!status.clockBus,
      busKeys: status.clockBus ? Object.keys(status.clockBus) : [],
      busHasSend: !!status.clockBus?.send,
      busHasPost: !!status.clockBus?.post,
      busHasEmit: !!status.clockBus?.emit,
      busHasSendConfig: !!status.clockBus?.sendConfig,
      busHasStart: !!status.clockBus?.start,
    });

    status.running = false;
    status.isEndScreen = false;
    status.lastConfirmedMode = status.modeChosen;
    status.startWall = null;
    status.runStateDurationMs = null;

    if (status.modeChosen === 'preview') {
      status.msPerBeat = status.previewClock;
      console.log('[Entry View] lastConfirmedMode will be PREVIEW MODE');

      status.audioReady = false;
      status.csoundPrimed = false;
      status.audioStage = 'idle';
      status.leaderModeConfirmed = true;

      if (!status.clockBus?.send) {
        console.error('[leader] cannot send CONFIG on confirm: clockBus.send missing', {
          hasClockBus: !!status.clockBus,
          busKeys: status.clockBus ? Object.keys(status.clockBus) : [],
        });
      } else {
        const msg = {
          type: 'config',
          mode: status.modeChosen,
          sendTicks: true,
          checkpointEveryBeats: STATE_DUR,
        };
        console.log('[leader] sending CONFIG from confirm', msg);
        status.clockBus.send(msg);
      }

      console.log('[confirm] preview mode entering Start View', {
        modeChosen: status.modeChosen,
        msPerBeat: status.msPerBeat,
        audioReady: status.audioReady,
        leaderModeConfirmed: status.leaderModeConfirmed,
      });

      refresh();
      return;
    }

    status.msPerBeat = status.concertClock;
    console.log('[Entry View] lastConfirmedMode will be CONCERT MODE');

    console.log('[confirm] status at confirm tap', {
      modeChosen: status.modeChosen,
      msPerBeat: status.msPerBeat,
      audioReady: status.audioReady,
      leaderModeConfirmed: status.leaderModeConfirmed,
      hasClockBus: !!status.clockBus,
      busKeys: status.clockBus ? Object.keys(status.clockBus) : [],
      busHasSend: !!status.clockBus?.send,
      busHasPost: !!status.clockBus?.post,
      busHasEmit: !!status.clockBus?.emit,
      busHasSendConfig: !!status.clockBus?.sendConfig,
      busHasStart: !!status.clockBus?.start,
    });

    status.leaderModeConfirmed = true;
    status.confirmPending = true;
    status.audioReady = false;
    status.audioStage = 'loading';

    if (!status.clockBus?.send) {
      console.error('[leader] cannot send CONFIG on confirm: clockBus.send missing', {
        hasClockBus: !!status.clockBus,
        busKeys: status.clockBus ? Object.keys(status.clockBus) : [],
      });
    } else {
      const msg = {
        type: 'config',
        mode: status.modeChosen,
        sendTicks: true,
        checkpointEveryBeats: STATE_DUR,
      };
      console.log('[leader] sending CONFIG from confirm', msg);
      status.clockBus.send(msg);
    }

    console.log('[confirm] concert mode entering Start View; preparing audio', {
      leaderModeConfirmed: status.leaderModeConfirmed,
      confirmPending: status.confirmPending,
      audioStage: status.audioStage,
    });

    refresh();

    try {
      if (!status.csoundPrimed) {
        console.log('[confirm] priming Csound + test beep');
        await audio.prime({ beep: true });
        status.csoundPrimed = true;
      }

      status.audioReady = true;
      status.audioStage = 'prepared';

      console.log('[confirm] concert audio prepared', {
        modeChosen: status.modeChosen,
        msPerBeat: status.msPerBeat,
        audioReady: status.audioReady,
        csoundPrimed: status.csoundPrimed,
        leaderModeConfirmed: status.leaderModeConfirmed,
      });

      refresh();
    } catch (e) {
      status.csoundPrimed = false;
      status.audioReady = false;
      status.audioStage = 'failed';

      console.error('❌ Csound prime/beep failed:', e);
      refresh();
    } finally {
      status.confirmPending = false;

      console.log('[confirm] finally', {
        confirmPending: status.confirmPending,
        leaderModeConfirmed: status.leaderModeConfirmed,
        audioStage: status.audioStage,
        audioReady: status.audioReady,
      });

      refresh();
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
    if (status.role === 'leader' && !status.leaderModeConfirmed) return;

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
    status.running = true;
    status.isEndScreen = false;

    // ✅ Request wake lock from the same user gesture that starts the run
    startPerformanceWakeLock(status).then((ok) => {
      if (!ok) {
        console.warn(
          '[wakeLock] unavailable; player may need to disable auto-lock manually'
        );
      }
    });

    // ✅ start leader clock bus when leader enters Running View
    if (status.role === 'leader') leaderStartClock(status);

    startAnimation();
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

    console.log('[end] reselect: returning to Entry View');

    // Stop local animation first
    stopAnimation();

    // Stop leader-side ticking on the bus, but do not hide failure.
    if (!status.clockBus) {
      console.error('[end] status.clockBus is missing at end-screen reset', {
        role: status.role,
        modeChosen: status.modeChosen,
      });
    } else if (typeof status.clockBus.stopTicking !== 'function') {
      console.error('[end] clockBus.stopTicking is missing', {
        busKeys: Object.keys(status.clockBus),
      });
    } else {
      console.log('[end] stopping clockBus ticking', {
        busKeys: Object.keys(status.clockBus),
      });
      status.clockBus.stopTicking();
    }

    // Return leader to Entry View flags
    status.running = false;
    status.netRunning = false;
    status.isEndScreen = false;
    status.leaderModeConfirmed = false;
    status.modeConfirmed = false;
    status.cuedToStart = false;

    status.startWall = null;
    status.runStateDurationMs = null;

    status.index = 0;
    status.lastKeyIndex = null;

    status.netTickCount = 0;
    status.netLastTickMs = null;

    // Keep the last confirmed mode selected in Entry View
    status.modeChosen = status.lastConfirmedMode ?? status.modeChosen ?? 'concert';

    if (status.modeChosen === 'preview') {
      status.msPerBeat = status.previewClock;
      console.log('[End View] lastConfirmedMode was PREVIEW MODE');
    } else {
      status.msPerBeat = status.concertClock;
      console.log('[End View] lastConfirmedMode was CONCERT MODE');
    }

    status.view = 'entry';

    const resetMsg = {
      type: 'reset',
      mode: status.modeChosen,
    };

    console.log('[end] leader reset pre-send', {
      hasClockBus: !!status.clockBus,
      busKeys: status.clockBus ? Object.keys(status.clockBus) : [],
      hasSend: !!(status.clockBus && typeof status.clockBus.send === 'function'),
      modeChosen: status.modeChosen,
      resetMsg,
    });

	if (typeof status.clockBus?.send !== 'function') {
	  console.error('[leader] RESET not sent: clockBus.send unavailable', {
		hasClockBus: !!status.clockBus,
		busKeys: status.clockBus ? Object.keys(status.clockBus) : [],
		resetMsg,
	  });
	} else {
	  console.log('[leader] sending RESET', resetMsg);
	  status.clockBus.send(resetMsg);
	}
	
    refresh();
  }, { capture: true });
}

/*
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

    console.log('[end] reselect: returning to Entry View');

    // Stop local animation first
    stopAnimation();

    // Stop any leader-side ticking on the bus too
    status.clockBus?.stopTicking?.();

    // Return leader to Entry View flags
    status.running = false;
    status.netRunning = false;
    status.isEndScreen = false;
    status.leaderModeConfirmed = false;
    status.modeConfirmed = false;
    status.cuedToStart = false;

    status.startWall = null;
    status.runStateDurationMs = null;

    status.index = 0;
    status.lastKeyIndex = null;

    status.netTickCount = 0;
    status.netLastTickMs = null;

    // Keep the last confirmed mode selected in Entry View
    status.modeChosen = status.lastConfirmedMode ?? status.modeChosen ?? 'concert';

    if (status.modeChosen === 'preview') {
      status.msPerBeat = status.previewClock;
      console.log('[End View] lastConfirmedMode was PREVIEW MODE');
    } else {
      status.msPerBeat = status.concertClock;
      console.log('[End View] lastConfirmedMode was CONCERT MODE');
    }

    // Optional but useful for debugging
    status.view = 'entry';

    // Tell consorts to leave End View too
    const resetMsg = {
      type: 'reset',
      mode: status.modeChosen,
    };

    console.log('[leader] sending RESET', resetMsg);
    status.clockBus?.send?.(resetMsg);

    refresh();
  }, { capture: true });
}
*/


// ---------------------------------------------------------------------------
//  Leader & Consort: trigger sound by tapping henge hot spots
// ---------------------------------------------------------------------------

function installCsoundHandler(ctx, canvas, status, audio) {
  canvas.addEventListener('pointerup', (ev) => {
    // Ignore taps until leader has confirmed mode
    if (status.role === 'leader' && !status.leaderModeConfirmed) return;

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

    // Central permission gate:
    // preview  + !running => playable
    // preview  +  running => silent
    // concert  + !running => silent
    // concert  +  running => playable
    const mayPlay = mayPlayPhoneTap(status);

    logStatusProbe("[tap/permission]", status, { keyID, tapFamily, mayPlay });

    if (!mayPlay) return;

    // Debug/status bookkeeping
    status.debugTap = { x, y, tapI, tapFamily };
    status.tapFamily = tapFamily;   // keep real family
    status.lastKeyIndex = keyID;    // used by Start View "Key N" message

    logStatusProbe("[tap/pre-branch]", status, { keyID, tapFamily });

    console.log('[installCsoundHandler] tapped key :', keyID);

    const dur       = status.noteDur   ?? 24.0;
    const formalOct = status.formalOct ?? 0;
    const nNotes    = status.nNotes    ?? 5;
    const mode      = status.chordMode ?? 0;

    // Only enforce the tap limit during Running View
    if (status.running) {
      if (status.hengeLocked) return;

      status.tapsThisState = (status.tapsThisState ?? 0) + 1;

      if (status.tapsThisState > status.tapLimit) {
        status.hengeLocked = true;
//      status.showHenge = false;   // hide for remainder of state
        refresh();                  // update visuals + subtext
        return;
      }
    }

    audio.noteOn({ keyID, dur, formalOct, nNotes, mode })
      .catch(e => console.error("❌ noteOn failed:", e));

    // PREVIEW Start View lands here: repaint immediately so "Key N" updates
    if (!status.running) {
      refresh();
      return;
    }

    // CONCERT Running View lands here
    const familyOn = isFamilyOnInState(tapFamily, status.index);

    logStatusProbe("[tap/run gate]", status, { keyID, tapFamily, familyOn });

    // Keep your existing running-view visual behaviour unchanged
    if (!familyOn) return;

    const ctxB = arrB?.[0]?.ctx;
    if (ctxB) {
      beginBackgroundCrossfade(status, ctxB, tapFamily, 5320);
    }

  }, { capture: true });
}


function installHengeHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role === 'leader' && !status.leaderModeConfirmed) return;
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
    if (status.role === 'leader' && !status.leaderModeConfirmed) return;
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
    if (status.role === 'leader' && !status.leaderModeConfirmed) return;
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

