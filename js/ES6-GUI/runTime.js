// runTime.js
// Start live performance interaction

import { drawCanvas } from './canvasUtils.js';
import { drawPhoneHenge25 } from './henge.js';
import { drawTopText, drawSubText, drawMidText } from './text.js';
import { runConcert } from './animation.js';
import { arrU } from './canvasUtils.js';
import { initApp } from './main.js';
import { scanKeys } from './enableKeys.js';
import { isInsideCircle } from './helpers.js';

export function runTimeStart() {

let animationStopped = false; // animation started
//let animationStopped = true; // animation stopped
let csoundStarted = false; // disable automatic starting

//const previewMode = true;
//const fullSecond = previewMode ? 1 : 1000;
//const allowTaps = !previewMode;

const{ cnv, ctx } = arrU[0];
renderStartView();

scanKeys(); // enable 25 keys

cnv.addEventListener('click', function goSelectHandler(e){
	if(animationStopped){
	let mX = e.clientX - cnv.getBoundingClientRect().left;
	let mY = e.clientY - cnv.getBoundingClientRect().top;
  	let x = ctx.mid.x;
  	let y = ctx.mid.y;
  	let r = ctx.tapRadius;
    console.log(`✅ mid.x: ${x}, mid.y: ${y}, tap radius: ${r}`);
	if(isInsideCircle(mX, mY, x, y, r)){
		enableCsound(csoundStarted);
		animationStopped = false;
		console.log("✅ animation running");
		runConcert(ctx);
		}
		else {
        console.warn("⚠️ Off centre. Try again");		
		}
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

async function enableCsound(csoundStarted){
    // ⏳ Load Csound only on gesture
    if (!csoundStarted) {
      await loadCsoundScript();

      if (window.Csound) {
        window.csound = new window.Csound(); // Store globally if needed
        await window.csound.start();         // Ensures AudioContext is resumed
        csoundStarted = true;
        console.log("🔊 Csound started");
      } else {
        console.warn("⚠️ Csound class not found");
      }
    }
}

/*
function enableCsound(){
let csoundStarted = false;

function loadCsoundScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./js/Synth/csound.js";

    script.onload = () => {
      	console.log("✅ csound.js loaded");
      	resolve(window.Csound); // classic scripts set globals
    	};
    script.onerror = reject;
    document.body.appendChild(script);
  	});
  }
}
*/

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
