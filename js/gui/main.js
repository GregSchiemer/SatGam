// js/gui/main.js

import { initCanvas, prepareAndRenderBackground, renderSavedBackground } from './canvasUtils.js';
import { renderStartBoth, renderRunning, renderStartLeader, renderEnd } from './text.js';
import { setRender, stepOnce, setMode, makeWallClockRenderer } from './runTime.js';
import { startAnimation, stopAnimation } from './animation.js';
import { drawPhoneAt, familyForIndex } from './sprites.js';
import { makeHenge25 } from './henge.js';
import { FamilyIndex } from './color.js';
import { getFamilyMask } from './sequence.js';
import { bindUI } from './uiControls.js';

export async function initApp() {
  console.log('✅ GUI initialised');

  // 1) Canvas / ctx
  const { ctx, canvas } = initCanvas('mobile');

  // 2+3) ONE LINER: build 25-phone henge and size atlas
  const slots = await makeHenge25(ctx);

  // 4) Role + initial state (legacy pre-frame)
  const role = window.location.pathname.includes('leader') ? 'leader' : 'consort';

  // 5) Prepare legacy-style background once
  const f = 0; // 0 = neutral, 1..5 = family colours
  prepareAndRenderBackground(f);

  // Keep background correct on resize
  window.addEventListener('resize', () => {
    prepareAndRenderBackground(f);
    requestAnimationFrame(() => stepOnce()); // repaint one frame after resize
  });

  // --- Minimal animation glue (beat-free, wall-clock timing) ---

  // Shared state object the renderer will read each frame
  const state = {
    running:   false,			// freeze pre-frame until we start
    PRE_INDEX: 19, 				// stateIndex displays all sprites	
    startWall: 0,
    msPerBeat: ctx.playRate	// default from initCanvas (concert)
  };

  // Build the renderer once and register it with the runtime
  const frame = makeWallClockRenderer({
    ctx,
    slots,
    role,
    f,
    TOTAL_STATES: 31,
    STATE_DUR_SEC: 24,
    state,
    prepareAndRenderBackground,
    getFamilyMask,
    familyForIndex,
    FamilyIndex,
    drawPhoneAt,
    renderStartBoth,
    renderRunning,
    renderEnd,
  });

  setRender(frame);

  // Paint PRE_INDEX frame
  stepOnce();


canvas.addEventListener('click', () => {
  const mode = (role === 'leader') ? 'preview' : 'concert';
  state.msPerBeat = (mode === 'preview') ? ctx.previewClock : ctx.concertClock;
  state.running = true;
  state.startWall = performance.now();
  setMode(mode);
  startAnimation();
});

  // 8) Optional UI hooks (allow pre-start state selection)
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
}

// Boot after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => console.error('[main] init failed:', err));
});
