// js/gui/graphicScore.js
//
// Pre-rendered 31-state, 5-row space-time graphic score.
//
// Responsibilities:
// - validate sequence data
// - pre-render a complete pale score strip
// - pre-render a complete warm score strip
// - pre-render state-number labels
// - draw the pale strip at a state-derived position
// - superimpose the current warm column
// - draw one white outline around the fixed current column
//
// This module has no clock, WebSocket, status, or
// concert-mode dependency.

import { COLOR_MAP } from './color.js';


// ------------------------------------------------------------
// Geometry
// ------------------------------------------------------------

const DEFAULT_GEOMETRY = Object.freeze({
  cellWidth: 22,
  cellHeight: 11,
  columnGap: 0,
  rowGap: 0,
  cornerRadius: 4,
  outlineWidth: 1,
  currentOutlineWidth: 2,

  // State-number labels above the five score rows.
  labelRowHeight: 12,
  labelGap: 1,
  labelFontSize: 9,
});


// ------------------------------------------------------------
// Colour conversion
// ------------------------------------------------------------

function rgbaString(
  value,
  label = 'colour'
) {
  if (
    !Array.isArray(value) ||
    value.length !== 4
  ) {
    throw new Error(
      `graphicScore: ${label} must be an ` +
      `RGBA array of length 4`
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
      `graphicScore: ${label} contains a ` +
      `non-numeric RGBA value`
    );
  }

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}


// ------------------------------------------------------------
// Sequence validation
// ------------------------------------------------------------

function validateSequence(sequence) {
  if (!Array.isArray(sequence)) {
    throw new Error(
      'graphicScore: sequence must be an array'
    );
  }

  if (sequence.length !== 31) {
    throw new Error(
      `graphicScore: expected 31 states; ` +
      `received ${sequence.length}`
    );
  }

  sequence.forEach(
    (state, stateIndex) => {
      if (
        !Array.isArray(state) ||
        state.length !== 5
      ) {
        throw new Error(
          `graphicScore: state ${stateIndex + 1} ` +
          `must contain exactly 5 bits`
        );
      }

      state.forEach(
        (bit, rowIndex) => {
          if (
            bit !== 0 &&
            bit !== 1
          ) {
            throw new Error(
              `graphicScore: invalid bit at ` +
              `state ${stateIndex + 1}, ` +
              `row ${rowIndex + 1}: ${bit}`
            );
          }
        }
      );
    }
  );
}


// ------------------------------------------------------------
// Hi-DPI off-screen canvas
// ------------------------------------------------------------

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

  if (
    !Number.isFinite(dpr) ||
    dpr <= 0
  ) {
    throw new Error(
      `graphicScore: invalid DPR ${dpr}`
    );
  }

  const canvas =
    document.createElement('canvas');

  canvas.width =
    Math.ceil(logicalWidth * dpr);

  canvas.height =
    Math.ceil(logicalHeight * dpr);

  const ctx =
    canvas.getContext('2d');

  if (!ctx) {
    throw new Error(
      'graphicScore: off-screen 2D context ' +
      'not available'
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


// ------------------------------------------------------------
// Rounded rectangle
// ------------------------------------------------------------

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


// ------------------------------------------------------------
// Draw one score cell
// ------------------------------------------------------------

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

  ctx.fillStyle = 
    fillStyle;

  ctx.fill();

  ctx.strokeStyle = COLOR_MAP.silver; 
//    outlineStyle;

  ctx.lineWidth =
    outlineWidth;

  ctx.stroke();
}


// ------------------------------------------------------------
// Draw one white outline around the complete current column
// ------------------------------------------------------------

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

  ctx.save();

  ctx.strokeStyle = 
    outlineStyle;

  ctx.lineWidth =
    outlineWidth;

  roundedRectPath(
    ctx,
    x,
    topY,
    cellWidth,
    stripHeight,
    cornerRadius
  );

  ctx.stroke();

  ctx.restore();
}


// ------------------------------------------------------------
// Pre-render pale or warm 31-state score strip
// ------------------------------------------------------------

function renderStrip(
  options = {}
) {
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

  const ctx =
    surface.ctx;

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

          drawCell(
            ctx,
            {
              x,
              y,
              width: cellWidth,
              height: cellHeight,
              radius: cornerRadius,
              fillStyle,
              outlineStyle,
              outlineWidth,
            }
          );
        }
      );
    }
  );
}


