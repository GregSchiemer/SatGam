// js/gui/statePreview.js
// Static preview for any of the 31 states with evenly spaced phones.
// - N = 5 * (hamming weight of the chosen state)
// - Colors cycle only through the active families
//
// Usage:
//   1) Add a tiny test HTML (see below) that imports this module
//   2) Open: /test-states.html?state=1  (Left/Right arrows to change state)

import {
  initCanvas,
  prepareAndRenderBackground,
  renderSavedBackground,
  setSlots,
  getSlots,
} from './canvasUtils.js';

import {
  ensurePhoneAtlasForSlots,
  drawPhoneAt,
  familyForIndex,     // we'll reuse your existing family mapper
} from './sprites.js';

import { makeHengeOf } from './henge.js';
import { sequence } from './sequence.js';
import { setRender, stepOnce } from './runTime.js';

// ---------- Public entry ----------
export async function initStatePreview() {
  const { ctx } = initCanvas('mobile');

  // Neutral background cache once
  prepareAndRenderBackground(0);

  // Pick initial state from query (?state=1..31), default 1
  let stateNum = clampInt(
    Number(new URLSearchParams(location.search).get('state')) || 1,
    1, sequence.length
  );

  await renderStateOnce(ctx, stateNum);

  // Left/Right arrow to cycle states
  window.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowRight') {
      stateNum = (stateNum % sequence.length) + 1;
      await renderStateOnce(ctx, stateNum);
    } else if (e.key === 'ArrowLeft') {
      stateNum = (stateNum - 2 + sequence.length) % sequence.length + 1;
      await renderStateOnce(ctx, stateNum);
    }
  });

  // Keep background correct on resize; re-render current state
  window.addEventListener('resize', async () => {
    prepareAndRenderBackground(0);
    await renderStateOnce(ctx, stateNum);
  });
}

// ---------- Internals ----------

async function renderStateOnce(ctx, stateNum) {
  const bits = sequence[(stateNum - 1) % sequence.length]; // 5-bit array
  const activeRemainders = []; // which families are ON, in 0..4 order
  for (let j = 0; j < bits.length; j++) if (bits[j]) activeRemainders.push(j);
  const k = activeRemainders.length;

  // If the state has no active families, just paint background
  if (k === 0) {
    setSlots([]);
    setRender(() => renderSavedBackground(ctx));
    stepOnce();
    console.log(`[STATE] ${stateNum}: k=0 (no phones)`);
    return;
  }

  const N = k * 5;            // evenly spaced phones for this state
  
  const dpr = window.devicePixelRatio || 1;
  const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
  const cx = W/2, cy = H/2;

  const slots = makeHengeOf(ctx, N).map(s => ({
    ...s,
   // Force radial-out regardless of henge.js orientation
    angle: Math.atan2(s.y - cy, s.x - cx)// + Math.PI/2
   // Force radial-out regardless of henge.js orientation
//    angle: Math.atan2(s.y - cy, s.x - cx) + Math.PI/2
  }));
  setSlots(slots);
  
//  const slots = makeHengeOf(ctx, N);  // radial, center-anchored, baked in your henge.js
//  setSlots(slots);

  // Make sure the atlas matches the slot size
  await ensurePhoneAtlasForSlots(slots);

  // Build renderer: background, then N phones colored only by active families
  setRender(() => {
    renderSavedBackground(ctx);

    const arr = getSlots();
    for (let s = 0; s < arr.length; s++) {
      // Tricky but robust: reuse your existing familyForIndex(i)
      // by creating a "fake index" whose i % 5 equals one of the active families.
      // This avoids importing ColorFamily or changing sprites.js.
      const fakeI = s * 5 + activeRemainders[s % k]; // keeps only active families
      const fam   = familyForIndex(fakeI);

      drawPhoneAt(ctx, { ...arr[s], family: fam, active: true, shadow: true });
    }
  });

  stepOnce();
  console.log(`[STATE] ${stateNum}: k=${k}, N=${N}, active=${activeRemainders.join(',')}`);
}

function clampInt(v, lo, hi) {
  v = Math.floor(v);
  return Math.max(lo, Math.min(hi, v));
}
