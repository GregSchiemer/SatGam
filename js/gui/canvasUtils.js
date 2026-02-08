// js/gui/canvasUtils.js
//
// Canvas + geometry utilities for Phonehenge GUI.

import { ColorFamily, setLinearGradient } from './color.js';

export const arrP = []; // visible compositor: #mobile
export const arrA = []; // off screen atlas 
export const arrB = []; // background layer
export const arrF = []; // foreground layer
export const arrS = []; // sprites layer
export const arrT = []; // text layer

// alternative name : setCtxProperties
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

function configureCanvas(cnv, cssW, cssH, dpr, fit, designW, designH, isVisible) {
  if (isVisible) {
    cnv.style.width = `${cssW}px`;
    cnv.style.height = `${cssH}px`;
    cnv.style.display = 'block';
  }

  // Backing store (device pixels)
  cnv.width  = Math.ceil(cssW * dpr);
  cnv.height = Math.ceil(cssH * dpr);

  const ctx = cnv.getContext('2d');
  if (!ctx) throw new Error('configureCanvas: 2D context not available');

  // Draw in DESIGN units; transform handles DPR + fit
  ctx.setTransform(dpr * fit, 0, 0, dpr * fit, 0, 0);

  stampGeometry(ctx, designW, designH, dpr, fit);
  return ctx;
}

// initCanvases(): creates 4 contexts with identical geometry.
// - ctxP: visible compositor on #mobile
// - ctxB: off screen background layer
// - ctxF: off screen foreground/phones layer
// - ctxT: off screen text layer
//
// mode:
// - 'fixed': CSS size = designW x designH (good for “hypothetical phone” on laptop)
// - 'fit'  : scales down to fit window (no upscaling; see fit clamp)
//
// alternative name : replicate  
export function initCanvases({ paneId = 'mobile', designW = 390, designH = 844, mode = 'fixed' } = {}) {
  const cnvP = document.getElementById(paneId);
  if (!cnvP) throw new Error(`initCanvases: no <canvas id="${paneId}"> found in DOM`);

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

  // off screen layers
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
  arrB[0] = { canvas: cnvB, ctx: ctxB, cssW, cssH };
  arrF[0] = { canvas: cnvF, ctx: ctxF, cssW, cssH };
  arrS[0] = { canvas: cnvS, ctx: ctxS, cssW, cssH };
  arrT[0] = { canvas: cnvT, ctx: ctxT, cssW, cssH };

  console.log('[pairing check @initCanvases]', {
    pane: 		ctxP.canvas === cnvP,
    bg:   		ctxB.canvas === cnvB,
    fg:   		ctxF.canvas === cnvF,
    sprite: 	ctxS.canvas === cnvS,
    text:   	ctxT.canvas === cnvT,
    paneSize:   [cnvP.width, cnvP.height],
    bgSize:     [cnvB.width, cnvB.height],
    fgSize:     [cnvF.width, cnvF.height],
    spriteSize: [cnvS.width, cnvS.height],
    textSize:   [cnvT.width, cnvT.height],
  });

  return { ctxP, ctxB, ctxF, ctxS, ctxT };
}

// ---- tiny compositor helper ----
function blit(ctxDst, cnvSrc) {
  ctxDst.drawImage(
    cnvSrc,
    0, 0, cnvSrc.width, cnvSrc.height,
    0, 0, ctxDst.w, ctxDst.h
  );
}

// composeFrame(): clears the visible pane and composites layers in order.
export function composeFrame({ drawB = true, drawF = false, drawS = true, drawT = true } = {}) {
  const { canvas: cnvP, ctx: ctxP } = arrP[0];
  const { canvas: cnvB } = arrB[0];
  const { canvas: cnvF } = arrF[0];
  const { canvas: cnvS } = arrS[0];
  const { canvas: cnvT } = arrT[0];

  ctxP.clearRect(0, 0, ctxP.w, ctxP.h);

  if (drawB) blit(ctxP, cnvB);
  if (drawF) blit(ctxP, cnvF);
  if (drawS) blit(ctxP, cnvS);
  if (drawT) blit(ctxP, cnvT);
}

// ---------------------------------------------------------------------------
//  Slots (henge geometry) – one entry per phone around the ring
// ---------------------------------------------------------------------------
export function setSlots(slots) {
  arrA.length = 0;
  if (Array.isArray(slots)) arrA.push(...slots);
}

