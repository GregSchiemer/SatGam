// tools/exportGraphicScore.mjs
//
// Usage:
//
//   Pale score only:
//   node --experimental-default-type=module tools/exportGraphicScore.mjs
//
//   Pale score + warm current column:
//   node --experimental-default-type=module tools/exportGraphicScore.mjs 18
//
// Valid optional stateIndex:
//   1..30
//
// Output:
//   assets/md-images/graphicScore.png
//   or
//   assets/md-images/graphicScore-state-18.png

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { sequence } from '../js/gui/sequence.js';
import { COLOR_MAP } from '../js/gui/color.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------
// Optional current-column argument
// ------------------------------------------------------------

const rawArg = process.argv[2];

let stateNumber = null;
let stateIndex = null;

if (rawArg !== undefined) {
  stateNumber = Number(rawArg);

  if (
    !Number.isInteger(stateNumber) ||
    stateNumber < 1 ||
    stateNumber > 31
  ) {
    console.error(
      'Usage: node --experimental-default-type=module ' +
      'tools/exportGraphicScore.mjs [stateNumber]'
    );

    console.error(
      'stateNumber is optional and, when supplied, ' +
      'must be an integer from 1 to 31.'
    );

    process.exit(1);
  }

  stateIndex = stateNumber - 1;
}

// ------------------------------------------------------------
// Geometry — match graphicScore.js
// ------------------------------------------------------------

const GEOMETRY = Object.freeze({
  cellWidth: 22,
  cellHeight: 11,
  columnGap: 0,
  rowGap: 0,
  cornerRadius: 4,
  outlineWidth: 1,
  currentOutlineWidth: 1,
});

const {
  cellWidth,
  cellHeight,
  columnGap,
  rowGap,
  cornerRadius,
  outlineWidth,
  currentOutlineWidth,
} = GEOMETRY;

const columnAdvance =
  cellWidth + columnGap;

const rowAdvance =
  cellHeight + rowGap;

const scoreWidth =
  sequence.length * columnAdvance -
  columnGap;

const scoreHeight =
  5 * rowAdvance -
  rowGap;

if (
  scoreWidth !== 682 ||
  scoreHeight !== 55
) {
  throw new Error(
    `Unexpected score size: ${scoreWidth} × ${scoreHeight}`
  );
}

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

function rgba(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 4
  ) {
    throw new Error(
      `Invalid RGBA colour: ${value}`
    );
  }

  const [r, g, b, a] = value;

  return `rgba(${r},${g},${b},${a})`;
}

// ------------------------------------------------------------
// SVG cell
// ------------------------------------------------------------

function makeCell({
  x,
  y,
  width = cellWidth,
  height = cellHeight,
  fill = "none",
  stroke = "none",
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
// Draw complete pale score from sequence.js
// ------------------------------------------------------------

const paleCells = [];

sequence.forEach(
  (state, columnIndex) => {
    state.forEach(
      (bit, rowIndex) => {
        const x =
          columnIndex * columnAdvance;

        const y =
          rowIndex * rowAdvance;

        const fill =
          bit === 1
            ? rgba(PALE_COLORS[rowIndex])
            : 'none';

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
    );
  }
);

// ------------------------------------------------------------
// Optional warm cells in current column
// ------------------------------------------------------------

const warmCells = [];

if (stateIndex !== null) {
  const currentX = stateIndex * columnAdvance;
  const mask = sequence[stateIndex];

  for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
    if (mask[rowIndex] !== 1) {
      continue;
    }

    const y = rowIndex * rowAdvance;

    warmCells.push(
      makeCell({
        x: currentX,
        y,
        fill: rgba(WARM_COLORS[rowIndex]),
      })
    );
  }

  // Single white outline around the complete current column
  warmCells.push(
    makeCell({
      x: currentX,
      y: 0,
      width: cellWidth,
      height: (4 * rowAdvance) + cellHeight,
      fill: "none",
      stroke: rgba(CURRENT_OUTLINE),
      strokeWidth: currentOutlineWidth,
    })
  );
}

// ------------------------------------------------------------
// Complete SVG
// ------------------------------------------------------------

const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${scoreWidth}"
  height="${scoreHeight}"
  viewBox="0 0 ${scoreWidth} ${scoreHeight}"
  shape-rendering="geometricPrecision"
>
  ${paleCells.join('\n')}
  ${warmCells.join('\n')}
</svg>
`;

// ------------------------------------------------------------
// Output
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

const outputFile =
  stateIndex === null
    ? path.join(
        outputDirectory,
        'graphicScore.png'
      )
    : path.join(
        outputDirectory,
		`graphicScore-state${stateNumber}.png`
      );

await sharp(
  Buffer.from(svg)
)
  .png()
  .toFile(outputFile);

console.log(
  '[graphicScore export]',
  {
    stateNumber,
    stateIndex,
    size: [
      scoreWidth,
      scoreHeight,
    ],
    outputFile,
  }
); // }
//);