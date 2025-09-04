// canvasUtils.js - custom canvas drawing methods.

import { ColorFamily, setLinearGradient } from './color.js';
export const arrU = [];
const arrB = [];

export function initCanvas() {
  const cnv = document.getElementById('mobile');

  // Dynamically size the canvas
  cnv.width = window.innerWidth;
  cnv.height = window.innerHeight;

  const ctx = cnv.getContext('2d');
  ctx.w = cnv.width;
  ctx.h = cnv.height;
  ctx.mid = { x: ctx.w / 2, y: ctx.h / 2 };
  ctx.pi2 = parseFloat((2 * Math.PI).toFixed(2));
  ctx.tapRadius = 50;
  ctx.cornerRadius = 25;

  arrU.push({ cnv, ctx });

  // Optional: log the dynamic size
  console.log(`📱 Canvas sized: ${ctx.w} × ${ctx.h}`);
}

export function saveCanvasBackground(f) {
  const { ctx } = arrU[0];
  const ctxB = ctx;

  ctxB.cornerRadius = 25;
  ctxB.shadowColor = 'lightgrey';
  ctxB.shadowOffsetX = 0;
  ctxB.shadowOffsetY = -2.5;
  ctxB.strokeStyle = 'grey';
  ctxB.fillStyle = pickBackground(ctxB, f);
//  ctxB.fillStyle = 'whitesmoke';

  arrB.push({ ctxB });
}

export function drawCanvas() {
  const { ctxB } = arrB[0];
  ctxB.beginPath();
  ctxB.roundRect(0, 0, ctxB.w, ctxB.h, ctxB.cornerRadius);
  ctxB.fill();
  ctxB.stroke();
  ctxB.closePath();
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
