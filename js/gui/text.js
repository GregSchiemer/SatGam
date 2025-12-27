/* text.js */

//import { arrT } from './main.js';
import { arrT } from './canvasUtils.js';

export function drawTopText(ctx, text) {
  const x = ctx.mid.x, y = ctx.h * 0.10;
  drawText(ctx, text, x, y, 30);
}

export function drawSubText(ctx, text) {
  const x = ctx.mid.x, y = ctx.h * 0.17;
  drawText(ctx, text, x, y, 24);
}

export function drawMidText(ctx, text) {
  const x = ctx.mid.x, y = ctx.mid.y;
  drawText(ctx, text, x, y, 30);
}

export function drawLowText(ctx, text) {
  const x = ctx.mid.x, y = ctx.h * 0.90;
  drawText(ctx, text, x, y, 18);
}

export function drawLeftText(ctx, text) {
  const x = ctx.left.x, y = ctx.h * 0.50;
  drawText(ctx, text, x, y, 24);
}

export function drawRightText(ctx, text) {
  const x = ctx.right.x, y = ctx.h * 0.50;
  drawText(ctx, text, x, y, 24);
}

function drawText(ctx, text, x, y, size) {
  ctx.font = `${size}px Helvetica Neue, Helvetica, Arial, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent'; // no text shadow
  ctx.fillText(text, x, y);
}

//  drawLowText(`${mode.toUpperCase()} MODE`);

export function renderStartBoth(ctx, status) {
  drawTopText(ctx, 'Phonehenge');
  drawSubText(ctx, 'tap clock to start');
  drawMidText(ctx, '00:00');
  drawLowText(ctx, `${status.modeChosen.toUpperCase()} MODE`);
}

export function renderStartLeader(ctx, status) {
//  drawTopText(ctx, 'Phonehenge');
  drawSubText(ctx, 'select MODE');
  drawLeftText(ctx, 'PREVIEW');
  drawRightText(ctx, 'CONCERT');
  drawLowText(ctx, `${status.modeChosen.toUpperCase()} MODE`);
}

// Running view (both leader & consort)
export function renderRunning(ctx, { status, mins, secs }) {
  drawTopText(ctx, String(status.index + 1));
  drawMidText(ctx, `${mins}:${secs}`);
}

// End view
export function renderEnd(ctx, status) {
  drawTopText(ctx, 'Phonehenge');
  drawMidText(ctx, 'Duration : 12:24');
  drawLowText(ctx, 'G. Schiemer © 2025');
}
