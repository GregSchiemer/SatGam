// js/gui/henge.js

import { arrU } from './canvasUtils.js';
import { sequence } from './sequence.js';

// Accept radians or a fraction of a turn (0..1)
export function setArcStart(a) {
  return Math.abs(a) > 2 ? a : a * Math.PI * 2;
}

/** Deterministic slots: radial (sprocket) orientation; first phone at angleStart. */
// henge.js
export function makeHenge(spec = {}) {
  const { ctx } = arrU[0];
  const W = ctx.cssW ?? ctx.w ?? ctx.canvas.width;
  const H = ctx.cssH ?? ctx.h ?? ctx.canvas.height;

  const cx = ctx.mid?.x ?? (W / 2);
  const cy = ctx.mid?.y ?? (H / 2);

  const count      = spec.numberOf ?? 25;
  const angleStart = spec.angleStart ?? 0;
  const angleStep  = (Math.PI * 2) / count;
  const radius     = spec.arcRadius ?? Math.min(W, H) * 0.25;

  // NEW: explicit long/short controls (fractions of canvas)
  const phoneLongFrac  = spec.phoneLongFrac  ?? 0.11; // long side (radial)
  const phoneShortFrac = spec.phoneShortFrac ?? 0.14; // short side (tangential)

  // For a tall mobile canvas, tie long to W and short to H (looks nicer)
  const phoneW = Math.round(W * phoneLongFrac);  // long side (radial)
  const phoneH = Math.round(H * phoneShortFrac); // short side (tangential)

  const slots = new Array(count);
  for (let i = 0; i < count; i++) {
    const a = angleStart + i * angleStep;
    const x = cx + radius * Math.cos(a);
    const y = cy + radius * Math.sin(a);
	const angle = a + Math.PI / 2;  // ← +90° clockwise
    slots[i] = { x, y, w: phoneW, h: phoneH, angle };
  }
  return slots;
}

import { initPhoneAtlas, isPhoneAtlasReady } from './sprites.js';


export async function makeHengeN(ctx, numberOf, opts = {}) {
  const slots = makeHenge({
    numberOf,
    arcStart: setArcStart(opts.angleStart ?? ctx.pi2 / 6), // 3 o’clock default
    arcRadius: opts.arcRadius ?? Math.min(ctx.cssW ?? ctx.w, ctx.cssH ?? ctx.h) * 0.4,
    phoneLongFrac: opts.phoneLongFrac ?? 0.07,
    phoneShortFrac: opts.phoneShortFrac ?? 0.07,
  });
  const { w, h } = slots[0];
  if (!isPhoneAtlasReady()) await initPhoneAtlas({ w, h });
  return slots;
}

	
// Optional convenience wrappers (if you want legacy names)
export function henge5 (ctx, overrides = {}) { return makeHenge({ numberOf: 5,  ...overrides }); }
export function henge15(ctx, overrides = {}) { return makeHenge({ numberOf: 15, ...overrides }); }
export function henge25(ctx, overrides = {}) { return makeHenge({ numberOf: 25, ...overrides }); }


/**
 * Generate N slots evenly spaced on a circle, landscape-oriented tangent to the ring.
 * - numberOf: how many phones
 * - arcRadius: ring radius in CSS px (or auto from canvas size if omitted)
 * - angleStart: radians (first phone at 3 o'clock = 0; at top = -PI/2)
 * - hFactor,wFactor: scale factors (roughly pixels relative to canvas height/width)
 * - border: additional outer padding factor (kept for legacy parity, used lightly here)
 */

const FAMILIES = ['A','B','C','D','E'];

export function getHengeLayout25(overrides = {}) {
  const u = arrU[0] || {};
  const ctx = u.ctx || {};
  const cx  = (ctx.mid && ctx.mid.x) ? ctx.mid.x : (u.cssW ? u.cssW/2 : 195);
  const cy  = (ctx.mid && ctx.mid.y) ? ctx.mid.y : (u.cssH ? u.cssH/2 : 422);

  const radius = Number.isFinite(u.ringRadius) ? u.ringRadius
                 : Math.min(u.cssW || 390, u.cssH || 844) / 2 - 120;

  const rotateMode = overrides.rotate || u.hengeRotate || 'radial';

  // Phone size: prefer ctx.phoneW/H if set; else conservative defaults
  const w = overrides.w || ctx.phoneW || 78;
  const h = overrides.h || ctx.phoneH || 168;

  const count = overrides.count || 25; //25;
//  const angleStart = overrides.angleStart ?? (0.0);
  const angleStart = overrides.angleStart ?? (-Math.PI / 2);
  const direction  = overrides.direction  ?? 1;

  const slots = [];
  const step = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const theta = angleStart + direction * i * step;
    const px = cx + radius * Math.cos(theta);
    const py = cy + radius * Math.sin(theta);
    const x  = px - w/2;
    const y  = py - h/2;
    const family = FAMILIES[i % 5];

    let rot = 0;
    switch (rotateMode) {
      case 'tangent': rot = theta + Math.PI/2; break;
      case 'radial':  rot = theta;            break;
      case 'fixed':   rot = overrides.fixedAngle || 0; break;
      case 'none':
      default:        rot = 0;
    }
    slots.push({ id: i, x, y, w, h, family, rot });
  }
  return slots;
}

export function getHengeStateBits(stateIndex = 0) {
  const s5 = sequence[stateIndex % sequence.length];
  let mask = 0;
  for (let i = 0; i < 25; i++) {
    if (s5[i % 5]) mask |= (1 << i);
  }
  return mask;
}

// henge.js (TOP OF FILE — add this import)
//import { initPhoneAtlas, isPhoneAtlasReady } from './sprites.js';

// … your existing exports: makeHenge, setArcStart, etc.

// henge.js (ADD THIS FUNCTION near the bottom)
export async function makeHenge25(ctx) {
  const slots = makeHenge({
    numberOf: 25,
    arcStart: setArcStart(ctx.pi2 / 6), // start at 3 o’clock
    arcRadius: Math.min(ctx.cssW ?? ctx.w, ctx.cssH ?? ctx.h) * 0.4,
    phoneLongFrac: 0.07,
    phoneShortFrac: 0.07,
  });

  // Size the atlas to the first slot
  const { w, h } = slots[0];
  if (!isPhoneAtlasReady()) {
    await initPhoneAtlas({ w, h });
  }
  return slots;
}