// js/gui/blitHenge.js

// blitHenge.js — blit-only rendering
import { arrU } from './canvasUtils.js';
import * as Henge from './henge.js';
import { getPhoneSprite, getPhoneAtlasSize, buildPhoneAtlas } from './sprites.js';
import { drawPhonePath } from './canvasUtils.js';

//import { getPhoneSprite, getPhoneAtlasSize } from './sprites.js';


//import { ensureCircleSprites, getCircleSprites } from './rosette/circleSprites.js';

// Note: ColorFamily / setLinearGradient no longer needed here.

/* -----------------------------------------------------
   Read phone sprite dimensions from your generated spec
   (henge25(ctx) -> hGen(spec) -> arrA[0].H has width/height/etc.)
----------------------------------------------------- */
function getHengeSpec() {
  const H = Henge.arrA?.[0]?.H;
  if (H) {
    const w = Number.isFinite(H.width)  ? H.width  : 28;
    const h = Number.isFinite(H.height) ? H.height : 56;
    const corner = Number.isFinite(H.corner) ? H.corner : Math.min(w, h) * 0.2;
    // H.border is proportional in your code; scale to pixels for stroke feel
    const border = Number.isFinite(H.border) ? H.border * 4.0 : 1.5;
    return { w, h, corner, border };
  }
  return { w: 28, h: 56, corner: 6, border: 1.5 };
}

/* -----------------------------------------------------
   Geometry adapter — return nodes: [{x,y,r,theta}, ...]
   Handles your current shapes + legacy variants
----------------------------------------------------- */
function getNodesFromHenge() {
  // Case 0: arrA is a single wrapper object with geometry inside
  if (Array.isArray(Henge.arrA) && Henge.arrA.length === 1 && typeof Henge.arrA[0] === 'object') {
    const w = Henge.arrA[0];

    // 0a) Preferred: already structured nodes
    if (Array.isArray(w.nodes) && w.nodes.length) {
      return w.nodes.map(n => ({
        x: n.x,
        y: n.y,
        r: n.r ?? (arrU[0]?.ctx?.tapRadius || 12),
        theta: (typeof n.theta === 'number') ? n.theta : 0,
      }));
    }

    // 0b) Legacy arrays X/Y (+ optional R) directly on wrapper
    if (Array.isArray(w.X) && Array.isArray(w.Y)) {
      const X = w.X, Y = w.Y, R = Array.isArray(w.R) ? w.R : [];
      const r = (arrU[0]?.ctx?.tapRadius || 12);
      const n = Math.min(X.length, Y.length);
      const out = new Array(n);
      for (let i = 0; i < n; i++) {
        out[i] = { x: X[i], y: Y[i], r, theta: (typeof R[i] === 'number') ? R[i] : 0 };
      }
      return out;
    }

    // 0c) Packed all7 = [X,Y,R,X1,Y1,X2,Y2] directly on wrapper
    if (Array.isArray(w.all7) && w.all7.length >= 2 && Array.isArray(w.all7[0]) && Array.isArray(w.all7[1])) {
      const X = w.all7[0], Y = w.all7[1], R = Array.isArray(w.all7[2]) ? w.all7[2] : [];
      const r = (arrU[0]?.ctx?.tapRadius || 12);
      const n = Math.min(X.length, Y.length);
      const out = new Array(n);
      for (let i = 0; i < n; i++) {
        out[i] = { x: X[i], y: Y[i], r, theta: (typeof R[i] === 'number') ? R[i] : 0 };
      }
      return out;
    }

    // 0d) Wrapper has H with arrs = [X,Y,R,X1,Y1,X2,Y2]  ← your current shape
    if (w.H && Array.isArray(w.H.arrs) && w.H.arrs.length >= 2
        && Array.isArray(w.H.arrs[0]) && Array.isArray(w.H.arrs[1])) {
      const X = w.H.arrs[0];
      const Y = w.H.arrs[1];
      const R = Array.isArray(w.H.arrs[2]) ? w.H.arrs[2] : [];
      const r = Number.isFinite(w.H.width) ? (w.H.width / 2) : (arrU[0]?.ctx?.tapRadius || 12);
      const n = Math.min(X.length, Y.length);
      const out = new Array(n);
      for (let i = 0; i < n; i++) {
        out[i] = { x: X[i], y: Y[i], r, theta: (typeof R[i] === 'number') ? R[i] : 0 };
      }
      return out;
    }
  }

  // Case 1: preferred flat shape (array of node objects)
  if (Array.isArray(Henge.arrA) && Henge.arrA.length && typeof Henge.arrA[0] === 'object' && 'x' in Henge.arrA[0]) {
    return Henge.arrA.map(n => ({
      x: n.x,
      y: n.y,
      r: n.r ?? (arrU[0]?.ctx?.tapRadius || 12),
      theta: (typeof n.theta === 'number') ? n.theta : 0,
    }));
  }

  // Case 2: legacy top-level arrays X/Y/R (if exported that way)
  const X = Array.isArray(Henge.X) ? Henge.X : undefined;
  const Y = Array.isArray(Henge.Y) ? Henge.Y : undefined;
  if (X && Y) {
    const R = Array.isArray(Henge.R) ? Henge.R : [];
    const r = (arrU[0]?.ctx?.tapRadius || 12);
    const n = Math.min(X.length, Y.length);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = { x: X[i], y: Y[i], r, theta: (typeof R[i] === 'number') ? R[i] : 0 };
    }
    return out;
  }

  // Case 3: arrK = [max, radius, X[], Y[]]
  if (Array.isArray(Henge.arrK) && Henge.arrK.length >= 4
      && Array.isArray(Henge.arrK[2]) && Array.isArray(Henge.arrK[3])) {
    const max = Henge.arrK[0];
    const r0  = Henge.arrK[1];
    const Xk  = Henge.arrK[2];
    const Yk  = Henge.arrK[3];
    const n   = Math.min(max ?? Xk.length, Xk.length, Yk.length);
    const r   = Number.isFinite(r0) ? r0 : (arrU[0]?.ctx?.tapRadius || 12);
    const outK = new Array(n);
    for (let i = 0; i < n; i++) outK[i] = { x: Xk[i], y: Yk[i], r, theta: 0 };
    return outK;
  }

  // Fallback: nothing
  return [];
}
// Build phone atlas once (call from init)
export async function ensurePhoneSprites({ w, h }) {
  await buildPhoneAtlas({ w, h });
}



