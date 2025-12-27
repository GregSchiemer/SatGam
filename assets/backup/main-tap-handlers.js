// At top of main.js (outside any function) you should have:
//let isEndScreen = false;   // already in place from earlier steps

// ...
/*
function installEndScreenTapHandler(ctx, canvas, status) {
  canvas.addEventListener('pointerup', (ev) => {
    const role = getRole();
    if (role !== 'leader') return;   // consorts ignore this
    if (!isEndScreen) return;        // only active on END view

    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const w = canvas.width;
    const h = canvas.height;

    // ----- hit-test the "duration : 12:24" text band -----

    const midY = h * 0.5;
    const bandHeight = h * 0.15;  // 15% tall band around centre
    const withinMidBand =
      (y > midY - bandHeight / 2) && (y < midY + bandHeight / 2);

    const marginX = w * 0.1;      // central 80% of width
    const withinX = (x > marginX) && (x < w - marginX);

    if (!(withinMidBand && withinX)) return;

    // ----- we ARE on the "duration : 12:24" hotspot -----

    isEndScreen = false;

    // FULL reset: go back to MODE SELECT (PREVIEW vs CONCERT)
    status.modeChosen    = null;    // forget previous mode
    status.modeConfirmed = false;   // not confirmed
    status.running       = false;   // animation is stopped

    // (optional) reset tempo to preview default if that’s how you start:
    // status.msPerBeat = ctx.previewClock;

    // Redraw the MODE SELECT view
    prepareAndRenderBackground(ctx);
    renderStartLeader(ctx, {
      mode: status.msPerBeat === ctx.previewClock ? 'preview' : 'concert',
      msPerBeat: status.msPerBeat,
      modeChosen: status.modeChosen,      // now null → show both options
    });

    console.log('[mode] return to MODE SELECT from end screen');
  });
}
*/

/*
// Map browser event coords → ctx-space coords (same space as ctx.w/ctx.h/ctx.mid/ctx.l/ctx.r)
function eventToCtxPoint(ctx, canvas, ev) {
  const rect = canvas.getBoundingClientRect();

  const xCss = ev.clientX - rect.left;
  const yCss = ev.clientY - rect.top;

  const x = xCss * (ctx.w / rect.width);
  const y = yCss * (ctx.h / rect.height);

  return { x, y };
}
*/

/*
// Leader-only: tap PREVIEW / CONCERT labels to choose tempo.
// Does NOT leave the mode-select screen; it just updates the choice.
function installLeaderModeSelectHandler(ctx, canvas, status) {
  if (getRole() !== 'leader') return;

  const HIT_RADIUS = ctx.tapRadius ?? 50;

  canvas.addEventListener('click', (ev) => {
    // Only respond while we’re still in mode-select phase
    if (status.modeConfirmed) return;

    const { x, y } = eventToCtxPoint(ctx, canvas, ev);

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

// Leader-only: tap bottom text to confirm chosen mode and move to “start” view.
function installLeaderModeConfirmHandler(ctx, canvas, status) {
  if (getRole() !== 'leader') return;

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

    // Now we leave mode-select and move to "start view" on next render
    stepOnce();
  });
}

// Leader-only: double-tap near the digital clock to stop animation and
// return to a non-running state (start view).
function installLeaderStopHandler(ctx, canvas, status) {
  if (getRole() !== 'leader') return;

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

// BOTH leader & consort: single-tap the digital clock to start animation.
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

//
// App entrypoint
//
*/