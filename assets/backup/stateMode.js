// js/gui/stateMode.js
// Static "state mode": render any 5-bit state with evenly spaced, radial-out phones.
// - N = 5 * (number of ON families)
// - Colors cycle only through the ON families
// - No changes to core modules required

import { makeHengeOf } from './henge.js';
import { renderSavedBackground, setSlots, getSlots } from './canvasUtils.js';
import { ensurePhoneAtlasForSlots, drawPhoneAt, familyForIndex } from './sprites.js';
import { setRender, stepOnce } from './runTime.js';
import { sequence } from './sequence.js';

/** Return indices (0..4) of families that are ON in a 5-bit array like [1,0,1,0,1]. */
export function activeFamilies(bits) {
  const on = [];
  for (let i = 0; i < 5; i++) if (bits[i]) on.push(i);
  return on;
}


export function radializeSlots(ctx, slots) {
//  const dpr = window.devicePixelRatio || 1;
//  const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
//  const cx = W / 2, cy = H / 2;

//  const cx = ctx.w / 2, cy = ctx.h / 2;
  const cx = slots.w / 2, cy = slots.h / 2;  
  // Bias to account for sprite baseline being portrait/vertical at angle=0.
  // If this points inward instead of outward, flip the sign.
  const SPRITE_BASELINE_BIAS = Math.PI / 2;

  return slots.map(s => {
    const radial = Math.atan2(s.y - cy, s.x - cx); // true radial direction
    return {
      ...s,
      angle: radial + SPRITE_BASELINE_BIAS
    };
  });
}


/**
 * Build evenly spaced slots for a given 5-bit state:
 * N = 5 * popcount(bits), radial-out baked locally.
 * Stores into global slots and returns the array.
 */
export function buildEvenStateSlots(ctx, bits) {
  const actives = activeFamilies(bits);
  const k = actives.length;
  if (k === 0) { setSlots([]); return []; }

  const N = k * 5;
  const raw = makeHengeOf(ctx, N);          // geometry (center coords, any orientation)
  const slots = radializeSlots(ctx, raw);   // ensure radial-out for preview path
  setSlots(slots);
  return slots;
}

/**
 * Render a single static state by its 1-based index (1..sequence.length).
 * Expects background to have been prepared already in main.js; this just paints the saved bg.
 */
export async function renderStateByNumber(ctx, stateNum) {
  const idx = Math.max(1, Math.min(sequence.length, stateNum|0)) - 1;
  const bits = sequence[idx];
  await renderStateStatic(ctx, bits);
}

/**
 * Core renderer for a 5-bit state array.
 * Uses `slotIdx` as the ON-family selector token fed to `familyForIndex`:
 *   slotIdx = ringSlotIndex * 5 + activeFamilies[ ringSlotIndex % k ]
 * Note: here `slotIdx` is NOT the ring slot position; it’s the selector token by request.
 */
 
export async function renderStateStatic(ctx, bits) {
  const actives = activeFamilies(bits);
  const k = actives.length;

  // No phones for this state
  if (k === 0) {
    setSlots([]);
    setRender(() => renderSavedBackground(ctx));
    stepOnce();
    return;
  }

  const slots = buildEvenStateSlots(ctx, bits);
  await ensurePhoneAtlasForSlots(slots);

  setRender(() => {
    renderSavedBackground(ctx);

    const arr = getSlots();
    for (let s = 0; s < arr.length; s++) {
      const slotIdx = s * 5 + actives[s % k]; // ON-family selector
      const fam = familyForIndex(slotIdx);
      drawPhoneAt(ctx, { ...arr[s], family: fam, active: true, shadow: true });
    }
  });

  stepOnce();
}

/**
 * Optional convenience: if the URL contains ?state=K, render that state and return true.
 * Otherwise return false so caller can proceed with normal consort flow.
 */
export async function runStateModeFromQuery(ctx) {
  const p = new URLSearchParams(location.search);
  const val = p.get('state');
  if (!val) return false;

  await renderStateByNumber(ctx, Number(val) || 1);

  // Re-render same state on resize (caller should also refresh background on resize)
  const stateNum = Math.max(1, Math.min(sequence.length, Number(val) || 1));
  window.addEventListener('resize', async () => {
    await renderStateByNumber(ctx, stateNum);
  });

  return true;
}
