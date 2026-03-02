/* text.js */

import { arrT } from './canvasUtils.js';
import { ColorFamily, TextColorByFamily } from './color.js';

export function drawTopText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.h * 0.10;
  drawText(ctxT, status, text, x, y, 30);
}

export function drawSubText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.h * 0.17;
  drawText(ctxT, status, text, x, y, 24);
}

export function drawMidText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.mid.y;
  chooseTextColorForBackground(status);
  drawText(ctxT, status, text, x, y, 30);
}

export function drawLowText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.h * 0.90;
  drawText(ctxT, status, text, x, y, 18);
}

export function drawLeftText(ctxT, status, text) {
  const x = ctxT.left.x, y = ctxT.h * 0.50;
  drawText(ctxT, status, text, x, y, 24);
}

export function drawRightText(ctxT, status, text) {
  const x = ctxT.right.x, y = ctxT.h * 0.50;
  drawText(ctxT, status, text, x, y, 24);
}


function drawText(ctxT, status, text, x, y, size) {

  if (!status || typeof status !== 'object') {
    throw new Error(`[drawText] expected status object as 2nd arg, got ${typeof status}`);
  }
  if (typeof text !== 'string') {
    throw new Error(`[drawText] expected text string as 3rd arg, got ${String(text)}`);
  }

  ctxT.font = `${size}px Helvetica Neue, Helvetica, Arial, sans-serif`;
  ctxT.fillStyle = status.textColor ?? 'white';   // ✅ always set here
  ctxT.textAlign = 'center';
  ctxT.textBaseline = 'middle';
  ctxT.shadowColor = 'transparent';
  ctxT.fillText(text, x, y);
}

export function chooseTextColorForBackground(status) {
  const family = status.bgFamilyTarget ?? status.bgFamily ?? ColorFamily.NONE;

  if (family === ColorFamily.YELLOW || family === ColorFamily.GREEN) {
	  status.textColor = '#AAA' // softer “black”
      return;
  }
  status.textColor = 'white'
  return;
}


export function renderStartBoth(ctxT, status) {
  drawTopText(ctxT, status, 'Phonehenge');
  drawSubText(ctxT, status, 'tap clock to start');
  drawMidText(ctxT, status, '00:00');
  drawLowText(ctxT, status, lowStartLine(status));
}

export function renderStartLeader(ctxT, status) {
  drawSubText(ctxT, status, 'select MODE');
  drawLeftText(ctxT, status, 'PREVIEW');
  drawRightText(ctxT, status, 'CONCERT');
  drawLowText(ctxT, status, lowStartLine(status));
//  console.log('[renderStartLeader] textColor =', status.textColor, 'bg =', status.bgName ?? status.bgIndex);
}

export function renderRunning(ctxT, { status, mins, secs }) {
  drawTopText(ctxT, status, String(status.index + 1));
  drawMidText(ctxT, status, `${mins}:${secs}`);
}

// End view
export function renderEnd(ctxT, status) {
  drawTopText(ctxT, status, 'Phonehenge');
  drawMidText(ctxT, status, 'Duration : 12:24');
  drawLowText(ctxT, status, 'G. Schiemer © 2025');
}

export function renderDebug(ctxT, { status, mins, secs, bitPattern = '' }) {
  drawTopText(ctxT, status, String(status.index + 1));
  drawSubText(ctxT, status, bitPattern);
  drawMidText(ctxT, status, `${mins}:${secs}`);
  drawLowText(ctxT, status, 'DEBUG');
}

function lowStartLine(status) {
  // Start View (not running): show key id if available
  if (!status.running) {
    const k = status.lastKeyIndex;
    if (Number.isInteger(k)) return `Key ${k}`;

    // If no key selected yet, show audio readiness once primed
    if (status.audioReady) return "AUDIO READY";
  }

  // Fallback: show mode
  const m = status.modeChosen ? String(status.modeChosen).toUpperCase() : "CONCERT";
  return `${m} MODE`;
}

// text.js
export function renderModeSelectLeader(ctxT, status) {
  drawTopText(ctxT, status, 'Phonehenge');
  drawSubText(ctxT, status, status.modeChosen === 'preview' ? 'PREVIEW MODE' : 'CONCERT MODE');
  drawMidText(ctxT, status, 'tap left/right to choose');
  drawLowText(ctxT, status, 'tap bottom text to confirm'); // never AUDIO READY here
}


/*
function lowStartLine(status) {
  // Show key id only before animation starts
  if (!status.running) { //if (!status?.running) {
    const k = status.lastKeyIndex;//const k = status?.lastKeyIndex;
    if (Number.isInteger(k)) return `Key ${k}`;
  }
  // Fallback: show mode
    const m = status.modeChosen ? String(status.modeChosen).toUpperCase() : 'CONCERT'; //const m = status?.modeChosen ? (etc))
  return `${m} MODE`;
}
*/