// ------------------------------------------------------------
// Draw state numbers using the score-column geometry
// ------------------------------------------------------------

function drawStateNumbers(
  ctx,
  options = {}
) {
  const {
    stateCount,
    stripX,
    columnAdvance,
    cellWidth,
    labelTopY,
    labelRowHeight,
    labelFontSize,
    labelColor,
  } = options;

  ctx.save();

  ctx.fontColor = labelColor;

  ctx.font =
	'10px "Helvetica Neue", Helvetica, Arial, sans-serif';

  ctx.textAlign =
    'center';

  ctx.textBaseline =
    'middle';

  const y =
    labelTopY +
    labelRowHeight * 0.5;

  for (
    let columnIndex = 0;
    columnIndex < stateCount;
    columnIndex += 1
  ) {
    const x =
      stripX +
      columnIndex * columnAdvance +
      cellWidth * 0.5;

    const stateNumber =
      columnIndex + 1;

    ctx.fillText(
      String(stateNumber),
      x,
      y
    );
  }

  ctx.restore();
}


// ------------------------------------------------------------
// Create graphic score
// ------------------------------------------------------------

export function createGraphicScore(
  options = {}
) {
  const {
    sequence,

    dpr =
      window.devicePixelRatio || 1,

  neutralRGBA =
    COLOR_MAP.transparent,

  gridRGBA =
    COLOR_MAP.silver,

  highlightRGBA =
    COLOR_MAP.white,

  textRGBA =
    COLOR_MAP.silver,

    geometry = {},
  } = options;

  validateSequence(sequence);


  // ----------------------------------------------------------
  // Resolve geometry
  // ----------------------------------------------------------

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
    labelRowHeight,
    labelGap,
    labelFontSize,
  } = resolvedGeometry;

  const numericGeometry = {
    cellWidth,
    cellHeight,
    columnGap,
    rowGap,
    cornerRadius,
    outlineWidth,
    currentOutlineWidth,
    labelRowHeight,
    labelGap,
    labelFontSize,
  };

  Object.entries(
    numericGeometry
  ).forEach(
    ([name, value]) => {
      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        throw new Error(
          `graphicScore: invalid geometry value ` +
          `${name}=${value}`
        );
      }
    }
  );

  if (
    cellWidth <= 0 ||
    cellHeight <= 0
  ) {
    throw new Error(
      'graphicScore: cellWidth and cellHeight ' +
      'must be greater than zero'
    );
  }

  if (
    labelRowHeight <= 0 ||
    labelFontSize <= 0
  ) {
    throw new Error(
      'graphicScore: labelRowHeight and ' +
      'labelFontSize must be greater than zero'
    );
  }


  // ----------------------------------------------------------
  // Row colours
  // ----------------------------------------------------------

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


// ----------------------------------------------------------
// Colours
// ----------------------------------------------------------

const neutralFillColor =
  rgbaString(
    neutralRGBA,
    'neutralRGBA'
  );

const gridOutlineColor =
  rgbaString(
    gridRGBA,
    'gridRGBA'
  );

const highlightOutlineColor =
  rgbaString(
    highlightRGBA,
    'highlightRGBA'
  );

