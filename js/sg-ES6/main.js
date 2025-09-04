// main.js — Entry point for ES6 GUI (with optional CSOUND support)

import { installHengePrototype } from './canvasExtensions.js';
import { initCanvas, saveCanvasBackground, drawCanvas } from './canvasUtils.js';
import { ColorFamily } from './color.js';
import { savePhoneHenge25, drawPhoneHenge25 } from './henge.js';
import { runTimeStart } from './runTime.js';

import { scanKeys } from './enableKeys.js';
import { Csound } from '../Synth/csound.js';  // Path may need tweaking if nested

let appInitialized = false;

export async function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  installHengePrototype();
  initCanvas();
  saveCanvasBackground(ColorFamily.NONE);
  savePhoneHenge25();
  drawCanvas(0);
  drawPhoneHenge25(18);

/*
const csound = await Csound();  // or await window.Csound();
console.log(csound);
    // Ensure that runtime is initialized before calling run
    csound.onRuntimeInitialized = function() {
      console.log('Csound initialized');
      console.log(csound);
      csound.run();  // Call run after initialization
    };
*/

  runTimeStart();
}