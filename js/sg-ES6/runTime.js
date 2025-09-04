// runTime.js — Start live performance interaction and initialize Csound if needed

import { drawTopText, drawSubText, drawMidText, drawLowText } from './text.js';
import { runConcert } from './animation.js';
import { arrU } from './canvasUtils.js';
import { isInsideCircle } from './helpers.js';
import { getCsound, initCsound } from './csound-init.js';

console.log('🔔 runTimeStart fired');

const modeConfig = {
  concert: {
    name: 'CONCERT MODE',
    timePeriod: 1000,
    active: true
  },
  preview: {
    name: 'PREVIEW MODE',
    timePeriod: 1,
    active: false
  }
};

export function runTimeStart() {
  const { cnv, ctx } = arrU[0];
  const isConcertMode = false;
  const activeMode = isConcertMode ? modeConfig.concert : modeConfig.preview;

  const csoundMessage = 'tap Csound Initialise';
  const clockMessage = 'tap clock to start';
  const csoundMidText = 'Csound Initialise';
  const clockMidText = '00:00';
    
  drawTopText('Phonehenge');
  drawSubText(csoundMessage);
  drawMidText(csoundMidText);
  drawLowText(activeMode.name);

  const timePeriod = activeMode.timePeriod;

  cnv.addEventListener('click', async function startCsound(e) {
    let mX = e.clientX - cnv.getBoundingClientRect().left;
    let mY = e.clientY - cnv.getBoundingClientRect().top;
    let x = ctx.mid.x;
    let y = ctx.mid.y;
    let r = ctx.tapRadius;

    console.log(`✅ mid.x: ${x}, mid.y: ${y}, tap radius: ${r}`);

    if (isInsideCircle(mX, mY, x, y, r)) {
      cnv.removeEventListener("click", startCsound); // ✅ Prevent double-taps
  	  drawSubText(clockMessage);
      drawMidText(clockMidText);

      console.log("✅ csound running");

      if (!getCsound()) {
        console.log("👇 Gesture triggers Csound init");
        await initCsound();
      }
    } else {
      console.warn("⚠️ Not triggered. Tap clock again");
    }
  });

  cnv.addEventListener('click', async function startConcert() {

    if (isInsideCircle(mX, mY, x, y, r)) {
      cnv.removeEventListener("click", startConcert); // ✅ Prevent double-taps
      console.log("✅ animation running");
      runConcert(ctx, timePeriod);

    } else {
      console.warn("⚠️ Animation not triggered. Tap clock again");
    }
  });

}
