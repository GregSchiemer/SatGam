// color.js

// Optional enum for clarity and maintainability
export const ColorFamily = Object.freeze({
  NONE: 0,
  YELLOW: 1,
  RED: 2,
  GREEN: 3,
  BLUE: 4,
  MAGENTA: 5,
});

// Central color dictionary (RGBA format)
const COLOR_MAP = {
  warmY: [235, 235, 0, 1],
  paleY: [255, 255, 168, 1],
  warmR: [255, 16, 64, 1],
  paleR: [255, 128, 140, 1],
  warmG: [64, 255, 0, 1],
  paleG: [144, 255, 128, 1],
  warmB: [0, 180, 255, 1],
  paleB: [124, 255, 255, 1],
  warmM: [255, 80, 255, 1],
  paleM: [255, 208, 255, 1],
};

// Convert shorthand name to CSS `rgba(...)` string
export function color(name) {
  const rgba = COLOR_MAP[name];
  if (!rgba) {
    console.warn(`⚠️ Unknown color key: '${name}'`);
    return 'rgba(200, 200, 200, 1)'; // fallback gray
  }
  return `rgba(${rgba.join(',')})`;
}

// Create and return a vertical linear gradient for the canvas
export function setLinearGradient(family, gradient) {
  let warm, pale;

  switch (family) {
    case ColorFamily.YELLOW:
      warm = color('warmY');
      pale = color('paleY');
      break;
    case ColorFamily.RED:
      warm = color('warmR');
      pale = color('paleR');
      break;
    case ColorFamily.GREEN:
      warm = color('warmG');
      pale = color('paleG');
      break;
    case ColorFamily.BLUE:
      warm = color('warmB');
      pale = color('paleB');
      break;
    case ColorFamily.MAGENTA:
      warm = color('warmM');
      pale = color('paleM');
      break;
    default:
      warm = 'dimgray';
      pale = 'silver';
      break;
  }

  gradient.addColorStop(1, warm);
  gradient.addColorStop(0, pale);
  return gradient;
}