const stateNumberColor =
  rgbaString(
    textRGBA,
    'textRGBA'
  );

  // ----------------------------------------------------------
  // Strip geometry
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // Pre-render surfaces
  // ----------------------------------------------------------

  const paleSurface =
    createHiDPICanvas(
      stripWidth,
      stripHeight,
      dpr
    );

  const warmSurface =
    createHiDPICanvas(
      stripWidth,
      stripHeight,
      dpr
    );



  // ----------------------------------------------------------
  // Render pale score
  // ----------------------------------------------------------

  renderStrip({
    sequence,
    surface: paleSurface,
    rowColors,
    neutralStyle,
    outlineStyle,
    geometry: resolvedGeometry,
    useWarmColors: false,
  });


  // ----------------------------------------------------------
  // Render warm score
  // ----------------------------------------------------------

  renderStrip({
    sequence,
    surface: warmSurface,
    rowColors,
    neutralStyle,
    outlineStyle,
    geometry: resolvedGeometry,
    useWarmColors: true,
  });


  // ----------------------------------------------------------
  // Draw score into visible canvas
  // ----------------------------------------------------------

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

      scoreGeometry =
        ctx.score,

      clipLeft = 0,

      clipRight =
        ctx.designW,
    } = drawOptions;


    // --------------------------------------------------------
    // Validate draw arguments
    // --------------------------------------------------------

    if (
      !Number.isInteger(stateIndex)
    ) {
      throw new Error(
        `graphicScore.draw: stateIndex must be ` +
        `an integer; received ${stateIndex}`
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
      !Number.isFinite(
        scoreGeometry.currentX
      ) ||
      !Number.isFinite(
        scoreGeometry.topY
      ) ||
      !Number.isFinite(
        scoreGeometry.height
      )
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


    // --------------------------------------------------------
    // Horizontal score position
    // --------------------------------------------------------

    const stripX =
      scoreGeometry.currentX -
      stateIndex * columnAdvance -
      cellWidth * 0.5;

    const currentColumnX =
      scoreGeometry.currentX -
      cellWidth * 0.5;

    const sourceColumnX =
      stateIndex * columnAdvance;


    // --------------------------------------------------------
    // Label position
    // --------------------------------------------------------

    const labelTopY =
      scoreGeometry.topY -
      labelGap -
      labelRowHeight;

    // --------------------------------------------------------
    // Compact diagnostic: once per state only
    // --------------------------------------------------------

    if (
      draw._lastLoggedState !==
      stateIndex
    ) {
      draw._lastLoggedState =
        stateIndex;

	console.log(
	  `[graphicScore]` +
	  ` state=${stateIndex + 1}` +
	  ` scoreY=${scoreGeometry.topY}` +
	  ` labelY=${labelTopY}` +
	  ` scoreH=${scoreGeometry.height}` +
	  ` labelH=${labelRowHeight}` +
	  ` gap=${labelGap}` +
	  ` canvasH=${ctx.designH}` +
	  ` stripX=${stripX}` +
	  ` currentX=${currentColumnX}`
	);
}


    // --------------------------------------------------------
    // Clip score + label region
    // --------------------------------------------------------

    ctx.save();

    ctx.beginPath();

    ctx.rect(
      clipLeft,
      labelTopY,
      clipRight - clipLeft,
      scoreGeometry.height +
        labelGap +
        labelRowHeight
    );

    ctx.clip();


    // --------------------------------------------------------
    // State numbers
    // --------------------------------------------------------
    
    drawStateNumbers(
      ctx,
      {
        stateCount:
          sequence.length,
    
        stripX,
    
        columnAdvance,
        cellWidth,
    
        labelTopY,
        labelRowHeight,
        labelFontSize,
        labelColor,
      }
    );

    // --------------------------------------------------------
    // Complete pale score strip
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Current warm column
    // --------------------------------------------------------

    ctx.drawImage(
      warmSurface.canvas,
      Math.round(
        sourceColumnX * dpr
      ),
      0,
      Math.round(
        cellWidth * dpr
      ),
      warmSurface.canvas.height,
      currentColumnX,
      scoreGeometry.topY,
      cellWidth,
      stripHeight
    );


// --------------------------------------------------------
// Single white outline around current five-row column
// --------------------------------------------------------

    drawCurrentColumnOutline(
      ctx,
      {
        x: currentColumnX,
        topY: scoreGeometry.topY,
        cellWidth,
        stripHeight,
        cornerRadius,
        outlineStyle: highlightOutlineStyle,
        outlineWidth: currentOutlineWidth,
      }
    );

    ctx.restore();    
  }


// ----------------------------------------------------------
// Creation diagnostic
// ----------------------------------------------------------

console.log(
  '[graphicScore] created',
  {
    states:
      sequence.length,

    rows:
      5,

    stripSize: [
      stripWidth,
      stripHeight,
    ],

    labels: {
      rowHeight:
        labelRowHeight,

      gap:
        labelGap,

      fontSize:
        labelFontSize,
    },

    backingSize: {
      pale: [
        paleSurface.canvas.width,
        paleSurface.canvas.height,
      ],

      warm: [
        warmSurface.canvas.width,
        warmSurface.canvas.height,
      ],
    },

    geometry:
      resolvedGeometry,

    dpr,
  }
);

  // ----------------------------------------------------------
  // Public interface
  // ----------------------------------------------------------

  return {
    draw,

    stateCount:
      sequence.length,

    rowCount:
      5,

    stripWidth,
    stripHeight,
    columnAdvance,

    geometry: {
      ...resolvedGeometry,
    },

    paleCanvas:
      paleSurface.canvas,

    warmCanvas:
      warmSurface.canvas,
  };
}