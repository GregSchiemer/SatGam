// main.js — Entry point for ES6 GUI (optional CSOUND support)

import { installHengePrototype } from './canvasExtensions.js';
import { initCanvas, saveCanvasBackground } from './canvasUtils.js';
import { ColorFamily } from './color.js';
import { savePhoneHenge25 } from './henge.js';
import { runTimeStart } from './runTime.js';
//import { enableCsound } from "./csoundInit.js"; // Scenario 1


export function initApp() {
  installHengePrototype();
  initCanvas();               				// Setup base canvas + store in arrU
  saveCanvasBackground(ColorFamily.NONE);	// Setup background (arrB)
  savePhoneHenge25();						// Setup button geometry (arrA)
  console.log("✅ GUI initialised");
//  enableCsound();	// Scenario 1 
//  runTimeStart();         				
}
