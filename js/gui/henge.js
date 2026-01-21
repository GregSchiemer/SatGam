// js/gui/henge.js
//
// Regular N-gon “foot-tangent” henge geometry (incircle touches each phone foot).
// Sprite size is DECOUPLED from arcRadius (incircle radius), so you can push the
// ring outward without making the phones bigger.
//
// Exports:
//   - HENGE_SPECS_DEFAULT
//   - makeHenge(ctx, specs) => { slots, ctxS }
//   - makeHenge25(ctx, overrides)
//   - drawHenge(ctx, slots, ctxS, opts)  // debug visualiser

// js/gui/henge.js
//
// Regular N-gon “foot-tangent” henge geometry (incircle touches each phone foot).
// Key point: sprite SIZE is decoupled from arcRadius (rIn). We push rIn outward
// to prevent overlap, without resizing sprites.
//
// Exports:
//   - HENGE_SPECS_DEFAULT
//   - makeHenge(ctx, specs)  => { slots, ctxS }
//   - makeHenge25(ctx, overrides)
//   - drawHenge(ctx, slots, ctxS, opts)  // debug visualiser

// js/gui/henge.js
//
// "Principal-values" henge geometry for easy experimentation.
// - arcRadius is explicit (px) and positions the ring.
// - phoneW/phoneH are explicit (px).
// - slotW is independent of arcRadius (slotW := phoneW).
// - Feet touch the incircle (feet-circle) at radius rFeet.
// - Sprite centres (and hotspot centres) sit on rCenter = rFeet + phoneH/2.
//
// IMPORTANT DIAGNOSTIC:
// If you want adjacent feet-corners to *just* touch (regular N-gon packing),
// then phoneW must equal slotW_poly where:
//   slotW_poly = 2 * rFeet * tan(pi/N)
// For arbitrary arcRadius + phoneW, you will get overlap or gaps.
// We report that as gapPx = slotW_poly - phoneW (negative => overlap).

const TAU = Math.PI * 2;

const deg2rad = (deg) => (deg * Math.PI) / 180;

function reqFinite(name, v) {
  if (!Number.isFinite(v)) throw new Error(`[henge] ${name} must be finite, got ${v}`);
}

function reqInt(name, v) {
  if (!Number.isInteger(v)) throw new Error(`[henge] ${name} must be an integer, got ${v}`);
}

export const HENGE_SPECS_DEFAULT = {
  // Fundamental
  N: 25,

  // Positioning (px)
  // Mode 'feet' means arcRadius is the feet-circle radius (incircle radius).
  // Mode 'center' means arcRadius is the sprite-centre ring radius (legacy-ish).
  arcRadiusMode: 'feet', // 'feet' | 'center'
  arcRadius: 158,        // px

  // Orientation
  angleStartDeg: -87,    // slot 0 just after 12 o’clock

  // Explicit phone dimensions (px)
  phoneW: 40,
  phoneH: 70,

  // Explicit hotspot radius (px). Keep it conservative at first.
  // If null, we derive a safe default from geometry.
  keyRadius: null,

  // Scale down the geometric non-overlap max for hotspots (only used when keyRadius=null)
  keyRadiusFrac: 0.85,

  // Debug logging
  debug: false,
};

