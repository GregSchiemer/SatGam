// runTime.js
// Start live performance interaction

import { drawCanvas, arrU } from './canvasUtils.js';
import { drawPhoneHenge25 } from './henge.js';
import {
  drawTopText,
  drawSubText,
  drawMidText,
  drawLowText,
  drawLeftText,
  drawRightText,
} from './text.js';
import { runConcert } from './animation.js';
import { isInsideCircle } from './helpers.js';

/**
 * Entry point from main.js
 * - Leader: mode picker → start screen (with back-to-picker tap on top) → center-tap starts
 * - Consort: start screen → center-tap starts
 */
export function runTimeStart() {
  let animationStopped = false;
  const { cnv, ctx } = arrU[0];

  // Resolve role once; default to "consort" if not set
  const role = (typeof window !== 'undefined' && window.role === 'leader') ? 'leader' : 'consort';
  console.log(`[runTimeStart] role=${role}`);

  if (role === 'leader') {
    // 1) Mode picker screen
    renderRateView();

    // When a mode is chosen, show the normal start screen
    attachModePicker(cnv, ctx, () => {
      // 2) Start screen (“tap clock to start”)
      renderStartView();

      // Leader-only: allow a deliberate tap on the top title band to go back to picker (pre-start only)
      const detachBackToPicker = attachBackToPickerOnTopTap(cnv, ctx, () => {
        // Re-show the picker (single-step back)
        renderRateView();
        attachModePicker(cnv, ctx, () => {
          renderStartView();
          // Re-attach the back-to-picker listener for the fresh start screen
          const detach2 = attachBackToPickerOnTopTap(cnv, ctx, () => {
            renderRateView();
          });
          // Center tap starts the concert
          attachCenterTapToStart(cnv, ctx, () => {
            if (animationStopped) return;
            animationStopped = true;
            detach2();                 // disable the back-to-picker once running
            runConcert(ctx);
          });
        });
      });

      // 3) Center tap starts the concert
      attachCenterTapToStart(cnv, ctx, () => {
        if (animationStopped) return;
        animationStopped = true;
        detachBackToPicker();          // disable the back-to-picker once running
        runConcert(ctx);
      });
    });

    return; // done with leader path
  }

  // CONSORT: no picker, straight to start screen at default playRate (from initCanvas)
  renderStartView();
  attachCenterTapToStart(cnv, ctx, () => {
    if (animationStopped) return;
    animationStopped = true;
    runConcert(ctx);
  });
}

/* ---------- UI screens ---------- */

function renderRateView() {
  drawCanvas(0);
  drawTopText('select MODE');
  drawLeftText('PREVIEW');
  drawRightText('CONCERT');
  // Show a hint in the low area (will be replaced when a mode is chosen)
  drawLowText('PREVIEW MODE');
}

function renderStartView() {
  drawCanvas(0);
  drawPhoneHenge25(18);

  const timeStr = clockify(0);
  drawTopText('Phonehenge');
  drawSubText('tap clock to start');
  drawMidText(timeStr);

  // For leader, show the chosen mode if available
  const { ctx } = arrU[0];
  if (ctx.modeLabel) {
    drawLowText(ctx.modeLabel);
  }
}

/* ---------- Helpers ---------- */

// Leader-only: while on the start screen, a deliberate tap on the top title area goes back to the mode picker.
// Returns a function to detach the listener.
function attachBackToPickerOnTopTap(cnv, ctx, onBack) {
  const handler = (e) => {
    const rect = cnv.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    // Hit test a horizontal band around the title Y (ctx.t ≈ 10% of height)
    const topY = ctx.t || ctx.h * 0.10;
    const bandHalf = 30; // ~60px tall
    const inTopTitleBand = (mY >= (topY - bandHalf) && mY <= (topY + bandHalf));

    if (!inTopTitleBand) return;

    cnv.removeEventListener('click', handler);
    if (onBack) onBack();
  };

  cnv.addEventListener('click', handler);
  return () => cnv.removeEventListener('click', handler);
}

// Mode picker: choose PREVIEW or CONCERT by tapping near left/right anchors.
// Sets ctx.playRate and ctx.modeLabel, then calls onChosen().
function attachModePicker(cnv, ctx, onChosen) {
  const handler = (e) => {
    const rect = cnv.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    // Simple hit zones around the left/right label anchors
    const hitRadiusX = 60;
    const hitRadiusY = 30;
    const yAnchor = ctx.h * 0.50;

    const inLeft =
      Math.abs(mX - ctx.l) <= hitRadiusX && Math.abs(mY - yAnchor) <= hitRadiusY;
    const inRight =
      Math.abs(mX - ctx.r) <= hitRadiusX && Math.abs(mY - yAnchor) <= hitRadiusY;

    if (!inLeft && !inRight) return;

    if (inLeft) {            // PREVIEW
      ctx.playRate  = ctx.previewClock;  // defined in initCanvas()
      ctx.modeLabel = 'PREVIEW MODE';
      drawLowText('PREVIEW MODE');
    } else if (inRight) {    // CONCERT
      ctx.playRate  = ctx.concertClock;  // defined in initCanvas()
      ctx.modeLabel = 'CONCERT MODE';
      drawLowText('CONCERT MODE');
    }

    cnv.removeEventListener('click', handler);
    if (onChosen) onChosen();
  };

  cnv.addEventListener('click', handler);
}

// Center-tap to start (shared by leader & consort)
function attachCenterTapToStart(cnv, ctx, onStart) {
  const handler = (e) => {
    const rect = cnv.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    const { x, y } = ctx.mid;
    const r = ctx.tapRadius;

    if (!isInsideCircle(mX, mY, x, y, r)) {
      console.warn('⚠️ Off centre. Try again');
      return;
    }
    cnv.removeEventListener('click', handler);
    onStart && onStart();
  };
  cnv.addEventListener('click', handler);
}

/* ---------- Clock formatting ---------- */

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
