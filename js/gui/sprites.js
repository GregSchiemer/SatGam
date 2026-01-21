// sprites.js — phone sprites (active/inactive)
import { setLinearGradient, ColorFamily } from './color.js';
import { 
  arrF, 
  getSlots, 
  radializeSlots, 
  drawPhonePath,
} from './canvasUtils.js';

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

  // radius in pixels
  const rPx = Math.min(w, h) * 0.195; //* 0.065; initial version

  // IMPORTANT: correct signature
  
  drawPhonePath(ctx, { x: 0, y: 0, w, h, r: rPx });

  const hairlineCssPx = Math.max(hairlineAt1x / dpr, 0.5 / dpr);
  ctx.lineWidth = hairlineCssPx;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = (state === 'active')
    ? `rgba(0,0,0,${activeOutlineAlpha})`
    : `rgba(255,255,255,${inactiveOutlineAlpha})`;
  ctx.stroke();

  if (state === 'active') {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    setLinearGradient(family, g);
    ctx.fillStyle = g;
    ctx.fill();
  }

  if (state === 'active') {
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = `rgba(0,0,0,${activeOutlineAlpha * 0.35})`;

    // IMPORTANT: correct signature again
//    drawPhonePath(ctx, { x: 0, y: 0, w, h, r: rPx });

    // “shadow-only” stroke trick (stroke itself transparent)
    ctx.strokeStyle = 'rgba(0,0,0,0)';
    ctx.stroke();
    ctx.restore();
  }

  if (state === 'inactive') {
  // outline only
    ctx.lineWidth = 1.25; // a bit stronger than 1 for visibility
    ctx.strokeStyle = 'rgba(220,220,220,0.50)'; // neutral outline
    ctx.stroke();
}
  return await createImageBitmap(off);
}

const atlas = { active: {}, inactive: {} };
let phoneSpriteSize = { w: 0, h: 0 };

export async function buildPhoneAtlas({ w, h }) {
  phoneSpriteSize = { w, h };
  const families = [ColorFamily.YELLOW, ColorFamily.RED, ColorFamily.GREEN, ColorFamily.BLUE, ColorFamily.MAGENTA];

console.log('[sprites] buildPhoneAtlas start', { w, h });

  await Promise.all(families.flatMap(fam => ([
    makePhoneSprite({ w, h, family: fam, state: 'active' }).then(b => { atlas.active[fam] = b; }),
    makePhoneSprite({ w, h, family: fam, state: 'inactive' }).then(b => { atlas.inactive[fam] = b; }),
  ])));

   console.log('[sprites] buildPhoneAtlas done', {
    phoneSpriteSize,
    activeFamilies: Object.keys(atlas.active),
    inactiveFamilies: Object.keys(atlas.inactive),
  });

}

export function getPhoneSprite(family, isActive) {
  return (isActive ? atlas.active[family] : atlas.inactive[family]) || null;
}

export function getPhoneAtlasSize() {
  return phoneSpriteSize;
}

export function familyForIndex(i) {
  const color = [ColorFamily.YELLOW, ColorFamily.RED, ColorFamily.GREEN, ColorFamily.BLUE, ColorFamily.MAGENTA];
  return color[i % color.length];
}
 
export function drawPhoneAt(ctx, { x, y, w, h, family, active = true, shadow = true, angle = 0 }) {
  const img = getPhoneSprite(family, active);
  if (!img) {
    console.warn('[drawPhoneAt] missing sprite for family', family, 'active', active);
    return;
  }

  ctx.save();
  ctx.translate(x, y);

  // Swivel around the ring
  ctx.rotate(angle ?? 0);

  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
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
