// js/gui/uiControls.js

import { prepareAndRenderBackground } from './canvasUtils.js';
import { renderStartLeader } from './text.js';
import { startAnimation, stopAnimation } from './animation.js';

function isLeader(status) {
  return status.role === 'leader';
}

// Convert a pointer event into canvas coordinates.
// Adjust for the canvas's CSS size vs its internal pixel size (DPR-aware).
function eventToCtxPoint(ev, canvas) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (ev.clientX - rect.left) * scaleX,
    y: (ev.clientY - rect.top) * scaleY,
  };
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
}

// ---------------------------------------------
//  1) Leader mode select (PREVIEW / CONCERT)
// ---------------------------------------------
// NOTE: For now this is a stub wrapper: copy the **body** of your current
// installLeaderModeSelectHandler from main.js into here between the braces.




function installLeaderModeSelectHandler(ctx, canvas, status) {
function installLeaderModeSelectHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    console.log('[ui] modeSelect pointerup raw', {
      role: status.role,
      running: status.running,
      modeChosen: status.modeChosen,
      modeConfirmed: status.modeConfirmed,
    });

    if (!isLeader(status)) return;
    if (status.modeConfirmed) return;

//    const { x, y } = eventToCtxPoint(ev, canvas);
//    console.log('[ui] modeSelect coords', { x, y });

    // ... your existing PREVIEW / CONCERT hit-test & status updates here ...
  });
}

//  if (getRole() !== 'leader') return;
//if (!isLeader(status)) return;

  const HIT_RADIUS = ctx.tapRadius ?? 50;

  canvas.addEventListener('click', (ev) => {
    // Only respond while we’re still in mode-select phase
//    if (status.modeConfirmed) return;

    const { x, y } = eventToCtxPoint(ctx, canvas, ev);
    console.log('[ui] modeSelect coords', { x, y });

    const yLabel = ctx.mid.y;   // PREVIEW / CONCERT are centered on this
    const dxL = x - ctx.l;      // PREVIEW
    const dyL = y - yLabel;
    const dxR = x - ctx.r;      // CONCERT
    const dyR = y - yLabel;

    const hitPreview = (dxL * dxL + dyL * dyL) <= HIT_RADIUS * HIT_RADIUS;
    const hitConcert = (dxR * dxR + dyR * dyR) <= HIT_RADIUS * HIT_RADIUS;

    if (!hitPreview && !hitConcert) return;

    if (hitPreview) {
      status.msPerBeat = ctx.previewClock;
      setMode('preview');
      console.log('[mode] PREVIEW selected, msPerBeat=', status.msPerBeat);
      status.modeChosen = true;
    } else if (hitConcert) {
      status.msPerBeat = ctx.concertClock;
      setMode('concert');
      console.log('[mode] CONCERT selected, msPerBeat=', status.msPerBeat);
      status.modeChosen = true;
    }

    // Stay in mode-select screen, but redraw so bottom text updates
    stepOnce();
  });
}
//function installLeaderModeSelectHandler(ctx, canvas, status) {
  // ⬇️ PASTE YOUR EXISTING IMPLEMENTATION HERE ⬇️
  //
  // It should look like your current function:
  // - check isLeader(status)
  // - ignore if status.modeConfirmed is true
  // - hit-test PREVIEW / CONCERT areas
  // - set status.msPerBeat
  // - set status.modeChosen = true
  // - call prepareAndRenderBackground(ctx, canvas)
  // - call renderStartLeader(ctx, { ... })
  //
  // For example:
  //
  // canvas.addEventListener('pointerup', (ev) => {
  //   if (!isLeader(status)) return;
  //   if (status.modeConfirmed) return;
  //   // ... your hit test + status updates ...
  // });
//}

// ---------------------------------------------
//  2) Leader mode confirm (tap bottom text)
// ---------------------------------------------

function installLeaderModeConfirmHandler(ctx, canvas, status) {
//  if (getRole() !== 'leader') return;
  if (!isLeader(status)) return;

  const HIT_RADIUS = ctx.tapRadius ?? 50;
  const bottomY = ctx.h - ctx.tapRadius * 1.5;  // approx centre of bottom text

  canvas.addEventListener('click', (ev) => {
    // Only respond while we’re still in mode-select phase
    if (status.modeConfirmed) return;

    const { x, y } = eventToCtxPoint(ctx, canvas, ev);

    const dx = x - ctx.mid.x;
    const dy = y - bottomY;

    if ((dx * dx + dy * dy) > HIT_RADIUS * HIT_RADIUS) {
      return;
    }

console.log('[mode] mode confirmed by tapping bottom text');
status.modeConfirmed = true;

// Now we leave mode-select and move to "start view"
prepareAndRenderBackground(ctx, canvas);

const mode =
  status.msPerBeat === ctx.previewClock ? 'preview' : 'concert';

// For the leader, show the "tap clock to start" view for the chosen mode
    renderStartLeader(ctx, {
     mode,
     msPerBeat: status.msPerBeat,
     modeChosen: status.modeChosen,
    });

  });
}

