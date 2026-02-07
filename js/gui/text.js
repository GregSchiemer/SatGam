/* text.js */

//import { arrT } from './main.js';
import { arrT } from './canvasUtils.js';

export function drawTopText(ctxT, text) {
  const x = ctxT.mid.x, y = ctxT.h * 0.10;
  drawText(ctxT, text, x, y, 30);
}

export function drawSubText(ctxT, text) {
  const x = ctxT.mid.x, y = ctxT.h * 0.17;
  drawText(ctxT, text, x, y, 24);
}

export function drawMidText(ctxT, text) {
  const x = ctxT.mid.x, y = ctxT.mid.y;
  drawText(ctxT, text, x, y, 30);
}

export function drawLowText(ctxT, text) {
  const x = ctxT.mid.x, y = ctxT.h * 0.90;
  drawText(ctxT, text, x, y, 18);
}

export function drawLeftText(ctxT, text) {
  const x = ctxT.left.x, y = ctxT.h * 0.50;
  drawText(ctxT, text, x, y, 24);
}

export function drawRightText(ctxT, text) {
  const x = ctxT.right.x, y = ctxT.h * 0.50;
  drawText(ctxT, text, x, y, 24);
}

function drawText(ctxT, text, x, y, size) {
  ctxT.font = `${size}px Helvetica Neue, Helvetica, Arial, sans-serif`;
  ctxT.fillStyle = 'white';
  ctxT.textAlign = 'center';
  ctxT.textBaseline = 'middle';
  ctxT.shadowColor = 'transparent'; // no text shadow
  ctxT.fillText(text, x, y);
}

export function renderStartBoth(ctxT, status) {
  drawTopText(ctxT, 'Phonehenge');
  drawSubText(ctxT, 'tap clock to start');
  drawMidText(ctxT, '00:00');
//  drawLowText(ctxT, `${status.modeChosen.toUpperCase()} MODE`);
  drawLowText(ctxT, lowStartLine(status));
}

export function renderStartLeader(ctxT, status) {
  drawSubText(ctxT, 'select MODE');
  drawLeftText(ctxT, 'PREVIEW');
  drawRightText(ctxT, 'CONCERT');
//  drawLowText(ctxT, `${status.modeChosen.toUpperCase()} MODE`);
  drawLowText(ctxT, lowStartLine(status));
}


// Running view (both leader & consort)
export function renderRunning(ctxT, { status, mins, secs }) {
  drawTopText(ctxT, String(status.index + 1));
  drawMidText(ctxT, `${mins}:${secs}`);
}

/*
// Running view (both leader & consort)
export function renderRunning(ctxT, { status, mins, secs }) {
  drawTopText(ctxT, String(status.index + 1));
  drawMidText(ctxT, `${mins}:${secs}`);
  const k = Number.isInteger(status?.lastKeyIndex) ? (status.lastKeyIndex) : null;
  drawLowText(ctxT, k ? `Key ${k}` : '');
}
*/

// End view
export function renderEnd(ctxT, status) {
  drawTopText(ctxT, 'Phonehenge');
  drawMidText(ctxT, 'Duration : 12:24');
  drawLowText(ctxT, 'G. Schiemer © 2025');
}

export function renderDebug(ctxT, { status, mins, secs, bitPattern = '' }) {
  drawTopText(ctxT, String(status.index + 1));
  drawSubText(ctxT, bitPattern);
  drawMidText(ctxT, `${mins}:${secs}`);
  drawLowText(ctxT, 'DEBUG');
}

function lowStartLine(status) {
  // Show key id only before animation starts
  if (!status?.running) {
    const k = status?.lastKeyIndex;
    if (Number.isInteger(k)) return `Key ${k}`;
  }
  // Fallback: show mode
  const m = status?.modeChosen ? String(status.modeChosen).toUpperCase() : 'CONCERT';
  return `${m} MODE`;
}

