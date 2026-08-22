// tools/exportGraphicScore.mjs
//
// Export the complete 31-state Satellite Gamelan graphic score
// as a PNG.
//
// Usage:
//
//   Full score:
//   node --experimental-default-type=module tools/exportGraphicScore.mjs
//
//   Full score with state labels:
//   node --experimental-default-type=module tools/exportGraphicScore.mjs --labels
//
//   Highlight state 9:
//   node --experimental-default-type=module tools/exportGraphicScore.mjs 9
//
//   Highlight state 9 with labels:
//   node --experimental-default-type=module tools/exportGraphicScore.mjs 9 --labels
//

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { sequence } from '../js/gui/sequence.js';
import { COLOR_MAP } from '../js/gui/color.js';

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


// ------------------------------------------------------------
// CLI arguments
// ------------------------------------------------------------

const args =
  process.argv.slice(2);

const showLabels =
  args.includes('--labels');

const unknownOptions =
  args.filter(
    (arg) =>
      arg.startsWith('--') &&
      arg !== '--labels'
  );

if (unknownOptions.length > 0) {
  throw new Error(
    `Unknown option: ${unknownOptions.join(', ')}`
  );
}

const positionalArgs =
  args.filter(
    (arg) =>
      !arg.startsWith('--')
  );

if (positionalArgs.length > 1) {
  throw new Error(
    'Usage: exportGraphicScore.mjs [state-number] [--labels]'
  );
}

let stateNumber = null;
let stateIndex = null;

if (positionalArgs.length === 1) {
  stateNumber =
    Number(positionalArgs[0]);

  if (
    !Number.isInteger(stateNumber) ||
    stateNumber < 1 ||
    stateNumber > sequence.length
  ) {
    throw new Error(
      `State number must be an integer from 1 to ${sequence.length}`
    );
  }

  stateIndex =
    stateNumber - 1;
}


// ------------------------------------------------------------
// Geometry
// ------------------------------------------------------------

const cellWidth = 22;
const cellHeight = 11;

const columnGap = 0;
const rowGap = 0;

const columnAdvance =
  cellWidth + columnGap;

const rowAdvance =
  cellHeight + rowGap;

const cornerRadius = 4;

const outlineWidth = 1;
const currentOutlineWidth = 1;

// Optional label row above the score.
const labelRowHeight = 12;
const labelGap = 1;
const labelFontSize = 9;

const rowCount = 5;
const columnCount = sequence.length;

const scoreWidth =
  columnCount * cellWidth +
  (columnCount - 1) * columnGap;

const scoreHeight =
  rowCount * cellHeight +
  (rowCount - 1) * rowGap;


// ------------------------------------------------------------
// Colours
// ------------------------------------------------------------

const PALE_COLORS = [
  COLOR_MAP.paleY,
  COLOR_MAP.paleR,
  COLOR_MAP.paleG,
  COLOR_MAP.paleB,
  COLOR_MAP.paleM,
];

const WARM_COLORS = [
  COLOR_MAP.warmY,
  COLOR_MAP.warmR,
  COLOR_MAP.warmG,
  COLOR_MAP.warmB,
  COLOR_MAP.warmM,
];

const PALE_OUTLINE =
  COLOR_MAP.silver;

const CURRENT_OUTLINE =
  COLOR_MAP.white;


// ------------------------------------------------------------
// RGBA conversion
// ------------------------------------------------------------

function rgba(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 4
  ) {
    throw new Error(
      `Invalid RGBA colour: ${value}`
    );
  }

  const [r, g, b, a] =
    value;

  return `rgba(${r},${g},${b},${a})`;
}


// ------------------------------------------------------------
// Validate sequence
// ------------------------------------------------------------

if (
  !Array.isArray(sequence) ||
  sequence.length !== 31
) {
  throw new Error(
    `Expected 31 sequence states; received ${sequence?.length}`
  );
}

for (
  let state = 0;
  state < sequence.length;
  state += 1
) {
  const mask =
    sequence[state];

  if (
    !Array.isArray(mask) ||
    mask.length !== rowCount
  ) {
    throw new Error(
      `Invalid mask at state ${state + 1}`
    );
  }

  for (
    let row = 0;
    row < mask.length;
    row += 1
  ) {
    if (
      mask[row] !== 0 &&
      mask[row] !== 1
    ) {
      throw new Error(
        `Invalid bit at state ${state + 1}, row ${row + 1}: ${mask[row]}`
      );
    }
  }
}


// ------------------------------------------------------------
// SVG cell
// ------------------------------------------------------------

function makeCell({
  x,
  y,
  width = cellWidth,
  height = cellHeight,
  fill = 'none',
  stroke = 'none',
  strokeWidth = 0,
}) {
  return `
    <rect
      x="${x}"
      y="${y}"
      width="${width}"
      height="${height}"
      rx="${cornerRadius}"
      ry="${cornerRadius}"
      fill="${fill}"
      stroke="${stroke}"
      stroke-width="${strokeWidth}"
    />
  `;
}


