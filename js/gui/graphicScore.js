// js/gui/graphicScore.js
//
// Pre-rendered 31-state, 5-row space-time graphic score.
//
// Responsibilities:
// - validate sequence data
// - pre-render a complete pale score strip
// - pre-render a complete warm score strip
// - draw the pale strip at a state-derived position
// - superimpose the current warm column
//
// This module has no clock, WebSocket, status, or concert-mode dependency.

const DEFAULT_NEUTRAL_COLOR = [96, 96, 96, 1];
const DEFAULT_OUTLINE_COLOR = [255, 255, 255, 0.9];

const DEFAULT_GEOMETRY = Object.freeze({
  cellWidth: 22,
  cellHeight: 11,
  columnGap: 4,
  rowGap: 3,
  cornerRadius: 4,
  outlineWidth: 1,
});

function rgbaString(value, label = 'colour') {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(
      `graphicScore: ${label} must be an RGBA array of length 4`
    );
  }

  const [r, g, b, a] = value;

  if (
    !Number.isFinite(r) ||
    !Number.isFinite(g) ||
    !Number.isFinite(b) ||
    !Number.isFinite(a)
  ) {
    throw new Error(
      `graphicScore: ${label} contains a non-numeric RGBA value`
    );
  }

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function validateSequence(sequence) {
  if (!Array.isArray(sequence)) {
    throw new Error('graphicScore: sequence must be an array');
  }

  if (sequence.length !== 31) {
    throw new Error(
      `graphicScore: expected 31 states; received ${sequence.length}`
    );
  }

  sequence.forEach((state, stateIndex) => {
    if (!Array.isArray(state) || state.length !== 5) {
      throw new Error(
        `graphicScore: state ${stateIndex + 1} must contain exactly 5 bits`
      );
    }

    state.forEach((bit, rowIndex) => {
      if (bit !== 0 && bit !== 1) {
        throw new Error(
          `graphicScore: invalid bit at state ${stateIndex + 1}, ` +
          `row ${rowIndex + 1}: ${bit}`
        );
      }
    });
  });
}

function validateColorMap(colorMap) {
  if (!colorMap || typeof colorMap !== 'object') {
    throw new Error('graphicScore: colorMap must be an object');
  }

  const requiredKeys = [
    'paleY',
    'paleR',
    'paleG',
    'paleB',
    'paleM',
    'warmY',
    'warmR',
    'warmG',
    'warmB',
    'warmM',
  ];

  requiredKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(colorMap, key)) {
      throw new Error(
        `graphicScore: colorMap is missing "${key}"`
      );
    }
  });
}

function createHiDPICanvas(logicalWidth, logicalHeight, dpr) {
  if (
    !Number.isFinite(logicalWidth) ||
    !Number.isFinite(logicalHeight) ||
    logicalWidth <= 0 ||
    logicalHeight <= 0
  ) {
    throw new Error(
      `graphicScore: invalid off-screen size ` +
      `${logicalWidth} × ${logicalHeight}`
    );
  }

  if (!Number.isFinite(dpr) || dpr <= 0) {
    throw new Error(
      `graphicScore: invalid DPR ${dpr}`
    );
  }

  const canvas = document.createElement('canvas');

  canvas.width = Math.ceil(logicalWidth * dpr);
  canvas.height = Math.ceil(logicalHeight * dpr);

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error(
      'graphicScore: off-screen 2D context not available'
    );
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    canvas,
    ctx,
    logicalWidth,
    logicalHeight,
    dpr,
  };
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(
    0,
    Math.min(radius, width * 0.5, height * 0.5)
  );

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + r
  );
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height
  );
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - r
  );
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y
  );
  ctx.closePath();
}

function drawCell(
  ctx,
  {
    x,
    y,
    width,
    height,
    radius,
    fillStyle,
    outlineStyle,
    outlineWidth,
  }
) {
  roundedRectPath(
    ctx,
    x,
    y,
    width,
    height,
    radius
  );

  ctx.fillStyle = fillStyle;
  ctx.fill();

  ctx.strokeStyle = outlineStyle;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();
}

function renderStrip({
  sequence,
  surface,
  rowColors,
  neutralStyle,
  outlineStyle,
  geometry,
  useWarmColors,
}) {
  const {
    cellWidth,
    cellHeight,
    columnGap,
    rowGap,
    cornerRadius,
    outlineWidth,
  } = geometry;

  const columnAdvance = cellWidth + columnGap;
  const rowAdvance = cellHeight + rowGap;

  const ctx = surface.ctx;

  ctx.clearRect(
    0,
    0,
    surface.logicalWidth,
    surface.logicalHeight
  );

  sequence.forEach((state, columnIndex) => {
    const x = columnIndex * columnAdvance;

    state.forEach((bit, rowIndex) => {
      const y = rowIndex * rowAdvance;

      const fillStyle =
        bit === 0
          ? neutralStyle
          : useWarmColors
            ? rowColors[rowIndex].warm
            : rowColors[rowIndex].pale;

      drawCell(ctx, {
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        radius: cornerRadius,
        fillStyle,
        outlineStyle,
        outlineWidth,
      });
    });
  });
}

