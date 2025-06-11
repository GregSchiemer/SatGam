// runTime.js
// Start live performance interaction

import { drawCanvas } from './canvasUtils.js';
import { drawPhoneHenge25 } from './henge.js';
import { drawTopText, drawSubText, drawMidText } from './text.js';
//import { clockify } from './helpers.js';
import { runConcert } from './animation.js';
import { arrU } from './canvasUtils.js';
import { initApp } from './main.js';
import { scanKeys } from './enableKeys.js';

export function runTimeStart() {
const{ cnv, ctx } = arrU[0];
drawCanvas(0);
drawPhoneHenge25(18);
let seconds = 0;
const timeStr = clockify(seconds);
drawTopText('Phonehenge');
drawSubText('tap clock to start');
drawMidText(timeStr);

//const previewMode = true;
//const fullSecond = previewMode ? 1 : 1000;
//const allowTaps = !previewMode;

scanKeys();

// start animation
let running = false; //true; //false; /* to test, set running to 'true' */
    cnv.addEventListener('click', function goSelectHandler() {
		if(!running){
			running = true;
    		runConcert(ctx);
		}
    });
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
