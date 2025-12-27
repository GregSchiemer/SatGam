// js/gui/henge.js
// Geometry and rendering helpers for the phone henge.
// Geometry: build center-anchored slots with RADIAL orientation baked in.
// Rendering: drawHenge() consumes slots + a family/mask to paint phones.

const DEFAULTS = {
  angleStartDeg: -90,   // first phone at 12 o’clock
  arcRadiusFrac: 0.78,  // ring radius as fraction of min(canvas.cx, canvas.cy)
  phoneLongFrac: 0.36,  // along the radius (tall side)
  phoneShortFrac: null, // if null, auto from aspect (≈ long/1.75, min 16px)
};

function deg2rad(d) { return d * Math.PI / 180; }

/**
 * Build N evenly spaced slots around a circle with RADIAL-OUT orientation.
 * Returns an array of { i, x, y, w, h, angle, arcRadius }.
 */
export function makeHengeOf(ctx, numberOf, overrides = {}) {
  if (!ctx || !ctx.canvas) {
    throw new Error('makeHengeOf: ctx with canvas is required');
  }
  if (!Number.isFinite(numberOf) || numberOf <= 0) {
    throw new Error('makeHengeOf: numberOf must be > 0');
  }

  const spec = { ...DEFAULTS, ...overrides, numberOf };

  // Use CSS pixels (initCanvas typically scales device pixels by DPR)
  const dpr = window.devicePixelRatio || 1;
  const W   = ctx.canvas.width  / dpr;
  const H   = ctx.canvas.height / dpr;
  const cx  = W / 2;
  const cy  = H / 2;

  const baseR = Math.min(cx, cy);
  const arcR  = Math.max(40, baseR * spec.arcRadiusFrac);

  const longPx  = Math.round(arcR * spec.phoneLongFrac); // radial (tall side)
  const shortPx = Math.round(
    spec.phoneShortFrac != null
      ? arcR * spec.phoneShortFrac
      : Math.max(16, longPx / 1.75)
  );

  // Slot box size (center-anchored downstream)
  const w = shortPx;   // tangential (short side)
  const h = longPx;    // radial (long side)

  const a0   = deg2rad(spec.angleStartDeg);
  const step = (Math.PI * 2) / numberOf;

  const slots = new Array(numberOf);
  for (let i = 0; i < numberOf; i++) {
    const theta = a0 + i * step;            // theta is RADIAL (outward)
    slots[i] = {
      i,
      x: cx + arcR * Math.cos(theta),       // CENTER coords
      y: cy + arcR * Math.sin(theta),       // CENTER coords
      w,
      h,
      angle: theta,                         // baked radial-out
      arcRadius: arcR,
    };
  }
  return slots;
}

// --- Rendering helper: draw phones for a given mask ---

const RADIAL_OFFSET = Math.PI / 2;

export function drawHenge({
  ctx,
  slots,
  drawPhoneAt,
  familyForIndex,
  mask = null,      // optional: mask per index, or null for “all phones”
}) {
  if (!ctx || !Array.isArray(slots) || !drawPhoneAt || !familyForIndex) {
    console.warn('[henge] drawHenge: missing ctx/slots/drawPhoneAt/familyForIndex');
    return;
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const baseAngle = slot.angle ?? 0;
    const angle     = baseAngle + RADIAL_OFFSET;

    const family =
      (mask != null)
        ? familyForIndex(i, mask)
        : familyForIndex(i);

    drawPhoneAt(ctx, {
      ...slot,
      angle,
      family,
      active: true,
      shadow: true,
    });
  }
}