//function installLeaderModeConfirmHandler(ctx, canvas, status) {
  // ⬇️ PASTE YOUR EXISTING IMPLEMENTATION HERE ⬇️
  //
  // Typically:
  // - leader only
  // - if (status.modeConfirmed) return;
  // - hit-test bottom band
  // - set status.modeConfirmed = true;
  // - redraw "start animation" view for chosen mode
//}

// ---------------------------------------------
//  3) Leader stop handler (double-tap clock)
// ---------------------------------------------

function installLeaderStopHandler(ctx, canvas, status) {
//  if (getRole() !== 'leader') return;
  if (!isLeader(status)) return;

  const DOUBLE_TAP_MS = 350;
  const TAP_RADIUS    = ctx.tapRadius ?? 50;

  let lastTapTime = 0;

  canvas.addEventListener('click', (ev) => {
    const { x, y } = eventToCtxPoint(ctx, canvas, ev);

    const mid = ctx.mid || { x: ctx.w / 2, y: ctx.h / 2 };

    const dx = x - mid.x;
    const dy = y - mid.y;
    if ((dx * dx + dy * dy) > TAP_RADIUS * TAP_RADIUS) {
      return;
    }

    const now = performance.now();
    if (now - lastTapTime < DOUBLE_TAP_MS) {
      // DOUBLE TAP detected near clock centre
      console.log('[mode] leader STOP via double-tap on clock');
      stopAnimation();
      status.running   = false;
      status.startWall = 0;
      stepOnce();
    }

    lastTapTime = now;
  });
}

//function installLeaderStopHandler(ctx, canvas, status) {
  // ⬇️ PASTE YOUR CURRENT IMPLEMENTATION HERE ⬇️
  //
  // This is where you’ll later refine your rehearsal pause/stop logic.
  // For now, just move the existing code:
  //
  // - leader only
  // - detect double-tap near the clock
  // - call stopAnimation()
  // - set status.running = false;
  // - set status.startWall = 0;
  // - redraw appropriate start view
//}

// ---------------------------------------------
//  4) Clock start handler (tap clock to start)
// ---------------------------------------------

function installClockStartHandler(ctx, canvas, status) {
  const TAP_RADIUS = ctx.tapRadius ?? 50;

  canvas.addEventListener('click', (ev) => {
    const { x, y } = eventToCtxPoint(ctx, canvas, ev);

    const mid = ctx.mid || { x: ctx.w / 2, y: ctx.h / 2 };

    const dx = x - mid.x;
    const dy = y - mid.y;
    if ((dx * dx + dy * dy) > TAP_RADIUS * TAP_RADIUS) {
      return;
    }

    // Only start if mode is confirmed (leader) or already true (consort),
    // and not already running.
    if (!status.modeConfirmed) return;
    if (status.running) return;

    console.log('[mode] START animation via clock tap');

    status.running   = true;
    status.startWall = performance.now();

    startAnimation();
  });
}



//function installClockStartHandler(ctx, canvas, status) {
  // ⬇️ PASTE YOUR EXISTING IMPLEMENTATION HERE ⬇️
  //
  // Current logic is something like:
  // canvas.addEventListener('pointerup', (ev) => {
  //   if (!status.modeConfirmed) return;
  //   if (status.running) return;
  //   // hit-test clock area
  //   status.running   = true;
  //   status.startWall = performance.now();
  //   startAnimation();   // your existing call
  //   console.log('[mode] START animation via clock tap');
  // });
//}

// ---------------------------------------------
//  5) End-screen tap handler (duration : 12:24)
// ---------------------------------------------
// This one we already debugged together, so here’s a full implementation.
// It assumes you move the "end-screen flag" into `status.isEndScreen`.
function installEndScreenTapHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    if (!isLeader(status)) return;        // consorts ignore this
    if (!status.isEndScreen) return;      // only active on END view

    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const w = canvas.width;
    const h = canvas.height;

    // Vertical band around the centre (where 'duration : 12:24' lives)
    const midY = h * 0.5;
    const bandHeight = h * 0.15;
    const withinMidBand =
      y > midY - bandHeight / 2 && y < midY + bandHeight / 2;

    // Central 80% horizontally
    const marginX = w * 0.1;
    const withinX = x > marginX && x < w - marginX;

    if (!(withinMidBand && withinX)) return;

    // ----- We hit the "duration : 12:24" hotspot -----
    status.isEndScreen   = false;
    status.modeChosen    = null;   // forget previous mode
    status.modeConfirmed = false;  // mode not confirmed anymore
    status.running       = false;

    // Redraw the MODE SELECT view (PREVIEW vs CONCERT)
    prepareAndRenderBackground(ctx, canvas);
    const mode =
      status.msPerBeat === ctx.previewClock ? 'preview' : 'concert';

    renderStartLeader(ctx, {
      mode,
      msPerBeat: status.msPerBeat,
      modeChosen: status.modeChosen,  // now null → both options visible
    });

    console.log('[mode] return to MODE SELECT from end screen');
  });
}
