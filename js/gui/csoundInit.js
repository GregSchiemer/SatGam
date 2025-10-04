// csoundInit.js — supports BOTH global (window.Csound) and ES module builds

let csound = null;

const ORC = `
sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

instr 1
  a1 oscili 0.3, 440
  outs a1, a1
endin
`;

const SCO = `
f 1 0 16384 10 1
i 1 0 2
`;

async function loadCsoundFactory() {
  // Prefer the already-loaded global build (added via <script src="js/synth/csound.js">)
  if (typeof window !== "undefined" && typeof window.Csound === "function") {
    return window.Csound;
  }

  // Otherwise try to import an ES module build
  try {
    const mod = await import("../synth/csound.js");
    // Common Emscripten ES6 pattern is "export default function Module(...)"
    if (typeof mod.default === "function") return mod.default;
    // Sometimes the factory is a named export
    if (typeof mod.Csound === "function") return mod.Csound;
  } catch (e) {
    // ignore; we’ll error below if nothing found
  }

  throw new Error(
    "Csound factory not found. Either include <script src='js/synth/csound.js'> for the global build, or use an ES module build that exports a factory."
  );
}

export async function enableCsound() {
  if (csound) {
    console.warn("⚠️ Csound already initialized");
    return true;
  }
  try {
    console.log("🔄 Loading Csound module...");
    const factory = await loadCsoundFactory();
    const module = await factory();        // create Emscripten Module
    csound = new module.CsoundObj();

    await csound.compileOrc(ORC);
    await csound.readScore(SCO);
    await csound.start();                  // may require user gesture

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
