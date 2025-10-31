// js/gui/canvasUtils.js
import { ColorFamily, setLinearGradient } from './color.js';

// Canonical shared state
export const U = {};

export function getUniversal() {
  return U;
}

export function setSlots(slots) {
  U.slots = Array.isArray(slots) ? slots : [];
}

export function getSlots() {
  return U.slots ?? [];
}

// back-compat shim for old `import { arrU }`
export const arrU = [U];

//export const arrU = []; // universal store
export const arrK = []; // keys
const arrB = [];        // background (unchanged)

/**
 * Initialize the canvas and populate universal properties.
 */
 
export function initCanvas(id = 'mobile', opts = {}) {
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');
  const {
    cssW: cssWOverride,
    cssH: cssHOverride,
    dpr: dprOverride,
    clear = true,

    // universal knobs (override as needed)
    lateralOffset = 80,
    cornerRadius  = 25,
    tapRadius     = 50,
    concertClock  = 1000,  // ms
    previewClock  = 1,     // ms
    playRate      = concertClock, // default runtime rate
    hengeRotate   = 'radial',     // default ring orientation
    ringMargin    = 120,          // canvas edge margin for ring radius
    phoneW,                       // optionally override phone sprite W
    phoneH,                       // optionally override phone sprite H
  } = opts;

  const dpr  = Number.isFinite(dprOverride) ? dprOverride : (window.devicePixelRatio || 1);
  const cssW = Number.isFinite(cssWOverride) ? cssWOverride : (canvas.clientWidth  || 390);
  const cssH = Number.isFinite(cssHOverride) ? cssHOverride : (canvas.clientHeight || 844);

  // Backing store size + CSS px transform
  canvas.width  = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (clear) ctx.clearRect(0, 0, cssW, cssH);

  // ------- universal geometry/timing on ctx (legacy-friendly) -------
  ctx.w  = cssW;                 // CSS px
  ctx.h  = cssH;
  ctx.t  = ctx.h * 0.10;         // top band (legacy)
  ctx.mid = { x: ctx.w / 2, y: ctx.h / 2 };
  ctx.l   = ctx.mid.x - lateralOffset;
  ctx.r   = ctx.mid.x + lateralOffset;
  ctx.pi2          = parseFloat((2 * Math.PI).toFixed(2));
  ctx.concertClock = concertClock;
  ctx.previewClock = previewClock;
  ctx.playRate     = playRate;
  ctx.tapRadius    = tapRadius;
  ctx.cornerRadius = cornerRadius;

  // henge/ring defaults derived from canvas
  const radius = Math.min(cssW, cssH) / 2 - ringMargin;

  ctx.phoneW = phoneW || ctx.phoneW; // leave undefined if not provided
  ctx.phoneH = phoneH || ctx.phoneH;

  arrU[0] = {
    canvas, ctx, dpr, cssW, cssH,
    ringRadius: radius,
    hengeRotate,
    ringMargin,
  };

  return { canvas, ctx, cssW, cssH, dpr };
}

/* save background canvas */
export function saveCanvasBackground(f) {
  const { ctx } = arrU[0];
  const ctxB = ctx;

  ctxB.cornerRadius = 25;
  ctxB.shadowColor = 'lightgrey';
  ctxB.shadowOffsetX = 0;
  ctxB.shadowOffsetY = -2.5;
  ctxB.strokeStyle = 'grey';
  ctxB.fillStyle = pickBackground(ctxB, f);

  arrB.push({ ctxB });
}

function pickBackground(ctxB, f) {
  const gradient = ctxB.createLinearGradient(0, ctxB.h, 0, 0);
  return setLinearGradient(f, gradient);
}

export function renderSavedBackground() {
  const u = arrU?.[0];
  const ctx = u?.ctx;
  if (!ctx) return false;

  const { canvas } = ctx;
  ctx.save();
  // ensure a clean fill regardless of any transforms set elsewhere
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // use the gradient (or color) that saveCanvasBackground() stored
  if (u.ctx.fillStyle) ctx.fillStyle = u.ctx.fillStyle;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  return true;
}

// --- OPTIONAL: one-shot convenience to rebuild + paint ---
export function prepareAndRenderBackground(f = 0) {
  saveCanvasBackground(f);
  return renderSavedBackground();
}

export function drawPhonePath(ctx, w, h, r = 0.065) {
  const radius = Math.min(w, h) * r;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.quadraticCurveTo(w, 0, w, radius);
  ctx.lineTo(w, h - radius);
  ctx.quadraticCurveTo(w, h, w - radius, h);
  ctx.lineTo(radius, h);
  ctx.quadraticCurveTo(0, h, 0, h - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
}
