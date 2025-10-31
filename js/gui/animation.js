// js/gui/animation.js — owns the RAF loop
import { rt, renderFrame } from './runTime.js';

function tick() {
  if (!rt.ticking) return;
  rt.frame += 1;
  renderFrame();                           // call the injected renderer
  rt.rafId = requestAnimationFrame(tick);
}

export function startAnimation() {
  if (rt.ticking) return;
  rt.ticking = true;
  rt.rafId = requestAnimationFrame(tick);
}

export function stopAnimation() {
  rt.ticking = false;
  if (rt.rafId) cancelAnimationFrame(rt.rafId);
}

/*
import { clearCanvas, redrawCanvas } from './canvasUtils.js';  // define
import { clockify } from './runTime.js';
import { drawTopText, drawMidText, drawLowText } from './text.js';
import { sequence } from './sequence.js';
import { drawState } from './henge.js';

import { ensurePhoneSprites, drawHengePhones, drawSlotsLayer } from './blitHenge.js';
import { getHengeLayout25, getHengeStateBits } from './henge.js';

let stateBits = 0;
let slots = [];

// js/gui/animation.js (thin adapter)
export {
  runTimeStart,
  startAnimation,
  stopAnimation,
  setMode,
  setStateIndex,
  renderFrame,
  renderStartView,
  renderEndState,
  getSlots,
} from './runTime.js';

export async function initGUI(ctx, slotW, slotH) {
  slots = getHengeLayout25() || [];
  if (!Array.isArray(slots) || !slots.length) {
    console.warn('getHengeLayout25() returned no layout; skipping draw.');
  return;
}
  await ensurePhoneSprites({ w: slotW, h: slotH });
}

export function renderFrame(ctx, clock) {
  stateBits = getHengeStateBits(); // or however you compute it
//  const isActive = () => true;
  const isActive = (slot, sB) => ((sB >>> slot.id) & 1) === 1;
//  const isActive = (slot, sB) => //;
  drawHengePhones(ctx, slots, stateBits, isActive);
}

export function onStop(ctx) {
  drawSlotsLayer(ctx, slots, 0.05);
}

// concert animation
export function runConcert(ctxA){
  // Use selected rate

const playRate = ctxA.playRate;
const totalStates = 31;
const stateDuration = 24;

let now = performance.now();
let state = 0;
let seconds = 0;

//rAF loop
function draw(timestamp) {
if (state >= totalStates) {//rerun player configuration
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
	
    //restart rAF loop
    requestAnimationFrame(draw);
}

function drawHenge25(state){
const stateBits = getStateBits(state);
drawState(stateBits);
}

function getStateBits(state){ //5-bit code
	return sequence[state % sequence.length];
}
*/