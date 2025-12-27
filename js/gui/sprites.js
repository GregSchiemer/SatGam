// sprites.js — phone sprites (active/inactive)
import { setLinearGradient, ColorFamily } from './color.js';
import { drawPhonePath } from './canvasUtils.js';
import { arrPane, arrF, getSlots } from './canvasUtils.js';
import { saveCanvasAsPNG } from './debugSprites.js'; 

let _atlasReady = false;

export async function initPhoneAtlas({ w, h }) {
  if (_atlasReady) return;
  await buildPhoneAtlas({ w, h }); // your existing function
  _atlasReady = true;
}

export function isPhoneAtlasReady() { return _atlasReady; }

async function makePhoneSprite({
  w, h, family, state,
  activeOutlineAlpha = 0.35,
  inactiveOutlineAlpha = 0.08,
  hairlineAt1x = 1
}) {
  const dpr = window.devicePixelRatio || 1;

  const off = document.createElement('canvas');
  off.width  = Math.ceil(w * dpr);
  off.height = Math.ceil(h * dpr);

  const ctx = off.getContext('2d');

  // Clear in DEVICE pixels, then draw in CSS/design units
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, off.width, off.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // radius in pixels (you were passing a ratio before)
  const rPx = Math.min(w, h) * 0.065;

  // IMPORTANT: correct signature
  drawPhonePath(ctx, { x: 0, y: 0, w, h, r: rPx });

  if (state === 'active') {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    setLinearGradient(family, g);
    ctx.fillStyle = g;
    ctx.fill();
  }

  const hairlineCssPx = Math.max(hairlineAt1x / dpr, 0.5 / dpr);
  ctx.lineWidth = hairlineCssPx;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = (state === 'active')
    ? `rgba(0,0,0,${activeOutlineAlpha})`
    : `rgba(255,255,255,${inactiveOutlineAlpha})`;
  ctx.stroke();

  if (state === 'active') {
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = `rgba(0,0,0,${activeOutlineAlpha * 0.35})`;

    // IMPORTANT: correct signature again
    drawPhonePath(ctx, { x: 0, y: 0, w, h, r: rPx });

    // “shadow-only” stroke trick (stroke itself transparent)
    ctx.strokeStyle = 'rgba(0,0,0,0)';
    ctx.stroke();
    ctx.restore();
  }

  return await createImageBitmap(off);
}


const atlas = { active: {}, inactive: {} };
let atlasSize = { w: 0, h: 0 };

export async function buildPhoneAtlas({ w, h }) {
  atlasSize = { w, h };
  const families = [ColorFamily.YELLOW, ColorFamily.RED, ColorFamily.GREEN, ColorFamily.BLUE, ColorFamily.MAGENTA];

console.log('[sprites] buildPhoneAtlas start', { w, h });

  await Promise.all(families.flatMap(fam => ([
    makePhoneSprite({ w, h, family: fam, state: 'active' }).then(b => { atlas.active[fam] = b; }),
    makePhoneSprite({ w, h, family: fam, state: 'inactive' }).then(b => { atlas.inactive[fam] = b; }),
  ])));

   console.log('[sprites] buildPhoneAtlas done', {
    atlasSize,
    activeFamilies: Object.keys(atlas.active),
    inactiveFamilies: Object.keys(atlas.inactive),
  });

}

export function getPhoneSprite(family, isActive) {
  return (isActive ? atlas.active[family] : atlas.inactive[family]) || null;
}

export function getPhoneAtlasSize() {
  return atlasSize;
}

export function familyForIndex(i) {
  const color = [ColorFamily.YELLOW, ColorFamily.RED, ColorFamily.GREEN, ColorFamily.BLUE, ColorFamily.MAGENTA];
  return color[i % color.length];
}
 
 // sprites.js
// sprites.js

const ORIENT_BIAS = Math.PI / 2; 
// ^ makes the 12 o’clock phone stay upright if your top slot angle is -Math.PI/2.
// If you ever want phones tangent to the ring instead, use: Math.PI

