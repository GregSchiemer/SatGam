/* animation.js*/

import { clearCanvas, redrawCanvas } from './canvasUtils.js';  // define
import { clockify } from './runTime.js';
import { drawTopText, drawMidText, drawLowText } from './text.js';
import { sequence } from './sequence.js';
import { drawState } from './henge.js';

/* concert animation */
export function runConcert(ctxA){
  // Use selected rate

const playRate = ctxA.playRate;
const totalStates = 31;
const stateDuration = 24;

let now = performance.now();
let state = 0;
let seconds = 0;

/*rAF loop*/
function draw(timestamp) {
if (state >= totalStates) {/*rerun player configuration*/
	return;
	}
	   
const frame = timestamp - now;

if (frame >= playRate) {
	seconds++;
	now = timestamp;
if ((seconds % stateDuration) == 0) {
	state++;
	}
}

const stateStr = `${state + 1}`;
const timeStr = clockify(seconds);
clearCanvas(ctxA);
redrawCanvas(ctxA); 

if (state <totalStates) {
    drawTopText(stateStr);
    drawMidText(timeStr);
} else {
	drawTopText('Phonehenge');
    drawMidText('duration ' + timeStr);
	drawLowText('G.Schiemer Ⓒ 2025');
    } 
	drawHenge25(state);
    requestAnimationFrame(draw);
	}
    
	redrawCanvas(ctxA);
	
    /*restart rAF loop*/
    requestAnimationFrame(draw);
}

function drawHenge25(state){
const stateBits = getStateBits(state);
drawState(stateBits);
}

function getStateBits(state){ /*5-bit code*/
	return sequence[state % sequence.length];
}
