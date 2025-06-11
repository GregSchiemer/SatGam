// js/csound.js
// ES6 module for initializing Csound with WebAssembly and AudioWorklet

import { CsoundObj } from './CsoundObj.js';
import { CsoundNode } from './CsoundNode.js';

/**
 * Initializes the Csound engine and returns a CsoundObj instance.
 * @param {AudioContext} audioContext - The audio context to use.
 * @returns {Promise<CsoundObj>} The initialized Csound object.
 */
export async function createCsound(audioContext) {
  await audioContext.audioWorklet.addModule('./js/libcsound-worklet.js');
  const node = new CsoundNode(audioContext);
  return new CsoundObj(node);
}
