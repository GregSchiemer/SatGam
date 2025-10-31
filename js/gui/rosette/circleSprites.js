/* -----------------------------------------------------
   Circle sprites (inactive/active per color family)
----------------------------------------------------- */
const circleSpriteCache = new Map(); // key: `${family}:circle:r`

export function ensureCircleSprites(family = ColorFamily.NONE) {
  const nodes = getNodesFromHenge();
  const baseR = Math.round(nodes[0]?.r || arrU[0]?.ctx?.tapRadius || 12);
  const keyBase = `${family}:circle:${baseR}`;
  if (circleSpriteCache.has(`${keyBase}:inactive`) && circleSpriteCache.has(`${keyBase}:active`)) return;

  const inactive = makeCircleSprite({
    radius: baseR,
    family: ColorFamily.NONE,
    stroke: 'rgba(255,255,255,0.35)',
    shadow: { color: 'rgba(0,0,0,0.35)', blur: 6, ox: 0, oy: 0 },
  });

  const active = makeCircleSprite({
    radius: baseR,
    family,
    stroke: 'rgba(255,255,255,0.65)',
    glow:   { color: 'rgba(255,255,255,0.45)', blur: 16 },
  });

  circleSpriteCache.set(`${keyBase}:inactive`, inactive);
  circleSpriteCache.set(`${keyBase}:active`,   active);
}

export function getCircleSprites(family = ColorFamily.NONE) {
  const nodes = getNodesFromHenge();
  const baseR = Math.round(nodes[0]?.r || arrU[0]?.ctx?.tapRadius || 12);
  const keyBase = `${family}:circle:${baseR}`;
  return {
    inactive: circleSpriteCache.get(`${keyBase}:inactive`),
    active:   circleSpriteCache.get(`${keyBase}:active`),
  };
}

function makeCircleSprite({ radius, family, stroke, shadow, glow }) {
  const dpr = (window.devicePixelRatio || 1);
  const cssSize = radius * 2;

  const off = document.createElement('canvas');
  off.width  = Math.ceil(cssSize * dpr);
  off.height = Math.ceil(cssSize * dpr);
  const octx = off.getContext('2d');
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const g = octx.createLinearGradient(0, cssSize, 0, 0);
  if (family === ColorFamily.NONE) {
    g.addColorStop(1, 'rgb(58,61,66)');
    g.addColorStop(0, 'rgb(123,127,134)');
  } else {
    setLinearGradient(family, g);
  }

  if (glow) {
    octx.shadowColor = glow.color || 'rgba(255,255,255,0.35)';
    octx.shadowBlur  = glow.blur  ?? 12;
  } else if (shadow) {
    octx.shadowColor   = shadow.color ?? 'rgba(0,0,0,0.35)';
    octx.shadowBlur    = shadow.blur  ?? 6;
    octx.shadowOffsetX = shadow.ox    ?? 0;
    octx.shadowOffsetY = shadow.oy    ?? 0;
  }

  octx.fillStyle   = g;
  octx.strokeStyle = stroke || 'rgba(255,255,255,0.35)';
  octx.lineWidth   = 1.25;

  octx.beginPath();
  octx.arc(radius, radius, radius - 0.75, 0, Math.PI * 2);
  octx.fill();
  octx.stroke();
  octx.closePath();

  return off;
}