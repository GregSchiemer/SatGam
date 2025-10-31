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

export function drawLeftText(text) {
  const { ctx } = arrU[0];
  const x = ctx.l, y = ctx.h * 0.50;
  drawText(ctx, text, x, y, 24);
}

export function drawRightText(text) {
  const { ctx } = arrU[0];
  const x = ctx.r, y = ctx.h * 0.50;
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

// Start view (both leader & consort)
export function renderStartBoth({ mode = 'preview' } = {}) {
  drawTopText('Phonehenge');
  drawSubText('tap clock to start');
  drawMidText('00:00');
  drawLowText(`${mode.toUpperCase()} MODE`);
}

// Start view (leader only)
export function renderStartLeader({ mode = 'preview' } = {}) {
  drawSubText('select MODE');
  drawLeftText('PREVIEW');
  drawRightText('CONCERT');
  drawLowText(`${mode.toUpperCase()} MODE`);
}

// Running view
export function renderRunning({ stateIndex, mins, secs }) {
  drawTopText(String(stateIndex));
  drawMidText(`${mins}:${secs}`);
}

// End view
export function renderEnd({ duration }) {
  drawTopText('Phonehenge');
  drawMidText(`duration : ${duration}`);
  drawLowText('G. Schiemer © 2025');
}


/*

// Start view (both leader & consort)
export function renderStartBoth( { mode = 'preview' } = {} ) {
  drawTopText('Phonehenge');
  drawSubText('tap clock to start');
  drawMidText('00:00');
  drawLowText(`${mode.toUpperCase()} MODE`);
}

// Start view (leader only)
export function renderStartLeader({ mode = 'preview' } = {} ) {
  drawSubText('select MODE');
  drawLeftText('PREVIEW');
  drawRightText('CONCERT');
  drawLowText(`${mode.toUpperCase()} MODE`);
}

// Running view
export function renderRunning({ stateIndex, mins, secs }) {
  drawTopText(String(stateIndex));
  drawMidText(`${mins}:${secs}`);
}

// End view
export function renderEnd({ duration }) {
  drawTopText('Phonehenge');
  drawMidText(`duration : ${duration}`);
  drawLowText('G. Schiemer © 2025');
}

*/