export function drawPhoneAt(ctx, { x, y, w, h, family, active = true, shadow = true, angle = 0 }) {
  const img = getPhoneSprite(family, active);
  if (!img) {
    console.warn('[drawPhoneAt] missing sprite for family', family, 'active', active);
    return;
  }

  ctx.save();
  ctx.translate(x, y);

  // Swivel around the ring
  ctx.rotate((angle ?? 0) + ORIENT_BIAS);

  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
  }

  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}


// Put this AFTER the functions above (or ensure the above are function declarations)
export async function ensurePhoneAtlasForSlots(slots, fallbackSize = { w: 44, h: 96 }) {
  const baseSize = (Array.isArray(slots) && slots.length > 0)
    ? { w: Math.round(slots[0].w), h: Math.round(slots[0].h) }
    : fallbackSize;

  // Optional init hook if your codebase uses it
  if (typeof initPhoneAtlas === 'function') {
    await initPhoneAtlas(baseSize);
  }

  // Rebuild if not ready or size mismatch
  const sz = (typeof getPhoneAtlasSize === 'function') ? getPhoneAtlasSize() : null;
  if (!isPhoneAtlasReady() || !sz || sz.w !== baseSize.w || sz.h !== baseSize.h) {
    await buildPhoneAtlas(baseSize);
  }
}


// sprites.js
export function radializeSlots(ctx, baseSlots) {
  const cx = ctx.mid.x;
  const cy = ctx.mid.y;

  if (!Array.isArray(baseSlots) || baseSlots.length === 0) return [];

  // Match your atlas dimensions (from buildPhoneAtlas log)
  const DEFAULT_W = 31;
  const DEFAULT_H = 55;

  const out = baseSlots.map((s, idx) => {
    const angle =
      Number.isFinite(s.angle)
        ? s.angle
        : (ctx.pi2 || (2 * Math.PI)) * (idx / baseSlots.length) - Math.PI / 2;

    const radial =
      (Number.isFinite(s.arcRadius) && s.arcRadius) ||
      (Number.isFinite(s.radius) && s.radius) ||
      (Number.isFinite(s.r) && s.r) ||
      Math.min(ctx.w, ctx.h) * 0.33;

    const x = cx + Math.cos(angle) * radial;
    const y = cy + Math.sin(angle) * radial;

    const w = Number.isFinite(s.w) ? s.w : DEFAULT_W;
    const h = Number.isFinite(s.h) ? s.h : DEFAULT_H;

    return { ...s, cx, cy, angle, radial, x, y, w, h };
  });

  return out;
}

export function downloadFamilyRingPNG({
  family = null,              // if null, uses familyForIndex(0)
  active = true,
  filename = 'family-ring.png',
} = {}) {
  const ctxRef    = arrF[0]?.ctx;   // stamped geometry lives here
  const baseSlots = getSlots();

  if (!ctxRef || !baseSlots?.length) {
    console.warn('[downloadFamilyRingPNG] missing ctxRef or slots', {
      hasCtxRef: !!ctxRef,
      baseLen: baseSlots?.length ?? 0,
    });
    return;
  }

  const slots = radializeSlots(ctxRef, baseSlots);
  const targetFamily = (family == null) ? familyForIndex(0) : family;

  // Offscreen canvas in DESIGN units
  const off = document.createElement('canvas');
  off.width  = ctxRef.w;
  off.height = ctxRef.h;

  const octx = off.getContext('2d');
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, off.width, off.height);

  // Draw ring for that family
  let drawnIntended = 0;

  for (let i = 0; i < slots.length; i++) {
    if (familyForIndex(i) !== targetFamily) continue;

    drawnIntended++;
    drawPhoneAt(octx, {
      ...slots[i],
      angle: slots[i].angle ?? 0,   // ensure swivel (if your drawPhoneAt uses angle)
      family: targetFamily,
      active,
      shadow: false,
    });
  }

  console.log('[downloadFamilyRingPNG] ring', {
    targetFamily,
    active,
    drawnIntended,
  });

// temporarily disable download
//  saveCanvasAsPNG(off, filename);
}
