let csound;

async function setupCsound() {
  console.log("🎬 Starting Csound setup...");
  csound = await CsoundObj.importCsound();
  await csound.start();

  await csound.compileOrc(`
sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

instr 1
  iFreq = p4
  iHarm = p5
  aSig buzz 0.5, iFreq, iHarm, 1
  outs aSig, aSig
endin
  `);

  await csound.evalCode("f 1 0 16384 10 1");

  console.log("✅ Csound ready");

  document.dispatchEvent(new Event("csoundReady"));  // Fire signal
}
setupCsound();