// ------------------------------------------------------------
// Complete pale 31-state score
// ------------------------------------------------------------

const paleCells = [];

for (
  let state = 0;
  state < sequence.length;
  state += 1
) {
  const mask =
    sequence[state];

  const x =
    state * columnAdvance;

  for (
    let rowIndex = 0;
    rowIndex < rowCount;
    rowIndex += 1
  ) {
    const y =
      rowIndex * rowAdvance;

    const bit =
      mask[rowIndex];

    /*
     * A zero bit remains neutral/silver.
     * A one bit receives its pale family colour.
     */
    const fill =
      bit === 1
        ? rgba(PALE_COLORS[rowIndex])
        : rgba(PALE_OUTLINE);

    paleCells.push(
      makeCell({
        x,
        y,
        fill,
        stroke: rgba(PALE_OUTLINE),
        strokeWidth: outlineWidth,
      })
    );
  }
}


// ------------------------------------------------------------
// Optional warm active cells in current column
// ------------------------------------------------------------

const warmCells = [];

if (stateIndex !== null) {
  const currentX =
    stateIndex * columnAdvance;

  const mask =
    sequence[stateIndex];

  /*
   * Only active cells are added to warmCells.
   *
   * Zero bits create no overlay, allowing the existing
   * pale/neutral cell underneath to remain visible.
   */
  for (
    let rowIndex = 0;
    rowIndex < rowCount;
    rowIndex += 1
  ) {
    if (
      mask[rowIndex] !== 1
    ) {
      continue;
    }

    const y =
      rowIndex * rowAdvance;

    warmCells.push(
      makeCell({
        x: currentX,
        y,
        fill: rgba(
          WARM_COLORS[rowIndex]
        ),
        stroke: rgba(PALE_OUTLINE),
        strokeWidth: outlineWidth,
      })
    );
  }

  /*
   * One white outline identifies the current column.
   *
   * It surrounds the five coloured rows only.
   * The optional label above it is deliberately excluded.
   */
  warmCells.push(
    makeCell({
      x: currentX,
      y: 0,
      width: cellWidth,
      height: scoreHeight,
      fill: 'none',
      stroke: rgba(CURRENT_OUTLINE),
      strokeWidth:
        currentOutlineWidth,
    })
  );
}


// ------------------------------------------------------------
// Optional state-number label row
// ------------------------------------------------------------

const labelCells = [];

if (showLabels) {
  /*
   * Existing graphic score begins at y = 0.
   *
   * Labels are added above it rather than moving the
   * five existing rows downward.
   *
   * labelGap is therefore empty transparent space between
   * the bottom of the silver label row and the Yellow row.
   */
  const labelY =
    -(labelRowHeight + labelGap);

  for (
    let columnIndex = 0;
    columnIndex < columnCount;
    columnIndex += 1
  ) {
    const x =
      columnIndex * columnAdvance;

    const label =
      columnIndex + 1;

    // Silver label background.
// Floating silver state number.
labelCells.push(`
  <text
    x="${x + cellWidth / 2}"
    y="${labelY + labelRowHeight / 2}"
    fill="${rgba(PALE_OUTLINE)}"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="${labelFontSize}"
    font-weight="400"
    text-anchor="middle"
    dominant-baseline="central"
  >${label}</text>
 `);
 }
}


// ------------------------------------------------------------
// SVG dimensions
// ------------------------------------------------------------

const extraTopHeight =
  showLabels
    ? labelRowHeight + labelGap
    : 0;

const svgHeight =
  scoreHeight + extraTopHeight;

const viewBoxY =
  showLabels
    ? -extraTopHeight
    : 0;


// ------------------------------------------------------------
// Complete SVG
// ------------------------------------------------------------

const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${scoreWidth}"
  height="${svgHeight}"
  viewBox="0 ${viewBoxY} ${scoreWidth} ${svgHeight}"
  shape-rendering="geometricPrecision"
>
  ${labelCells.join('\n')}
  ${paleCells.join('\n')}
  ${warmCells.join('\n')}
</svg>
`;


// ------------------------------------------------------------
// Output path
// ------------------------------------------------------------

const outputDirectory =
  path.resolve(
    __dirname,
    '../assets/md-images'
  );

fs.mkdirSync(
  outputDirectory,
  {
    recursive: true,
  }
);

const outputFilename =
  stateNumber === null
    ? 'graphicScore.png'
    : `graphicScore-state${stateNumber}.png`;

const outputFile =
  path.join(
    outputDirectory,
    outputFilename
  );


// ------------------------------------------------------------
// Render PNG
// ------------------------------------------------------------

await sharp(
  Buffer.from(svg)
)
  .png()
  .toFile(outputFile);


// ------------------------------------------------------------
// Report
// ------------------------------------------------------------

console.log(
  '[graphicScore export]',
  {
    stateNumber,
    stateIndex,
    labels: showLabels,
    size: [
      scoreWidth,
      svgHeight,
    ],
    scoreSize: [
      scoreWidth,
      scoreHeight,
    ],
    outputFile,
  }
);