export function createGraphicScore({
  sequence,
  colorMap,
  dpr = window.devicePixelRatio || 1,
  neutralColor = DEFAULT_NEUTRAL_COLOR,
  outlineColor = DEFAULT_OUTLINE_COLOR,
  geometry = {},
} = {}) {
  validateSequence(sequence);
  validateColorMap(colorMap);

  const resolvedGeometry = {
    ...DEFAULT_GEOMETRY,
    ...geometry,
  };

  const {
    cellWidth,
    cellHeight,
    columnGap,
    rowGap,
    cornerRadius,
    outlineWidth,
  } = resolvedGeometry;

  const numericGeometry = {
    cellWidth,
    cellHeight,
    columnGap,
    rowGap,
    cornerRadius,
    outlineWidth,
  };

  Object.entries(numericGeometry).forEach(([name, value]) => {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `graphicScore: invalid geometry value ${name}=${value}`
      );
    }
  });

  if (cellWidth <= 0 || cellHeight <= 0) {
    throw new Error(
      'graphicScore: cellWidth and cellHeight must be greater than zero'
    );
  }

  const rowColors = [
    {
      pale: rgbaString(colorMap.paleY, 'paleY'),
      warm: rgbaString(colorMap.warmY, 'warmY'),
    },
    {
      pale: rgbaString(colorMap.paleR, 'paleR'),
      warm: rgbaString(colorMap.warmR, 'warmR'),
    },
    {
      pale: rgbaString(colorMap.paleG, 'paleG'),
      warm: rgbaString(colorMap.warmG, 'warmG'),
    },
    {
      pale: rgbaString(colorMap.paleB, 'paleB'),
      warm: rgbaString(colorMap.warmB, 'warmB'),
    },
    {
      pale: rgbaString(colorMap.paleM, 'paleM'),
      warm: rgbaString(colorMap.warmM, 'warmM'),
    },
  ];

  const neutralStyle = rgbaString(
    neutralColor,
    'neutralColor'
  );

  const outlineStyle = rgbaString(
    outlineColor,
    'outlineColor'
  );

  const columnAdvance =
    cellWidth + columnGap;

  const rowAdvance =
    cellHeight + rowGap;

  const stripWidth =
    sequence.length * columnAdvance -
    columnGap;

  const stripHeight =
    5 * rowAdvance -
    rowGap;

  const paleSurface = createHiDPICanvas(
    stripWidth,
    stripHeight,
    dpr
  );

  const warmSurface = createHiDPICanvas(
    stripWidth,
    stripHeight,
    dpr
  );

  renderStrip({
    sequence,
    surface: paleSurface,
    rowColors,
    neutralStyle,
    outlineStyle,
    geometry: resolvedGeometry,
    useWarmColors: false,
  });

  renderStrip({
    sequence,
    surface: warmSurface,
    rowColors,
    neutralStyle,
    outlineStyle,
    geometry: resolvedGeometry,
    useWarmColors: true,
  });

  function draw(
    ctx,
    {
      stateIndex,
      scoreGeometry = ctx.score,
      clipLeft = 0,
      clipRight = ctx.designW,
    } = {}
  ) {
    if (!ctx) {
      throw new Error(
        'graphicScore.draw: visible context is required'
      );
    }

    if (!Number.isInteger(stateIndex)) {
      throw new Error(
        `graphicScore.draw: stateIndex must be an integer; ` +
        `received ${stateIndex}`
      );
    }

    if (
      stateIndex < 0 ||
      stateIndex >= sequence.length
    ) {
      throw new Error(
        `graphicScore.draw: stateIndex ${stateIndex} is outside ` +
        `0–${sequence.length - 1}`
      );
    }

    if (
      !scoreGeometry ||
      !Number.isFinite(scoreGeometry.currentX) ||
      !Number.isFinite(scoreGeometry.topY) ||
      !Number.isFinite(scoreGeometry.height)
    ) {
      throw new Error(
        'graphicScore.draw: invalid score geometry'
      );
    }

    if (
      !Number.isFinite(clipLeft) ||
      !Number.isFinite(clipRight) ||
      clipRight <= clipLeft
    ) {
      throw new Error(
        `graphicScore.draw: invalid clip range ` +
        `${clipLeft}–${clipRight}`
      );
    }

    const stripX =
      scoreGeometry.currentX -
      stateIndex * columnAdvance -
      cellWidth * 0.5;

    const currentColumnX =
      scoreGeometry.currentX -
      cellWidth * 0.5;

    const sourceColumnX =
      stateIndex * columnAdvance;

    ctx.save();

    ctx.beginPath();
    ctx.rect(
      clipLeft,
      scoreGeometry.topY,
      clipRight - clipLeft,
      scoreGeometry.height
    );
    ctx.clip();

    // Full pale strip.
    ctx.drawImage(
      paleSurface.canvas,
      0,
      0,
      paleSurface.canvas.width,
      paleSurface.canvas.height,
      stripX,
      scoreGeometry.topY,
      stripWidth,
      stripHeight
    );

    // Current warm column superimposed at ctx.score.currentX.
    ctx.drawImage(
      warmSurface.canvas,
      Math.round(sourceColumnX * dpr),
      0,
      Math.round(cellWidth * dpr),
      warmSurface.canvas.height,
      currentColumnX,
      scoreGeometry.topY,
      cellWidth,
      stripHeight
    );

    ctx.restore();
  }

  console.log('[graphicScore] created', {
    states: sequence.length,
    rows: 5,
    stripSize: [
      stripWidth,
      stripHeight,
    ],
    backingSize: [
      paleSurface.canvas.width,
      paleSurface.canvas.height,
    ],
    geometry: resolvedGeometry,
    dpr,
  });

  return {
    draw,

    stateCount: sequence.length,
    rowCount: 5,

    stripWidth,
    stripHeight,
    columnAdvance,

    geometry: {
      ...resolvedGeometry,
    },

    paleCanvas: paleSurface.canvas,
    warmCanvas: warmSurface.canvas,
  };
}
