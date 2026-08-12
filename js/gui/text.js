/* text.js */

import { arrT } from './canvasUtils.js';
import { ColorFamily, TextColorByFamily, warmColorForFamily } from './color.js';

export function drawTopText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.top.y;
  drawText(ctxT, status, text, x, y, 30);
}

export function drawSubText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.sub.y;
  drawText(ctxT, status, text, x, y, 18);
}

export function drawMidText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.mid.y;
  chooseTextColorForBackground(status);
  drawText(ctxT, status, text, x, y, 30);
}

export function drawLowText(ctxT, status, text) {
  const x = ctxT.mid.x, y = ctxT.low.y;
  drawText(ctxT, status, text, x, y, 18);
}

export function drawLeftText(ctxT, status, text) {
  const x = ctxT.left.x, y = ctxT.mid.y;
  drawText(ctxT, status, text, x, y, 24);
}

export function drawRightText(ctxT, status, text) {
  const x = ctxT.right.x, y = ctxT.mid.y;
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

function renderPreviewKeyID(ctxT, status) {
  if (
    status.modeChosen === 'preview' &&
    !status.running &&
    Number.isInteger(status.lastKeyIndex)
  ) {
    drawTappedKeyID(ctxT, status);
    return true;
  }

  return false;
}

export function renderStartLeader(ctxT, status) {
  drawTopText(ctxT, status, 'Phonehenge');
  drawSubText(ctxT, status, 'tap clock to start');
  drawMidText(ctxT, status, '00:00');

  if (renderPreviewKeyID(ctxT, status)) {
    return;
  }

  drawLowText(
    ctxT,
    status,
    showMode(status)
  );
}

export function renderEntryConsort(ctxT, status) {
  drawSubText(ctxT, status, 'tap wake to activate');
  drawMidText(ctxT, status, 'wake');
}

export function renderStartConsort(ctxT, status) {
  drawTopText(ctxT, status, 'Phonehenge');
  drawSubText(ctxT, status, 'henge plays : ● mutes');

  if (status.modeChosen === 'preview') {
    drawMidText(
      ctxT,
      status,
      status.previewSoundActive ? '●' : '○'
    );
  }

  if (renderPreviewKeyID(ctxT, status)) {
    return;
  }

  drawLowText(
    ctxT,
    status,
    status.modeChosen === 'preview'
      ? 'PREVIEW MODE'
      : 'CONCERT MODE'
  );
}

export function renderRunning(ctxT, { status, mins, secs }) {
  drawTopText(ctxT, status, String(status.index + 1));
  drawSubText(ctxT, status, makeSubText(status));
  drawMidText(ctxT, status, `${mins}:${secs}`);
}

export function renderEntryLeader(ctxT, status) {
  drawSubText(ctxT, status, 'select MODE');
  drawLeftText(ctxT, status, 'PREVIEW');
  drawRightText(ctxT, status, 'CONCERT');
  drawLowText(ctxT, status, showMode(status)); 
}

export function makeSubText(status) {
  // Only show indicator in Running View (concert)
  if (!(status.modeChosen === "concert" && status.running)) return "";

  const limit = status.tapLimit ?? 0;
  const used = status.tapsThisState ?? 0;
  const remaining = Math.max(0, limit - used);

  let out = "●".repeat(remaining) + "○".repeat(Math.max(0, limit - remaining));
  if (status.hengeLocked) out = "○".repeat(limit);

  return out;
}

// End view
export function renderEnd(ctxT, status) {
  drawTopText(ctxT, status, 'Phonehenge');
  drawMidText(ctxT, status, 'Duration : 12:24');
  drawLowText(ctxT, status, 'G. Schiemer © 2026');
}

export function renderDebug(ctxT, { status, mins, secs, bitPattern = '' }) {
  drawTopText(ctxT, status, String(status.index + 1));
  drawSubText(ctxT, status, bitPattern);
  drawMidText(ctxT, status, `${mins}:${secs}`);
  drawLowText(ctxT, status, 'DEBUG');
}

function isStartView(status) {
  return status.leaderModeConfirmed && !status.running && !status.isEndScreen;
}

function showMode(status) {
  if (isStartView(status)) {
    if (status.modeChosen === 'concert') {
      if (status.audioStage === 'loading') {
        return 'MAKING AUDIO...';
      }

	   if (status.audioStage === 'prepared') {     
        return 'CONCERT READY';
      }

      if (status.audioStage === 'failed') {
        return 'AUDIO FAILED';
      }
      
      return 'CONCERT MODE';
    }
    
    return 'PREVIEW MODE';
  }

  const mode =
    status.modeChosen
      ? String(status.modeChosen).toUpperCase()
      : 'CONCERT';

  return `${mode} MODE`;
}

export function drawTappedKeyID(ctxT, status) {
  if (status.modeChosen !== 'preview') return;
  if (status.running) return;

  const keyID = status.lastKeyIndex;

  if (
    !Number.isInteger(keyID) ||
    keyID < 1 ||
    keyID > 25
  ) {
    return;
  }

  const previousTextColor = status.textColor;

  try {
    status.textColor =
      warmColorForFamily(status.tapFamily);

    drawLowText(
      ctxT,
      status,
      `Key ${keyID}`
    );
  } finally {
    status.textColor = previousTextColor;
  }
}