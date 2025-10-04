// canvasUtils.js
// Custom canvas drawing methods.

import { ColorFamily, setLinearGradient } from './color.js';
export const arrU = []; // array for universal properties
export const arrK = []; // array for keys
       const arrB = []; // array for background

export function initCanvas() {
  const cnv = document.getElementById('mobile');
  const ctx = cnv.getContext('2d');
  const lateralOffset = 80;
  const concertClock = 1000; // milliseconds
  const previewClock = 1; // millisecond

  ctx.w = cnv.width;
  ctx.h = cnv.height;
  ctx.t = ctx.h * 0.10;
  ctx.mid = { x: ctx.w / 2, y: ctx.h / 2 };
  ctx.l = ctx.mid.x - lateralOffset;
  ctx.r = ctx.mid.x + lateralOffset;
  ctx.pi2 = parseFloat((2 * Math.PI).toFixed(2));
  ctx.concertClock = concertClock;
  ctx.previewClock = previewClock;
  ctx.playRate = concertClock;
  ctx.tapRadius = 50;
  ctx.cornerRadius = 25;

  arrU.push({ cnv, ctx });
}

// Keep your existing arrU/arrB declarations as they were before
// and DO NOT redeclare them elsewhere.

export function saveCanvasBackground(family = 0) {
  const { ctx } = arrU[0];
  // Store just the spec, not the state stack
  arrB[0] = { ctxB: ctx, family: (typeof family === 'number' ? family : 0) };
}

export function drawCanvas(fOverride) {
  const { ctxB, family } = arrB[0];
  const f = (typeof fOverride === 'number') ? fOverride : family;

  ctxB.save();                         // save NOW
  ctxB.cornerRadius = 25;
  ctxB.shadowColor = 'lightgrey';
  ctxB.shadowOffsetX = 0;
  ctxB.shadowOffsetY = -2.5;
  ctxB.strokeStyle = 'grey';
  ctxB.fillStyle = pickBackground(ctxB, f);

  ctxB.beginPath();
  ctxB.roundRect(0, 0, ctxB.w, ctxB.h, ctxB.cornerRadius);
  ctxB.fill();
  ctxB.stroke();
  ctxB.closePath();

  ctxB.restore();                      // restore AFTER drawing
}

/*23 pick background colour*/
function pickBackground(ctxB, f){
/*make gradient vertical*/
const gradient = ctxB.createLinearGradient(0, ctxB.h, 0, 0);
switch(f){
	case 0:/*orphan canvas*/
		var background = setLinearGradient(f, gradient);
	return background;
	default:/*1-to-5 family canvas*/
		var background = setLinearGradient(f, gradient);
	return background;
	}
}

export function clearCanvas(ctx) {
	ctx.clearRect(0, 0, ctx.w, ctx.h);
	}

export function redrawCanvas(ctx){
	  ctx.fillStyle  = 'grey';
	  ctx.beginPath();
	  ctx.roundRect(0, 0, ctx.w, ctx.h, 25);
	  ctx.fill();
	  ctx.stroke();
	  ctx.closePath();
	}

