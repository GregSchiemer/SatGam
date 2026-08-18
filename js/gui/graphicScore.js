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
// - draw one white outline around the fixed current column
//
// This module has no clock, WebSocket, status, or concert-mode dependency.

import { COLOR_MAP } from './color.js';

const DEFAULT_GEOMETRY = Object.freeze({
  cellWidth: 22,
  cellHeight: 11,
  columnGap: 0,
  rowGap: 0,
  cornerRadius: 4,
  outlineWidth: 1,
  currentOutlineWidth: 1,
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
    throw new Error(
      'graphicScore: sequence must be an array'
    );
  }

  if (sequence.length !== 31) {
    throw new Error(
      `graphicScore: expected 31 states; received ${sequence.length}`
    );
  }

  sequence.forEach((state, stateIndex) => {
    if (!Array.isArray(state) || state.length !== 5) {
      throw new Error(
        `graphicScore: state ${stateIndex + 1} ` +
        `must contain exactly 5 bits`
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

function createHiDPICanvas(
  logicalWidth,
  logicalHeight,
  dpr
) {
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

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  return {
    canvas,
    ctx,
    logicalWidth,
    logicalHeight,
    dpr,
  };
}

function roundedRectPath(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {
  const r = Math.max(
    0,
    Math.min(
      radius,
      width * 0.5,
      height * 0.5
    )
  );

  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y
  );

  ctx.lineTo(
    x + width - r,
    y
  );

  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + r
  );

  ctx.lineTo(
    x + width,
    y + height - r
  );

  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height
  );

  ctx.lineTo(
    x + r,
    y + height
  );

  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - r
  );

  ctx.lineTo(
    x,
    y + r
  );

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
  options = {}
) {
  const {
    x,
    y,
    width,
    height,
    radius,
    fillStyle,
    outlineStyle,
    outlineWidth,
  } = options;

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

function drawCurrentColumnOutline(
  ctx,
  options = {}
) {
  const {
    x,
    topY,
    cellWidth,
    stripHeight,
    cornerRadius,
    outlineStyle,
    outlineWidth,
  } = options;

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(topY) ||
    !Number.isFinite(cellWidth) ||
    !Number.isFinite(stripHeight) ||
    !Number.isFinite(cornerRadius) ||
    !Number.isFinite(outlineWidth)
  ) {
    throw new Error(
      'graphicScore.drawCurrentColumnOutline: invalid geometry'
    );
  }

  if (cellWidth <= 0 || stripHeight <= 0) {
    throw new Error(
      'graphicScore.drawCurrentColumnOutline: ' +
      'cellWidth and stripHeight must be greater than zero'
    );
  }

  if (outlineWidth < 0) {
    throw new Error(
      'graphicScore.drawCurrentColumnOutline: ' +
      'outlineWidth must not be negative'
    );
  }

  const inset = outlineWidth * 0.5;

  const frameWidth =
    cellWidth - outlineWidth;

  const frameHeight =
    stripHeight - outlineWidth;

  if (frameWidth <= 0 || frameHeight <= 0) {
    throw new Error(
      'graphicScore.drawCurrentColumnOutline: ' +
      'outlineWidth is too large for the current-column frame'
    );
  }

  ctx.save();

  ctx.strokeStyle = outlineStyle;
  ctx.lineWidth = outlineWidth;

  roundedRectPath(
    ctx,
    x + inset,
    topY + inset,
    frameWidth,
    frameHeight,
    Math.max(0, cornerRadius - inset)
  );

  ctx.stroke();

  ctx.restore();
}

function renderStrip(options = {}) {
  const {
    sequence,
    surface,
    rowColors,
    neutralStyle,
    outlineStyle,
    geometry,
    useWarmColors,
  } = options;

  const {
    cellWidth,
    cellHeight,
    columnGap,
    rowGap,
    cornerRadius,
    outlineWidth,
  } = geometry;

  const columnAdvance =
    cellWidth + columnGap;

  const rowAdvance =
    cellHeight + rowGap;

  const ctx = surface.ctx;

  ctx.clearRect(
    0,
    0,
    surface.logicalWidth,
    surface.logicalHeight
  );

  sequence.forEach(
    (state, columnIndex) => {
      const x =
        columnIndex * columnAdvance;

      state.forEach(
        (bit, rowIndex) => {
          const y =
            rowIndex * rowAdvance;

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
        }
      );
    }
  );
}

export function createGraphicScore(
  options = {}
) {
  const {
    sequence,
    dpr = window.devicePixelRatio || 1,
    neutralColor = COLOR_MAP.transparent,
    outlineColor = COLOR_MAP.silver,
    highlightOutline = COLOR_MAP.white,
    geometry = {},
  } = options;

  validateSequence(sequence);

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
    currentOutlineWidth,
  } = resolvedGeometry;

  const numericGeometry = {
    cellWidth,
    cellHeight,
    columnGap,
    rowGap,
    cornerRadius,
    outlineWidth,
    currentOutlineWidth,
  };

  Object.entries(
    numericGeometry
  ).forEach(([name, value]) => {
    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        `graphicScore: invalid geometry value ` +
        `${name}=${value}`
      );
    }
  });

  if (
    cellWidth <= 0 ||
    cellHeight <= 0
  ) {
    throw new Error(
      'graphicScore: cellWidth and cellHeight ' +
      'must be greater than zero'
    );
  }

  const rowColors = [
    {
      pale: rgbaString(
        COLOR_MAP.paleY,
        'paleY'
      ),
      warm: rgbaString(
        COLOR_MAP.warmY,
        'warmY'
      ),
    },
    {
      pale: rgbaString(
        COLOR_MAP.paleR,
        'paleR'
      ),
      warm: rgbaString(
        COLOR_MAP.warmR,
        'warmR'
      ),
    },
    {
      pale: rgbaString(
        COLOR_MAP.paleG,
        'paleG'
      ),
      warm: rgbaString(
        COLOR_MAP.warmG,
        'warmG'
      ),
    },
    {
      pale: rgbaString(
        COLOR_MAP.paleB,
        'paleB'
      ),
      warm: rgbaString(
        COLOR_MAP.warmB,
        'warmB'
      ),
    },
    {
      pale: rgbaString(
        COLOR_MAP.paleM,
        'paleM'
      ),
      warm: rgbaString(
        COLOR_MAP.warmM,
        'warmM'
      ),
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

  const highlightOutlineStyle = rgbaString(
    highlightOutline,
    'highlightOutline'
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
    drawOptions = {}
  ) {
    if (!ctx) {
      throw new Error(
        'graphicScore.draw: visible context is required'
      );
    }

    const {
      stateIndex,
      scoreGeometry = ctx.score,
      clipLeft = 0,
      clipRight = ctx.designW,
    } = drawOptions;

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
        `graphicScore.draw: stateIndex ${stateIndex} ` +
        `is outside 0–${sequence.length - 1}`
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

    // Draw the complete pale score strip.
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

    // Superimpose the current warm column at the fixed
    // current-column position.
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

    // Draw one portrait-oriented white frame around the
    // complete five-cell current column.
    drawCurrentColumnOutline(ctx, {
      x: currentColumnX,
      topY: scoreGeometry.topY,
      cellWidth,
      stripHeight,
      cornerRadius,
      outlineStyle: highlightOutlineStyle,
      outlineWidth: currentOutlineWidth,
    });

    ctx.restore();
  }

  console.log(
    '[graphicScore] created',
    {
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
    }
  );

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