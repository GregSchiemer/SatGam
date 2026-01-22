// sprites.js — phone sprites (active/inactive)
import { setLinearGradient, ColorFamily } from './color.js';
import { 
  arrP, 
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

  const cnvS = document.createElement('canvas');
  cnvS.width  = Math.ceil(w * dpr);
  cnvS.height = Math.ceil(h * dpr);

  const ctxS = cnvS.getContext('2d');

  // Clear in DEVICE pixels, then draw in CSS/design units
  ctxS.setTransform(1, 0, 0, 1, 0, 0);
  ctxS.clearRect(0, 0, cnvS.width, cnvS.height);
  ctxS.setTransform(dpr, 0, 0, dpr, 0, 0);

  // radius in pixels
  const rPx = Math.min(w, h) * 0.195; //* 0.065; initial version

  // IMPORTANT: correct signature
  
  drawPhonePath(ctxS, { x: 0, y: 0, w, h, r: rPx });

  const hairlineCssPx = Math.max(hairlineAt1x / dpr, 0.5 / dpr);
  ctxS.lineWidth = hairlineCssPx;
  ctxS.lineJoin = 'round';
  ctxS.lineCap = 'round';
  ctxS.strokeStyle = (state === 'active')
    ? `rgba(0,0,0,${activeOutlineAlpha})`
    : `rgba(255,255,255,${inactiveOutlineAlpha})`;
  ctxS.stroke();

  if (state === 'active') {
    const g = ctxS.createLinearGradient(0, h, 0, 0);
    setLinearGradient(family, g);
    ctxS.fillStyle = g;
    ctxS.fill();
  }

  if (state === 'active') {
    ctxS.save();
    ctxS.shadowBlur = 6;
    ctxS.shadowColor = `rgba(0,0,0,${activeOutlineAlpha * 0.35})`;

    // IMPORTANT: correct signature again
    drawPhonePath(ctxS, { x: 0, y: 0, w, h, r: rPx });

    // “shadow-only” stroke trick (stroke itself transparent)
    ctxS.strokeStyle = 'rgba(0,0,0,0)';
    ctxS.stroke();
    ctxS.restore();
  }

  if (state === 'inactive') {
  // outline only
    ctxS.lineWidth = 1.25; // a bit stronger than 1 for visibility
    ctxS.strokeStyle = 'rgba(220,220,220,0.50)'; // neutral outline
    ctxS.stroke();
}
  return await createImageBitmap(cnvS);
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
 
export function drawPhoneAt(ctxS, { x, y, w, h, family, active = true, shadow = true, angle = 0 }) {
  const img = getPhoneSprite(family, active);
  if (!img) {
    console.warn('[drawPhoneAt] missing sprite for family', family, 'active', active);
    return;
  }

  ctxS.save();
  ctxS.translate(x, y);

  // Swivel around the ring
  ctxS.rotate(angle ?? 0);

  if (shadow) {
    ctxS.shadowColor = 'rgba(0,0,0,0.25)';
    ctxS.shadowBlur = 8;
    ctxS.shadowOffsetX = 0;
    ctxS.shadowOffsetY = 5;
  }

  ctxS.drawImage(img, -w / 2, -h / 2, w, h);
  ctxS.restore();
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
