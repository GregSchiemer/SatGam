// runTime.js
// Start live performance interaction

import { drawCanvas } from './canvasUtils.js';
import { drawPhoneHenge25 } from './henge.js';
import { drawTopText, drawSubText, drawMidText } from './text.js';
import { runConcert } from './animation.js';
import { arrU } from './canvasUtils.js';
import { initApp } from './main.js';
//import { scanKeys } from './enableKeys.js';
import { isInsideCircle } from './helpers.js';
//import { enableCsound } from './csoundInit.js'; // Scenario 2

export function runTimeStart() {
  let animationStopped = false;
  //let animationStopped = true; // animation stopped

  const { cnv, ctx } = arrU[0];

//const previewMode = true;
//const fullSecond = previewMode ? 1 : 1000;
//const allowTaps = !previewMode;

renderStartView();
//enableCsound();

// disable for the time being 
//scanKeys(); // enable 25 keys

  cnv.addEventListener('click', async function goSelectHandler(e) {
    if (animationStopped) return;

    let mX = e.clientX - cnv.getBoundingClientRect().left;
    let mY = e.clientY - cnv.getBoundingClientRect().top;
    let x = ctx.mid.x;
    let y = ctx.mid.y;
    let r = ctx.tapRadius;

    console.log(`✅ mid.x: ${x}, mid.y: ${y}, tap radius: ${r}`);

    if (isInsideCircle(mX, mY, x, y, r)) {
      console.log(`✅ tap x: ${mX}, tap y: ${mY}`);
      animationStopped = true; // ✅ Prevent double-taps

/*
      const started = await enableCsound(); // ✅ Await proper init

      if (started) {
        console.log("✅ animation running");
        runConcert(ctx);
      } else {
        console.warn("⚠️ Csound init failed");
      }
*/
        console.log("✅ animation running");
        runConcert(ctx);

    } else {
      console.warn("⚠️ Off centre. Try again");
    }
  });
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

export function clockify(t) {
  return mins(t) + secs(t);
}

function mins(t) {
  const m = Math.floor(t / 60);
  return m < 10 ? "0" + m + ":" : m + ":";
}

function secs(t) {
  const s = Math.floor(t % 60);
  return s < 10 ? "0" + s : s;
}