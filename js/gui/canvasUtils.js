// js/gui/canvasUtils.js
//
// Canvas + geometry utilities for the Phonehenge GUI.

import { ColorFamily, setLinearGradient } from './color.js';

export const arrP = []; // visible compositor: #mobile
export const arrB    = []; // offscreen background layer
export const arrF    = []; // offscreen foreground/phones layer
export const arrT    = []; // offscreen text layer
export const arrS 	 = []; // offscreen slots

function stampGeometry(ctx, designW, designH, dpr, fit) {
  ctx.w = designW;
  ctx.h = designH;
  ctx.designW = designW;
  ctx.designH = designH;

  ctx.mid = { x: designW * 0.5, y: designH * 0.5 };
  ctx.top = { x: ctx.mid.x,     y: designH * 0.10 };
  ctx.low = { x: ctx.mid.x,     y: designH * 0.90 };

  const lateralOffset = 80;
  ctx.left  = { x: ctx.mid.x - lateralOffset, y: ctx.mid.y };
  ctx.right = { x: ctx.mid.x + lateralOffset, y: ctx.mid.y };

  ctx.pi2 = 2 * Math.PI;
//  ctx.orientBias = Math.PI;  // single source of truth
  ctx.tapRadius = 50;
  ctx.keyRadius = designW; //20;
  ctx.cornerRadius = 25;

  ctx.dpr = dpr;
  ctx.fit = fit; // design-units → CSS pixels (before DPR)
}

