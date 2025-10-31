// js/gui/uiControls.js
// All UI event listeners live here (buttons, selects, canvas/touch).

import { getSlots, arrU } from './canvasUtils.js';

//import { arrU } from './canvasUtils.js';
//import { startAnimation, stopAnimation, setMode, setStateIndex, getSlots } from './runTime.js';
//import { startAnimation, stopAnimation, setMode, getSlots } from './runTime.js';

//import { getSlots } from './runTime.js';

// ---- Public API -------------------------------------------------------------

/**
 * Bind UI controls to runtime + interaction.
 * Pass selectors OR elements. Everything optional—bind what exists on the page.
 */
export function bindUI({
  btnStart = '#btnStart',
  btnStop  = '#btnStop',
  selMode  = '#selMode',   // 'preview' | 'concert'
  selState = '#selState',  // 0..30
  canvasEl = '#mobile',    // interactive surface for 25 keys
} = {}) {
  const qs = (s) => (typeof s === 'string' ? document.querySelector(s) : s);

  const refs = {
    btnStart: qs(btnStart),
    btnStop:  qs(btnStop),
    selMode:  qs(selMode),
    selState: qs(selState),
    canvas:   qs(canvasEl),
  };

  // --- Controls → runtime
  refs.btnStart?.addEventListener('click', onStartClick);
  refs.btnStop?.addEventListener('click', onStopClick);
  refs.selState?.addEventListener('change', onStateChange);
  // Mode is read on start; if you want instant apply, listen to change:
  refs.selMode?.addEventListener('change', onModeChange);

  // --- Canvas → 25-key hit testing
  if (refs.canvas) {
    refs.canvas.addEventListener('pointerdown', onPointerDown);
    refs.canvas.addEventListener('pointerup', onPointerUp);
    refs.canvas.addEventListener('pointercancel', onPointerUp);
    refs.canvas.addEventListener('pointerleave', onPointerUp);
  }

  // Store refs in a neutral place (not on ctx)
  const u = arrU[0] || (arrU[0] = {});
  u.ui = refs;
  return refs;
}

/** Optional: remove listeners (useful when swapping UIs/pages) */
export function unbindUI() {
  const { ui } = arrU[0] || {};
  if (!ui) return;

  ui.btnStart?.removeEventListener('click', onStartClick);
  ui.btnStop?.removeEventListener('click', onStopClick);
  ui.selState?.removeEventListener('change', onStateChange);
  ui.selMode?.removeEventListener('change', onModeChange);

  if (ui.canvas) {
    ui.canvas.removeEventListener('pointerdown', onPointerDown);
    ui.canvas.removeEventListener('pointerup', onPointerUp);
    ui.canvas.removeEventListener('pointercancel', onPointerUp);
    ui.canvas.removeEventListener('pointerleave', onPointerUp);
  }
  delete (arrU[0].ui);
}

// ---- Handlers ---------------------------------------------------------------

function onStartClick() {
  const { ui } = arrU[0] || {};
  const mode = ui?.selMode?.value === 'concert' ? 'concert' : 'preview';
  setMode(mode);
  startAnimation();
}

function onStopClick() {
  stopAnimation();
}

function onModeChange(e) {
  // Optional: apply mode immediately
  const next = e?.target?.value === 'concert' ? 'concert' : 'preview';
  setMode(next);
}

function onStateChange(e) {
  const idx = Number(e?.target?.value) || 0;
  setStateIndex(idx);
}

// ---- 25-key hit testing -----------------------------------------------------

function onPointerDown(e) {
  const slot = pickSlotFromEvent(e);
  if (!slot) return;

  // Step 4/5 hooks go here later:
  // - background color change per selected key
  // - Csound trigger (noteOnSlot(slot))
}

function onPointerUp(e) {
  const slot = pickSlotFromEvent(e);
  if (!slot) return;

  // Step 5 hook:
  // - Csound release (noteOffSlot(slot))
}

function pickSlotFromEvent(e) {
  const { ui } = arrU[0] || {};
  const canvas = ui?.canvas;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  return hitTestSlot(getSlots(), x, y);
}

/** hit-test with rotation support (slot.rot) */
function hitTestSlot(slots, x, y) {
  if (!Array.isArray(slots)) return null;
  for (const s of slots) {
    const { w, h } = s;
    const cx = s.x + w / 2;
    const cy = s.y + h / 2;

    // transform point into slot's local space
    const dx = x - cx;
    const dy = y - cy;
    const rot = s.rot || 0;
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) {
      return s;
    }
  }
  return null;
}
