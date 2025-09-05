// csoundInit.js

import initCsound from "../3ynth/csound.js";

let csound = null;

const orc = `
sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

instr 1
  a1 oscili 0.3, 440
  outs a1, a1
endin
`;

const sco = `
f 1 0 16384 10 1
i 1 0 2
`;

export async function enableCsound() {
  if (csound) {
    console.warn("⚠️ Csound already initialized");
    return true;
  }

  try {
    console.log("🔄 Loading Csound WebAssembly module...");
    const csModule = await initCsound();

    console.log("✅ Csound module loaded. Creating CsoundObj...");
    csound = new csModule.CsoundObj();

    await csound.compileOrc(orc);
    await csound.readScore(sco);
    await csound.start();

    console.log("✅ Csound started.");
    return true;
  } catch (err) {
    console.error("❌ Failed to initialize Csound:", err);
    return false;
  }
}

export function getCsound() {
  return csound;
}


/*
// Don't import csound.js — just assume it's globally available
let csoundObj = null;

const orc = `
sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

instr 1
  a1 oscili 0.3, 440
  outs a1, a1 
endin
`;

const sco = `
f 1 0 16384 10 1
i 1 0 2
`;

export async function enableCsound() {
  try {
    console.log("🔄 Loading Csound module...");
    const csModule = await window.Csound();  // 🟢 this works when MODULARIZE=1
    console.log("✅ Module loaded. Creating Csound object...");
    csoundObj = new csModule.CsoundObj();

    await csoundObj.compileOrc(orc);
    await csoundObj.readScore(sco);
    await csoundObj.start();

    console.log("✅ Csound started and playing.");
  } catch (err) {
    console.error("❌ Failed to load or initialize csound.js", err);
    throw err;
  }
}

export function getCsou
nd() {
  return csoundObj;
}

*/



/*
import { default as csModule } from "../synth/csound.js";

let csoundObj = null;

const orc = `
sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

instr 1
  a1 oscili 0.3, 440
  outs a1, a1 
endin
`;

const sco = `
f 1 0 16384 10 1
i 1 0 2
`;


export async function enableCsound() {
  try {
    console.log("🔄 Loading Csound module...");
    const module = await csModule();

    console.log("✅ Module loaded. Creating Csound object...");
    csoundObj = new module.CsoundObj();

    await csoundObj.compileOrc(orc);
    await csoundObj.readScore(sco);
    await csoundObj.start();

    console.log("✅ Csound started and playing.");
  } catch (err) {
    console.error("❌ Failed to load or initialize csound.js", err);
    throw err;
  }
}
export function getCsound() {
  return csoundObj;
}
*/
