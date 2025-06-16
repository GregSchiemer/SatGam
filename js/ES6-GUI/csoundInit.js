// js/ES6-GUI/csoundInit.js

export let csound = null;

export async function enableCsound() {
  if (csound) {
    console.log("🔁 Csound already enabled");
    return true;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./js/Synth/csound.js";
    script.onload = () => {
      console.log("✅ csound.js loaded");
      resolve();
    };
    script.onerror = () => {
      console.error("❌ Failed to load csound.js");
      reject();
    };
    document.body.appendChild(script);
  });

  if (window.Csound?.CsoundObj) {
    csound = new window.Csound.CsoundObj();
    await csound.startAudio();
    await csound.compileOrc(`
      instr 1
        a1 oscili 0.2, p4
        out a1
      endin
    `);
    console.log("🎧 Csound initialized");
    return true;
  } else {
    console.error("❌ Csound global not found");
    return false;
  }
}