export function makeHenge(ctx, specs = {}) {
  const s = { ...HENGE_SPECS_DEFAULT, ...specs };

  // --- Contracts (principal inputs) ---
  reqFinite('ctx.mid.x', ctx?.mid?.x);
  reqFinite('ctx.mid.y', ctx?.mid?.y);

  reqInt('specs.N', s.N);
  if (s.N < 3) throw new Error(`[henge] specs.N must be >= 3, got ${s.N}`);

  reqFinite('specs.arcRadius', s.arcRadius);
  if (s.arcRadius <= 0) throw new Error(`[henge] specs.arcRadius must be > 0, got ${s.arcRadius}`);

  reqFinite('specs.phoneW', s.phoneW);
  reqFinite('specs.phoneH', s.phoneH);
  if (s.phoneW <= 0 || s.phoneH <= 0) {
    throw new Error(`[henge] phoneW/phoneH must be > 0, got w=${s.phoneW}, h=${s.phoneH}`);
  }

  reqFinite('specs.angleStartDeg', s.angleStartDeg);

  const N = s.N;
  const alpha = Math.PI / N;       // π/N
  const step = TAU / N;            // 2π/N
  const tanA = Math.tan(alpha);

  // --- Principal dims ---
  const phoneW = s.phoneW;
  const phoneH = s.phoneH;

  // slotW is independent of arcRadius by design:
  const slotW = phoneW;

  // --- Interpret arcRadius ---
  let rFeet;   // incircle radius (touches feet)
  let rCenter; // sprite/hotspot centre radius

  if (s.arcRadiusMode === 'center') {
    rCenter = s.arcRadius;
    rFeet = rCenter - phoneH / 2;
    if (rFeet <= 0) {
      throw new Error(
        `[henge] arcRadiusMode='center' requires arcRadius > phoneH/2. ` +
        `Got arcRadius=${s.arcRadius}, phoneH/2=${(phoneH / 2)}`
      );
    }
  } else {
    // default: 'feet'
    rFeet = s.arcRadius;
    rCenter = rFeet + phoneH / 2;
  }

  // --- Regular polygon side length implied by rFeet (diagnostic only) ---
  const slotW_poly = 2 * rFeet * tanA;      // side length of regular N-gon with incircle radius rFeet
  const gapPx = slotW_poly - phoneW;        // negative => overlap; positive => gaps; 0 => perfect corner-touching
  const overlapPx = Math.max(0, -gapPx);

  // --- Hotspot radius ---
  // Max no-overlap radius for circles centred on rCenter ring:
  const keyRadiusMaxNoOverlap = rCenter * Math.sin(alpha);

  // Choose explicit keyRadius if provided; else choose safe derived value.
  let keyRadius;
  if (s.keyRadius != null) {
    reqFinite('specs.keyRadius', s.keyRadius);
    keyRadius = s.keyRadius;
  } else {
    // safe-ish default: scale down the non-overlap maximum and also keep inside the phone width
    const frac = Number.isFinite(s.keyRadiusFrac) ? s.keyRadiusFrac : 0.85;
    keyRadius = keyRadiusMaxNoOverlap * frac;
    keyRadius = Math.min(keyRadius, 0.45 * phoneW, 0.45 * phoneH);
  }

  // --- Angles ---
  const theta0 = deg2rad(s.angleStartDeg);

  // --- Slots ---
  const slots = Array.from({ length: N }, (_, i) => {
    const theta = theta0 + i * step;
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);

    // Foot midpoint on the incircle
    const footX = ctx.mid.x + rFeet * ux;
    const footY = ctx.mid.y + rFeet * uy;

    // Sprite centre / hotspot centre
    const x = ctx.mid.x + rCenter * ux;
    const y = ctx.mid.y + rCenter * uy;

    return {
      i,

      // what drawPhoneAt expects
      x,
      y,
      w: phoneW,
      h: phoneH,
      angle: theta, // base swivel angle (runTime.js adds RADIAL_OFFSET)

      // optional extra geometry (for debugging/overlays)
      theta,
      foot: { x: footX, y: footY },
      hot: { x, y, r: keyRadius },
    };
  });

  const ctxS = {
    // Principal
    N,
    arcRadiusMode: s.arcRadiusMode,
    arcRadius: s.arcRadius,
    angleStartDeg: s.angleStartDeg,
    phoneW,
    phoneH,
    slotW, // independent of arcRadius by design
    keyRadius,

    // Derived radii
    rFeet,       // incircle radius (touches feet)
    rCenter,     // centres/hotspots ring radius

    // Diagnostic: regular-polygon packing implied by rFeet
    alpha,
    step,
    slotW_poly,
    gapPx,
    overlapPx,
    keyRadiusMaxNoOverlap,

    // Handy “perfect touch” suggestion (if you want corners to just touch)
    // If phoneW is fixed and you want gapPx=0, choose:
    //   rFeetTouch = phoneW / (2 * tan(pi/N))
    rFeetTouchForPhoneW: phoneW / (2 * tanA),

    // If rFeet is fixed and you want gapPx=0, choose:
    //   phoneWTouch = 2 * rFeet * tan(pi/N)
    phoneWTouchForRFeet: slotW_poly,
  };

  if (s.debug) {
    console.log('[henge] principal+derived', ctxS);
  }

  return { slots, ctxS };
}

export function makeHenge25(ctx, overrides = {}) {
  return makeHenge(ctx, { ...overrides, N: 25 });
}


//Debug visualiser: draws feet circle (rFeet), centre circle (rCenter),
//phone bounding boxes, foot segments (length phoneW), and hotspot circles.

export function drawHenge(ctx, slots, ctxS, opts = {}) {
  const o = {
    showFeetCircle: true,
    showCenterCircle: true,
    showFeetSegments: true,
    showBoxes: true,
    showHotspots: true,
    showIndices: false,
    lineWidth: 1,
    ...opts,
  };

  ctx.save();
  ctx.lineWidth = o.lineWidth;

  if (o.showFeetCircle) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(ctx.mid.x, ctx.mid.y, ctxS.rFeet, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  if (o.showCenterCircle) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath();
    ctx.arc(ctx.mid.x, ctx.mid.y, ctxS.rCenter, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  for (const s of slots) {
    const { x, y, w, h, angle, foot, hot } = s;

    // Foot segment tangent at foot midpoint, of length phoneW
    if (o.showFeetSegments && foot) {
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const tx = -uy;
      const ty = ux;
      const half = w / 2;

      ctx.save();
      ctx.strokeStyle = 'rgba(0,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(foot.x - tx * half, foot.y - ty * half);
      ctx.lineTo(foot.x + tx * half, foot.y + ty * half);
      ctx.stroke();
      ctx.restore();
    }

    // Phone bounding box (axis-aligned; rotation handled in drawPhoneAt)
    if (o.showBoxes) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,0,0.35)';
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.restore();
    }

    // Hotspot
    if (o.showHotspots && hot) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,0,255,0.35)';
      ctx.beginPath();
      ctx.arc(hot.x, hot.y, hot.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (o.showIndices) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px system-ui, Arial';
      ctx.fillText(String(s.i), x + 6, y - 6);
      ctx.restore();
    }
  }

  ctx.restore();
}

export function arcRadiusForHotspotTouch({ N, keyRadius, phoneH }) {
  const alpha = Math.PI / N;
  const rCenter = keyRadius / Math.sin(alpha);
  return rCenter - (phoneH / 2); // arcRadius (feet mode)
}
