// sprites.js — phone sprites (active/inactive)
import { setLinearGradient, ColorFamily } from './color.js';
import { drawPhonePath } from './canvasUtils.js';

let _atlasReady = false;

export async function initPhoneAtlas({ w, h }) {
  if (_atlasReady) return;
  await buildPhoneAtlas({ w, h }); // your existing function
  _atlasReady = true;
}

export function isPhoneAtlasReady() { return _atlasReady; }

async function makePhoneSprite({ w, h, family, state, activeOutlineAlpha = 0.35, inactiveOutlineAlpha = 0.08, hairlineAt1x = 1 }) {
  const dpr = window.devicePixelRatio || 1;
  const off = document.createElement('canvas');
  off.width  = Math.ceil(w * dpr);
  off.height = Math.ceil(h * dpr);
  const ctx = off.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawPhonePath(ctx, w, h, 0.065);

  if (state === 'active') {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    setLinearGradient(family, g);
    ctx.fillStyle = g;
    ctx.fill();
  } // inactive: no fill → transparent interior

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
    drawPhonePath(ctx, w, h, 0.065);
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
  await Promise.all(families.flatMap(fam => ([
    makePhoneSprite({ w, h, family: fam, state: 'active' }).then(b => { atlas.active[fam] = b; }),
    makePhoneSprite({ w, h, family: fam, state: 'inactive' }).then(b => { atlas.inactive[fam] = b; }),
  ])));
}

export function getPhoneSprite(family, isActive) {
  return (isActive ? atlas.active[family] : atlas.inactive[family]) || null;
}

export function getPhoneAtlasSize() {
  return atlasSize;
}

export function familyForIndex(i) {
  const order = [ColorFamily.YELLOW, ColorFamily.RED, ColorFamily.GREEN, ColorFamily.BLUE, ColorFamily.MAGENTA];
  return order[i % order.length];
}

export function drawPhoneAt(ctx, { x, y, w, h, family, active = true, shadow = true, angle = 0 }) {
  const img = getPhoneSprite(family, active);
  if (!img) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
  }
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}