function configureCanvas(canvas, cssW, cssH, dpr, fit, designW, designH, isVisible) {
  if (isVisible) {
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.display = 'block';
  }

  // Backing store (device pixels)
  canvas.width  = Math.ceil(cssW * dpr);
  canvas.height = Math.ceil(cssH * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('configureCanvas: 2D context not available');

  // Draw in DESIGN units; transform handles DPR + fit
  ctx.setTransform(dpr * fit, 0, 0, dpr * fit, 0, 0);

  stampGeometry(ctx, designW, designH, dpr, fit);
  return ctx;
}

/**
 * initSurfaces(): creates 4 contexts with identical geometry.
 * - ctxP: visible compositor on #mobile
 * - ctxB: offscreen background layer
 * - ctxF: offscreen foreground/phones layer
 * - ctxT: offscreen text layer
 *
 * mode:
 * - 'fixed': CSS size = designW x designH (good for “hypothetical phone” on laptop)
 * - 'fit'  : scales down to fit window (no upscaling; see fit clamp)
 */
export function initSurfaces({ paneId = 'mobile', designW = 390, designH = 844, mode = 'fixed' } = {}) {
  const cnvP = document.getElementById(paneId);
  if (!cnvP) throw new Error(`initSurfaces: no <canvas id="${paneId}"> found in DOM`);

  const dpr = window.devicePixelRatio || 1;

  let cssW, cssH, fit;

  if (mode === 'fixed') {
    fit  = 1;
    cssW = designW;
    cssH = designH;
  } else {
    // Scale DOWN to fit window, but never scale UP (keeps “actual size” on desktop)
    fit = Math.min(window.innerWidth / designW, window.innerHeight / designH, 1);
    cssW = Math.round(designW * fit);
    cssH = Math.round(designH * fit);
  }

  // Visible compositor (“window pane”)
  const ctxP = configureCanvas(cnvP, cssW, cssH, dpr, fit, designW, designH, true);

  // Offscreen layers
  const cnvB = document.createElement('canvas');
  const ctxB = configureCanvas(cnvB, cssW, cssH, dpr, fit, designW, designH, false);

  const cnvF = document.createElement('canvas');
  const ctxF = configureCanvas(cnvF, cssW, cssH, dpr, fit, designW, designH, false);

  const cnvS = document.createElement('canvas');
  const ctxS = configureCanvas(cnvS, cssW, cssH, dpr, fit, designW, designH, false);

  const cnvT = document.createElement('canvas');
  const ctxT = configureCanvas(cnvT, cssW, cssH, dpr, fit, designW, designH, false);

  // Singleton assignment contract
  arrP[0] = { canvas: cnvP, ctx: ctxP, cssW, cssH };
  arrB[0]    = { canvas: cnvB,    ctx: ctxB,    cssW, cssH };
  arrF[0]    = { canvas: cnvF,    ctx: ctxF,    cssW, cssH };
  arrT[0]    = { canvas: cnvT,    ctx: ctxT,    cssW, cssH };

  console.log('[pairing check @initSurfaces]', {
    pane: ctxP.canvas === cnvP,
    bg:   ctxB.canvas    === cnvB,
    fg:   ctxF.canvas    === cnvF,
    text: ctxT.canvas    === cnvT,
    paneSize: [cnvP.width, cnvP.height],
    bgSize:   [cnvB.width, cnvB.height],
    fgSize:   [cnvF.width, cnvF.height],
    textSize: [cnvT.width, cnvT.height],
  });

  return { ctxP, ctxB, ctxF, ctxT };
}


// ---- tiny compositor helper ----

function blit(ctxP, srcCanvas) {
  // IMPORTANT: map source pixels → destination design units
  ctxP.drawImage(
    srcCanvas,
    0, 0, srcCanvas.width, srcCanvas.height,
    0, 0, ctxP.w, ctxP.h
  );
}

/**
 * composeFrame(): clears the visible pane and composites layers in order.
 * Call once per frame AFTER you've rendered into ctxB/ctxF/ctxT as needed.
 */
export function composeFrame({ drawB = true, drawF = true, drawT = true } = {}) {
  const { canvas: cnvP, ctx: ctxP } = arrP[0];
  const { canvas: cnvB } = arrB[0];
  const { canvas: cnvF } = arrF[0];
  const { canvas: cnvS } = arrS[0];
  const { canvas: cnvT } = arrT[0];

  ctxP.clearRect(0, 0, ctxP.w, ctxP.h);

  if (drawB) blit(ctxP, cnvB);
  if (drawF) blit(ctxP, cnvF);
  if (drawT) blit(ctxP, cnvT);

  // (cnvP unused here, but kept for symmetry/debugging)
}

// ---------------------------------------------------------------------------
//  Slots (henge geometry) – one entry per phone around the ring
// ---------------------------------------------------------------------------

export function setSlots(slots) {
  arrS.length = 0;
  if (Array.isArray(slots)) {
    for (const s of slots) {
      arrS.push(s);
    }
  }
}

export function getSlots() {
  return arrS;
}

// ---------------------------------------------------------------------------
//  Background rendering - color.js configures a neutral gradient
// ---------------------------------------------------------------------------

export function prepareAndRenderBackground(ctxB) {

  ctxB.save();

  ctxB.clearRect(0, 0, ctxB.w, ctxB.h);

  const gradientFill = ctxB.createLinearGradient(0, ctxB.h, 0, 0);
  setLinearGradient(ColorFamily.NONE, gradientFill);

  ctxB.fillStyle = gradientFill;
  ctxB.fillRect(0, 0, ctxB.w, ctxB.h);

  ctxB.restore();
}


export function selectAndRenderBackground(ctxB, status) {
  const fam = status?.bgFamily ?? ColorFamily.NONE;
  
  const g = ctxB.createLinearGradient(0, ctxB.h, 0, 0);
  const gradient = setLinearGradient(fam, g);          // mutate g; ignore return value

  console.log('[UI selected background] fam :', fam, 'g :', g);
  
  ctxB.clearRect(0, 0, ctxB.w, ctxB.h);
  ctxB.save();
  ctxB.fillStyle = gradient;                 // use gradient
  ctxB.fillRect(0, 0, ctxB.w, ctxB.h);
  ctxB.restore();
}

// Copy the current background layer (arrB) onto the visible pane (arrP).
export function blitBackgroundToPane() {
  const ctxP = arrP?.[0]?.ctx;
  const cnvB    = arrB?.[0]?.canvas;

  if (!ctxP || !cnvB) return;

  ctxP.save();
  ctxP.setTransform(1, 0, 0, 1, 0, 0);         // avoid inherited transforms
  ctxP.clearRect(0, 0, ctxP.w, ctxP.h);
  ctxP.drawImage(cnvB, 0, 0, ctxP.w, ctxP.h);
  ctxP.restore();
}

// ---------------------------------------------------------------------------
//  Pointer → canvas coordinate helper
// ---------------------------------------------------------------------------

/**
 * Convert a PointerEvent / MouseEvent into canvas-space coordinates.
 */
 
export function eventToCtxPoint(ev, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  return { x, y };
}


export function renderSavedBackground(ctxP) {
  const cnvB = arrB?.[0]?.canvas;
  if (!ctxP || !cnvB) return;

  ctxP.clearRect(0, 0, ctxP.w, ctxP.h);
  ctxP.drawImage(cnvB, 0, 0, ctxP.w, ctxP.h);
}

// ---------------------------------------------------------------------------
//  Shape helpers (used by sprites.js)
// ---------------------------------------------------------------------------

export function drawPhonePath(ctx, { x, y, w, h, r }) {
  if (!ctx) return;

  const radius = Number.isFinite(r) ? r : Math.min(w, h) * 0.12;

  const right  = x + w;
  const bottom = y + h;

  ctx.beginPath();

  // top edge
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);

  // right edge
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);

  // bottom edge
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);

  // left edge
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);

  ctx.closePath();
}

function isRadiusValid(r) {
  return Number.isFinite(r) && r > 0;
}

function firstValid(pred, ...vals) {
  for (const v of vals) if (pred(v)) return v;
  return null;
}

export function radializeSlots(ctx, baseSlots) {
  const cx = ctx.mid.x;
  const cy = ctx.mid.y;

  if (!Array.isArray(baseSlots) || baseSlots.length === 0) return [];

  const DEFAULT_W = 31;
  const DEFAULT_H = 55;

  return baseSlots.map((s, idx) => {
    const angle =
      Number.isFinite(s.angle)
        ? s.angle
        : (ctx.pi2 || (2 * Math.PI)) * (idx / baseSlots.length) - Math.PI / 2;

    const radial =
      firstValid(isRadiusValid, s.arcRadius, s.radius, s.r) ??
      (Math.min(ctx.w, ctx.h) * 0.33);

    const x = cx + Math.cos(angle) * radial;
    const y = cy + Math.sin(angle) * radial;

    const w = Number.isFinite(s.w) ? s.w : DEFAULT_W;
    const h = Number.isFinite(s.h) ? s.h : DEFAULT_H;

    return { ...s, angle, radial, x, y, w, h };
  });
}