export function getSlots() {
  return arrA;
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
  const family = status.bgFamily ?? ColorFamily.NONE;

  ctxB.clearRect(0, 0, ctxB.w, ctxB.h);
  ctxB.save();

  if (family === ColorFamily.BLACK) {
    ctxB.fillStyle = 'rgba(0, 0, 0, 1)';
    ctxB.fillRect(0, 0, ctxB.w, ctxB.h);
    ctxB.restore();
    return;
  }

  const g = ctxB.createLinearGradient(0, ctxB.h, 0, 0);
  setLinearGradient(family, g);     // mutates g
  ctxB.fillStyle = g;
  ctxB.fillRect(0, 0, ctxB.w, ctxB.h);
  ctxB.restore();
}

/*
export function selectAndRenderBackground(ctxB, status) {
  const fam = status?.bgFamily ?? ColorFamily.NONE;
  
  const g = ctxB.createLinearGradient(0, ctxB.h, 0, 0);
  const gradient = setLinearGradient(fam, g);          // mutate g; ignore return value

//  console.log('[UI selected background] fam :', fam, 'g :', g);
  
  ctxB.clearRect(0, 0, ctxB.w, ctxB.h);
  ctxB.save();
  ctxB.fillStyle = gradient;                 // use gradient
  ctxB.fillRect(0, 0, ctxB.w, ctxB.h);
  ctxB.restore();
}
*/

// ---------------------------------------------------------------------------
//  Pointer → canvas coordinate helper
// ---------------------------------------------------------------------------

// Convert a PointerEvent / MouseEvent into canvas-space coordinates.
export function eventToCtxPoint(ev, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  return { x, y };
}

export function renderSavedBackground(ctxP) {
  const cnvB = arrB[0].canvas;//const cnvB = arrB?.[0]?.canvas;
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

// bgFade helpers (put near frameRender, or export from canvasUtils)
export function ensureBgFadeBuffers(status, cnvB) {
  if (!status._bgFade) status._bgFade = {};
  const f = status._bgFade;

  if (!f.from) f.from = document.createElement('canvas');
  if (!f.to)   f.to   = document.createElement('canvas');

  // Keep buffers in device-pixel size
  if (f.from.width !== cnvB.width || f.from.height !== cnvB.height) {
    f.from.width  = cnvB.width;
    f.from.height = cnvB.height;
  }
  if (f.to.width !== cnvB.width || f.to.height !== cnvB.height) {
    f.to.width  = cnvB.width;
    f.to.height = cnvB.height;
  }

  if (!f.ctxFrom) f.ctxFrom = f.from.getContext('2d');
  if (!f.ctxTo)   f.ctxTo   = f.to.getContext('2d');

  return f;
}

export function beginBackgroundCrossfade(status, ctxB, newFamily, durationMs = 320) {
  const cnvB = arrB[0].canvas;

  // If a fade is in progress, "bake" the current blended result into cnvB first
  if (status.bgFade?.active) {
    const now = performance.now();
    const t = Math.min(1, (now - status.bgFade.startMs) / status.bgFade.durationMs);
    blendBgCanvasesInto(ctxB, cnvB, status._bgFade.from, status._bgFade.to, t);
    status.bgFade.active = false;
  }

  const fade = ensureBgFadeBuffers(status, cnvB);

  // Snapshot CURRENT bg → from
  fade.ctxFrom.setTransform(1, 0, 0, 1, 0, 0);
  fade.ctxFrom.clearRect(0, 0, cnvB.width, cnvB.height);
  fade.ctxFrom.drawImage(cnvB, 0, 0);

  // Render NEW bg into the real bg layer once (using your existing function)
  status.bgFamily = newFamily;
  selectAndRenderBackground(ctxB, status);

  // Snapshot NEW bg → to
  fade.ctxTo.setTransform(1, 0, 0, 1, 0, 0);
  fade.ctxTo.clearRect(0, 0, cnvB.width, cnvB.height);
  fade.ctxTo.drawImage(cnvB, 0, 0);

  // Start fade
  status.bgFade = {
    active: true,
    startMs: performance.now(),
    durationMs,
  };
}

export function blendBgCanvasesInto(ctxB, cnvB, cnvFrom, cnvTo, t) {
  ctxB.save();
  ctxB.setTransform(1, 0, 0, 1, 0, 0);          // draw in device pixels
  ctxB.clearRect(0, 0, cnvB.width, cnvB.height);

  ctxB.globalAlpha = 1 - t;
  ctxB.drawImage(cnvFrom, 0, 0, cnvB.width, cnvB.height);

  ctxB.globalAlpha = t;
  ctxB.drawImage(cnvTo, 0, 0, cnvB.width, cnvB.height);

  ctxB.restore();
}