export function blitPhone(ctx, x, y, family, isActive) {
  const bmp = getPhoneSprite(family, isActive);
  if (!bmp) return;
  const { w, h } = getPhoneAtlasSize();
  ctx.drawImage(bmp, Math.round(x), Math.round(y), w, h);
}

/*
// LEGACY - Generic state-driven henge draw
export function drawHengeState(ctx, slots, stateBits, isActiveFn) {

  if (!Array.isArray(slots) || !slots.length) {
    console.error('[drawHengeState] slots invalid:', slots);
    return;
  }

  for (const slot of slots) {
    const active = isActiveFn ? isActiveFn(slot, stateBits) : true;
    const bmp = getPhoneSprite(slot.family, active);
    if (!active && !bmp) continue; // if you opt to truly skip inactive
    blitPhone(ctx, slot.x, slot.y, slot.family, active);
  }
}
*/
// DEBUG -  Generic state-driven henge draw
export function drawHengeState(ctx, slots, stateBits, isActiveFn) {
  if (!Array.isArray(slots) || !slots.length) {
    console.error('[drawHengeState] slots invalid:', slots);
    return;
  }
  for (const slot of slots) {
    const active = isActiveFn ? isActiveFn(slot, stateBits) : true;
    blitPhone(ctx, slot.x, slot.y, slot.family, active);
  }
}

/*
// LEGACY - Phone-only wrapper (if you still want the old name)
export function drawHengePhones(ctx, slots, stateBits, isActiveFn) {
  drawHengeState(ctx, slots, stateBits, isActiveFn);
}
*/

// DEBUG - above but with drawHengeState returned
export function drawHengePhones(ctx, slots, stateBits, isActiveFn) {
  return drawHengeState(ctx, slots, stateBits, isActiveFn);
}

// Optional: faint “ghost” outlines after stop
export function drawSlotsLayer(ctx, slots, alpha = 0.05) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1 / dpr, 0.5 / dpr);
  ctx.strokeStyle = 'white';
  for (const s of slots) {
    ctx.strokeRect(Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h));
    // If you prefer the real phone outline:
    // ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y));
    // drawPhonePath(ctx, s.w, s.h, 0.065); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}


/* -----------------------------------------------------
   Phone sprites (inactive/active per color family)
----------------------------------------------------- */

function getPhoneSprites(family = ColorFamily.NONE) {
  const { w, h } = getHengeSpec();
  const keyBase = `${family}:phone:${w}x${h}`;
  return {
    inactive: phoneSpriteCache.get(`${keyBase}:inactive`),
    active:   phoneSpriteCache.get(`${keyBase}:active`),
  };
}

/* -----------------------------------------------------
   Public draw APIs
----------------------------------------------------- */
/*
// Circles (legacy look), with optional isActiveFn
export function ensureNodeSprites(family = ColorFamily.NONE) {
  ensureCircleSprites(family);
}
*/

// Bonzai phones (rotated toward centre), with optional isActiveFn
export function ensurePhoneSpritesWrapper(family = ColorFamily.NONE) {
  ensurePhoneSprites(family);
}
