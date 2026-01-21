// js/gui/uiControls.js

import { 
  prepareAndRenderBackground,
  selectAndRenderBackground,
  blitBackgroundToPane, 
  eventToCtxPoint, 
  getSlots, 
  radializeSlots,
  arrB
} from './canvasUtils.js';

import { 
  drawPhoneAt,
//  downloadFamilyRingPNG,
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

import { isInsideCircle } from './helpers.js';
import { getFamilyMask } from './sequence.js';
import { drawHenge } from './henge.js';
import { refresh } from './runTime.js';

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
  installHengeHandler(ctx, canvas, status);
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

    const { x, y } = eventToDesignPoint(ev, canvas, ctx);

    console.log('[select] pointer', {
      x, y,
      left: ctx.left,
      right: ctx.right,
      y1: ctx.mid.y,
      r: ctx.tapRadius
    });

    const hitLeft  = isInsideCircle(x, y, ctx.left.x,  ctx.left.y,  ctx.tapRadius);
    const hitRight = isInsideCircle(x, y, ctx.right.x, ctx.right.y, ctx.tapRadius);

    if (!hitLeft && !hitRight) return;

    if (hitLeft) {
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

    const { x, y } = eventToDesignPoint(ev, canvas, ctx);

    const x1 = ctx.low.x;
    const y1 = ctx.low.y;
    const r  = ctx.tapRadius;

    console.log('[confirm] pointer', { x, y, x1, y1, r });

    const hitConfirm = isInsideCircle(x, y, x1, y1, r);
    if (!hitConfirm) return;

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

    console.log('[confirm] mode confirmed via bottom text tap');
    console.log('[confirm] state at confirm tap', {
      modeChosen: status.modeChosen,
      msPerBeat: status.msPerBeat
    });

/*
	if (!status._dumpedFamilyRing) {
	  status._dumpedFamilyRing = true;   // one-shot
	  downloadFamilyRingPNG({ 
	    family: null, 
	    active: true, 
	    filename: 'family1-ring.png' 
	    });
	}
*/
    refresh();
  });
}

// ---------------------------------------------------------------------------
//  Leader: stop while running (tap TOP text hot spot)
//  (Adjust hotspot if you want it elsewhere; this keeps it away from the clock.)
// ---------------------------------------------------------------------------
export function installLeaderStopHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role !== 'leader') return;
    if (!status.running) return;

    const { x, y } = eventToDesignPoint(ev, canvas, ctx);

    // Use top text position as STOP hotspot
    const x1 = ctx.top.x;
    const y1 = ctx.top.y;
    const r  = ctx.tapRadius;

    const hitStop = isInsideCircle(x, y, x1, y1, r);
    if (!hitStop) return;

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
    // Leaders must confirm mode before clock can start.
    if (status.role === 'leader' && !status.modeConfirmed) {
      console.log('[clock] ignored: mode not confirmed');
      return;
    }
    // End screen has its own handler
    if (status.isEndScreen) return;

    const { x, y } = eventToDesignPoint(ev, canvas, ctx);

    const hitClock = isInsideCircle(x, y, ctx.mid.x, ctx.mid.y, ctx.tapRadius);
    if (!hitClock) {
      console.log('[clock] ignored: outside clock');
      return;
    }

    if (status.running) {
      console.log('[clock] ignored: already running');
      return;
    }

    status.running = true;
    status.startWall = performance.now();
    status.isEndScreen = false;

    console.log('[mode] START animation via clock tap');

    startAnimation();
    refresh(); // immediate feedback; animation loop will take over
  });
}

// ---------------------------------------------------------------------------
//  End screen: leader can tap clock to reselect mode (back to mode-select)
// ---------------------------------------------------------------------------
export function installEndScreenTapHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role !== 'leader') return;
    if (!status.isEndScreen) return;

    const { x, y } = eventToDesignPoint(ev, canvas, ctx);

    const reSelect = isInsideCircle(x, y, ctx.mid.x, ctx.mid.y, ctx.tapRadius);
    if (!reSelect) {
      console.log('[end] ignored: outside end screen hot spot');
      return;
    }

    console.log('[end] reselect: returning to mode select');

    // Stop anything still ticking (safe even if already stopped)
    stopAnimation();

    status.running = false;
    status.startWall = 0;
    status.isEndScreen = false;

    // Return leader to mode-select phase
    status.modeConfirmed = false;

    refresh();
  });
}

// ---------------------------------------------------------------------------
//  Leader & Consort: trigger sound by tapping henge hot spots
// ---------------------------------------------------------------------------

function installHengeHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (status.role === 'leader' && !status.modeConfirmed) return;
    if (status.modeChosen === 'preview') return;
    if (status.isEndScreen) return;

    const slots = getSlots();
    if (!slots?.length) return;

    const { x, y } = eventToCtxPoint(ev, canvas, ctx);

    // Hit test
    const hit = pickSlotFromPoint(slots, x, y, ctx); // uses ctx.keyRadius
    const hitI = hit ? (hit.i ?? hit.index ?? null) : null;
    const hitFamily = (hitI != null) ? familyForIndex(hitI) : null;

    // Always remember last pointer-up for debug overlay
    status.debugTap = { x, y, hitI, hitFamily };

    if (!hit) {
      refresh();
      return;
    }

    // Block taps on “off” phones only while running — but pass family too
    if (status.running && !isSlotVisibleInState({ i: hitI, family: hitFamily }, status.index)) {
      refresh();
      return;
    }

    ev.preventDefault();
    ev.stopImmediatePropagation();

    console.log('[henge tap]', {
      i: hitI,
      family: hitFamily,
      x: Math.round(x),
      y: Math.round(y),
      r: ctx.keyRadius ?? 34,
      modeChosen: status.modeChosen,
      running: status.running,
    });

    // Update background selection FIRST
    status.bgFamily = hitFamily;
    status.bgIndex  = hitI;

    // Render to the BG layer (adjust this to your actual background ctx)
    const ctxB = arrB?.[0]?.ctx;        
if (ctxB) {
  selectAndRenderBackground(ctxB, status);
  blitBackgroundToPane();   // <-- immediate visible update
}
//refresh();                  // keep, because you also want hotspots/text/phones updated
  }, { capture: true });
}



// returns true if this slot is "on" in the current state
function isSlotVisibleInState(slot, stateIndex) {
  const mask = getFamilyMask(stateIndex);
  if (!mask) return true; // if no mask available, don't block taps

  // Case A: per-slot mask: length == number of phones (e.g. 25)
  if (Array.isArray(mask) && mask.length >= 25) {
    return !!mask[slot.i];
  }

  // Case B: per-family mask: length == number of families (e.g. 5)
  if (Array.isArray(mask) && mask.length <= 8) {
    const f = slot.family;                 // you now stamp this in makeHengeOf()
    const fi = (f >= 1) ? (f - 1) : f;     // if families are 1..5, shift to 0..4
    return !!mask[fi];
  }

  // Case C: numeric bitmask by family
  if (typeof mask === 'number') {
    const f = slot.family;
    const fi = (f >= 1) ? (f - 1) : f;
    return ((mask >> fi) & 1) === 1;
  }

  return true;
}


export function pickSlotFromPoint(henge, x, y, ctx) {
  if (!Array.isArray(henge) || henge.length === 0) return null;

  const r = (ctx?.keyRadius ?? 34);

  // If your draw order makes later slots appear "on top", iterate backwards.
  for (let i = henge.length - 1; i >= 0; i--) {
    const s = henge[i];
    if (isInsideCircle(x, y, s.x, s.y, r)) return s;
  }
  return null;
}