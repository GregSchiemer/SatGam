// js/gui/debugSprites.js

export function saveCanvasAsPNG(canvas, filename = 'debug-canvas.png') {
  if (!canvas) {
    console.warn('[debugSprites] saveCanvasAsPNG: no canvas given');
    return;
  }

  try {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.warn('[debugSprites] saveCanvasAsPNG: toBlob produced null');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 2000);
      console.log(`[debugSprites] saved ${filename}`);
    }, 'image/png');
  } catch (err) {
    console.error('[debugSprites] failed to save canvas as PNG:', err);
  }
}

// Take an array of ImageBitmap (or canvas/image) sprites and save as a grid PNG
export function saveImageBitmapGrid({
  bitmaps,
  cols = 5,
  cellW,
  cellH,
  filename = 'sprites-grid.png',
}) {
  if (!Array.isArray(bitmaps) || bitmaps.length === 0) {
    console.warn('[debugSprites] saveImageBitmapGrid: no bitmaps given');
    return;
  }

  const first = bitmaps[0];
  const w = cellW || first.width  || 64;
  const h = cellH || first.height || 128;

  const rows = Math.ceil(bitmaps.length / cols);

  const off = document.createElement('canvas');
  off.width  = cols * w;
  off.height = rows * h;

  const ctx = off.getContext('2d');
  ctx.clearRect(0, 0, off.width, off.height);

  bitmaps.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // draw each sprite scaled into its cell
    ctx.drawImage(img, col * w, row * h, w, h);
  });

  saveCanvasAsPNG(off, filename);
}

// Optional: expose a canvas or atlas object on window for console use
export function exposeOnWindow(obj, name = 'debugObject') {
  window[name] = obj;
  console.log(`[debugSprites] exposed object as window.${name}`);
}//5
