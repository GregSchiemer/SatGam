/* text.js */

import { arrU } from './canvasUtils.js';

export function drawTopText(text) {
  const { ctx } = arrU[0];
  const x = ctx.mid.x, y = ctx.h * 0.10;
  drawText(ctx, text, x, y, 30);
}

export function drawSubText(text) {
  const { ctx } = arrU[0];
  const x = ctx.mid.x, y = ctx.h * 0.17;
  drawText(ctx, text, x, y, 24);
}

export function drawMidText(text) {
  const { ctx } = arrU[0];
  const x = ctx.mid.x, y = ctx.h * 0.50;
  drawText(ctx, text, x, y, 24);
}

export function drawLowText(text) {
  const { ctx } = arrU[0];
  const x = ctx.mid.x, y = ctx.h * 0.90;
  drawText(ctx, text, x, y, 18);
}

function drawText(ctx, text, x, y, size) {
  ctx.font = `${size}px Helvetica Neue, Helvetica, Arial, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent'; // no text shadow
  ctx.fillText(text, x, y);
}
