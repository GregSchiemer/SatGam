// runTime.js
// Start live performance interaction

import { drawCanvas, arrU } from './canvasUtils.js';
import { drawPhoneHenge25 } from './henge.js';
import { drawTopText, drawSubText, drawMidText, drawLowText, drawLeftText, drawRightText } from './text.js';
import { runConcert } from './animation.js';
import { redrawCanvas } from './canvasUtils.js';  // define
import { isInsideCircle } from './helpers.js';

// Entry point from main.js
export function runTimeStart() {
  let animationStopped = false;
  const { cnv, ctx } = arrU[0];

  // Ensure defaults from initCanvas()
  // ctx.concertClock = 1000; ctx.previewClock = 1; ctx.playRate = ctx.concertClock;

  if (window.role === 'leader') {
    // 1) Mode picker screen
    renderRateView();

    // When a mode is chosen, show the normal start screen
    attachModePicker(cnv, ctx, () => {
      // 2) Start screen (“tap clock to start”)
    renderStartView();

    // 3) Center tap starts the concert using the selected playRate
    attachCenterTapToStart(cnv, ctx, () => {
    if (animationStopped) return;
        animationStopped = true;
//        redrawCanvas();
        // ctx.playRate was set by attachModePicker to previewClock or concertClock
        runConcert(ctx);
      });
    });

  } else {
    // CONSORT: no picker, just the start screen at default playRate
    renderStartView();
    attachCenterTapToStart(cnv, ctx, () => {
      if (animationStopped) return;
      animationStopped = true;
      // ctx.playRate already defaults to concertClock (from initCanvas)
      runConcert(ctx);
    });
  }
}

/* ---------- UI screens ---------- */

function renderRateView() {
  drawCanvas(0);
  drawTopText('select MODE');
  drawLeftText('PREVIEW');
  drawRightText('CONCERT');
  drawLowText('CONCERT MODE');
}

function renderStartView() {
  drawCanvas(0);
  drawPhoneHenge25(18);
  let seconds = 0;
  const timeStr = clockify(seconds);
  drawTopText('Phonehenge');
  drawSubText('tap clock to start');
  drawMidText(timeStr);
}

/* ---------- Helpers ---------- */

function attachModePicker(cnv, ctx, onChosen) {
  const handler = (e) => {
    const rect = cnv.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    const hitRadiusX = 60, hitRadiusY = 30;
    const inLeft  = Math.abs(mX - ctx.l) <= hitRadiusX && Math.abs(mY - ctx.h*0.5) <= hitRadiusY;
    const inRight = Math.abs(mX - ctx.r) <= hitRadiusX && Math.abs(mY - ctx.h*0.5) <= hitRadiusY;
    if (!inLeft && !inRight) return;
    
//    drawCanvas(0);
//    saveCanvasBackground(ColorFamily.NONE);
    
    if (inLeft) {
      ctx.playRate = ctx.previewClock;
      drawLowText('PREVIEW MODE');
    } else if (inRight) {
      ctx.playRate = ctx.concertClock;
      drawLowText('CONCERT MODE');
    }

    cnv.removeEventListener('click', handler);
    onChosen && onChosen();
  };
  cnv.addEventListener('click', handler);
}

function attachCenterTapToStart(cnv, ctx, onStart) {
  const goSelectHandler = (e) => {
    const rect = cnv.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;
    const x = ctx.mid.x,
      y = ctx.mid.y,
      r = ctx.tapRadius;

    if (!isInsideCircle(mX, mY, x, y, r)) {
      console.warn('⚠️ Off centre. Try again');
      return;
    }
    cnv.removeEventListener('click', goSelectHandler);
    console.log('✅ animation running');
    if (onStart) onStart();
  };
  cnv.addEventListener('click', goSelectHandler);
}

/* ---------- Clock formatting (existing) ---------- */

export function clockify(t) {
  return mins(t) + secs(t);
}

function mins(t) {
  const m = Math.floor(t / 60);
  return m < 10 ? '0' + m + ':' : m + ':';
}

function secs(t) {
  const s = Math.floor(t % 60);
  return s < 10 ? '0' + s : s;
}
