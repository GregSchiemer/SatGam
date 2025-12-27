// js/gui/canvasUtils.js
//
// Canvas + geometry utilities for the Phonehenge GUI.

import { ColorFamily, setLinearGradient } from './color.js';

export const arrPane = []; // visible compositor: #mobile
export const arrB    = []; // offscreen background layer
export const arrF    = []; // offscreen foreground/phones layer
export const arrT    = []; // offscreen text layer
export const arrS 	 = []; // offscreen slots

function stampGeometry(ctx, designW, designH, dpr, fit) {
  ctx.w = designW;
  ctx.h = designH;

  ctx.mid = { x: designW * 0.5, y: designH * 0.5 };
  ctx.top = { x: ctx.mid.x,     y: designH * 0.10 };
  ctx.low = { x: ctx.mid.x,     y: designH * 0.90 };

  const lateralOffset = 80;
  ctx.left  = { x: ctx.mid.x - lateralOffset, y: ctx.mid.y };
  ctx.right = { x: ctx.mid.x + lateralOffset, y: ctx.mid.y };

  ctx.pi2 = 2 * Math.PI;
  ctx.tapRadius = 50;
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
 * - ctxPane: visible compositor on #mobile
 * - ctxB: offscreen background layer
 * - ctxF: offscreen foreground/phones layer
 * - ctxT: offscreen text layer
 *
 * mode:
 * - 'fixed': CSS size = designW x designH (good for “hypothetical phone” on laptop)
 * - 'fit'  : scales down to fit window (no upscaling; see fit clamp)
 */
export function initSurfaces({ paneId = 'mobile', designW = 390, designH = 844, mode = 'fixed' } = {}) {
  const cnvPane = document.getElementById(paneId);
  if (!cnvPane) throw new Error(`initSurfaces: no <canvas id="${paneId}"> found in DOM`);

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
  const ctxPane = configureCanvas(cnvPane, cssW, cssH, dpr, fit, designW, designH, true);

  // Offscreen layers
  const cnvB = document.createElement('canvas');
  const ctxB = configureCanvas(cnvB, cssW, cssH, dpr, fit, designW, designH, false);

  const cnvF = document.createElement('canvas');
  const ctxF = configureCanvas(cnvF, cssW, cssH, dpr, fit, designW, designH, false);

  const cnvT = document.createElement('canvas');
  const ctxT = configureCanvas(cnvT, cssW, cssH, dpr, fit, designW, designH, false);

  // Singleton assignment contract
  arrPane[0] = { canvas: cnvPane, ctx: ctxPane, cssW, cssH };
  arrB[0]    = { canvas: cnvB,    ctx: ctxB,    cssW, cssH };
  arrF[0]    = { canvas: cnvF,    ctx: ctxF,    cssW, cssH };
  arrT[0]    = { canvas: cnvT,    ctx: ctxT,    cssW, cssH };

  console.log('[pairing check @initSurfaces]', {
    pane: ctxPane.canvas === cnvPane,
    bg:   ctxB.canvas    === cnvB,
    fg:   ctxF.canvas    === cnvF,
    text: ctxT.canvas    === cnvT,
    paneSize: [cnvPane.width, cnvPane.height],
    bgSize:   [cnvB.width, cnvB.height],
    fgSize:   [cnvF.width, cnvF.height],
    textSize: [cnvT.width, cnvT.height],
  });

  return { ctxPane, ctxB, ctxF, ctxT };
}


// ---- tiny compositor helper ----

function blit(ctxPane, srcCanvas) {
  // IMPORTANT: map source pixels → destination design units
  ctxPane.drawImage(
    srcCanvas,
    0, 0, srcCanvas.width, srcCanvas.height,
    0, 0, ctxPane.w, ctxPane.h
  );
}

/**
 * composeFrame(): clears the visible pane and composites layers in order.
 * Call once per frame AFTER you've rendered into ctxB/ctxF/ctxT as needed.
 */
export function composeFrame({ drawB = true, drawF = true, drawT = true } = {}) {
  const { canvas: cnvPane, ctx: ctxPane } = arrPane[0];
  const { canvas: cnvB } = arrB[0];
  const { canvas: cnvF } = arrF[0];
  const { canvas: cnvS } = arrS[0];
  const { canvas: cnvT } = arrT[0];

  ctxPane.clearRect(0, 0, ctxPane.w, ctxPane.h);

  if (drawB) blit(ctxPane, cnvB);
  if (drawF) blit(ctxPane, cnvF);
  if (drawT) blit(ctxPane, cnvT);

  // (cnvPane unused here, but kept for symmetry/debugging)
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

export function prepareAndRenderBackground(ctx) {

  ctx.save();

  ctx.clearRect(0, 0, ctx.w, ctx.h);

  const gradientFill = ctx.createLinearGradient(0, ctx.h, 0, 0);
  setLinearGradient(ColorFamily.NONE, gradientFill);

  ctx.fillStyle = gradientFill;
  ctx.fillRect(0, 0, ctx.w, ctx.h);

  ctx.restore();
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

export function renderSavedBackground(ctx, canvas) {
  prepareAndRenderBackground(ctx, canvas);
}


// ---------------------------------------------------------------------------
//  Shape helpers (used by sprites.js)
// ---------------------------------------------------------------------------

/**
 * Draw the outline path of a rounded-rectangle "phone body".
 *
 * drawPhonePath(ctx, { x, y, w, h, r })
 *
 * It only defines the path; the caller is responsible for fill/stroke.
 */
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






