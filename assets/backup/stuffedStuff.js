

/*
  // 9) Build a minimal renderer that draws a static henge.
  //    Faux clock is in *seconds* in your runtime; only used here if you want time-varying masks.
  setRender((fauxClock) => {
    renderSavedBackground(ctx);

    const arr = getSlots();
    if (!arr?.length || !isPhoneAtlasReady()) return;

    // Optional: time-varying mask; if your getFamilyMask expects ms, convert: Math.round(fauxClock * 1000)
    const mask = (typeof getFamilyMask === 'function') ? getFamilyMask(fauxClock) : null;

    for (let i = 0; i < arr.length; i++) {
      const slot = arr[i];
      const family = familyForIndex(i);      // sprites.js API: family by index
      const active = mask ? !!mask[i] : true; // if you use masks for dimming/highlighting

      // sprites.js API: embed family/active into the slot object
      drawPhoneAt(ctx, { ...slot, family, active });
    }

    // You can layer overlays here if needed, e.g.:
    // renderRunning({ ... }) or renderStartBoth({ ... })
  });

*/


  // ─────────────────────────────────────────────────────────────────────────────
  // PREVIOUS (WORKING) INTERACTIVE/ANIMATED CODE — DISABLED FOR STATIC RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  /*
  // Shared state object the renderer will read each frame
  const state = {
    running:   false,            // freeze pre-frame until we start
    PRE_INDEX: 19,               // stateIndex displays all sprites
    startWall: 0,
    msPerBeat: ctx.playRate      // default from initCanvas (concert)
  };

  // Build the renderer once and register it with the runtime
  const frame = makeWallClockRenderer({
    ctx,
    slots,
    role,
    f,
    TOTAL_STATES: 31,
    STATE_DUR_S EC: 24,
    state,
    prepareAndRenderBackground,
    getFamilyMask,
    familyForIndex,
    // FamilyIndex,            // re-enable if your frame uses it
    drawPhoneAt,
    renderStartBoth,
    renderRunning,
    renderEnd,
  });

  setRender(frame);
  */

  /*
  // Click-to-start handler (disabled in static render mode because 'state' is commented out)
  canvas.addEventListener('click', () => {
    const mode = (role === 'leader') ? 'preview' : 'concert';
    state.msPerBeat = (mode === 'preview') ? ctx.previewClock : ctx.concertClock;
    state.running = true;
    state.startWall = performance.now();
    setMode(mode);
    startAnimation();
  });
  */

  /*
  // Optional UI hooks (disabled for static render because PRE_INDEX/stateIndex are not active)
  bindUI({
    ctx,
    slots,
    role,
    getState: () => PRE_INDEX,
    setState: (v) => {
      PRE_INDEX = v;
      stateIndex = v; // keep legacy var in sync if other code reads it
      requestAnimationFrame(() => stepOnce());
    },
    onStep: () => stepOnce(),
  });
  */
