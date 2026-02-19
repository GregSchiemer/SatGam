// js/gui/csoundInit.js
// SatGam Csound init using the @csound/browser "Vanilla/Ping" API: await Csound()

let csound = null;
let initPromise = null;
let audioCtx = null;

let msgUnsub = null;

let csoundSource = "none";
let csoundVersion = "unknown";

// One permanent handler (do not null this in reset)
const onMsg = (msg) => {
  const s = (typeof msg === "string") ? msg : String(msg ?? "");

  if (csoundVersion === "unknown") {
    const m = s.match(/--Csound version\s+([^\n\r]+)/);
    if (m) {
      csoundVersion = m[1].trim();
//      console.log("[csoundInit] engine:", { csoundSource, csoundVersion });
    }
  }

  console.log("[csound]", s);
};

const SOURCES = {
  local6: "../synth/csound6/csound.js",
  local7: "../synth/csound7/csound.js",
  cdn6:   "https://cdn.jsdelivr.net/npm/@csound/browser@6.18.7/dist/csound.js",
  cdn7:   "https://cdn.jsdelivr.net/npm/@csound/browser@7.0.0-beta13/dist/csound.js",
};

const qs = new URLSearchParams(globalThis.location?.search || "");
const choice = qs.get("csound") || "local6";
const TRY_ORDER = choice.startsWith("local") ? [choice, "cdn6"] : [choice];

async function importCsoundModule() {
  let lastErr = null;

  for (const key of TRY_ORDER) {
    const url = SOURCES[key];
    if (!url) continue;

    try {
      const m = await import(url);
      if (typeof m.Csound === "function") {
        csoundSource = `${key}:${url}`;
        return m;
      }
      if (typeof m.default === "function") {
        csoundSource = `${key}-default:${url}`;
        return { Csound: m.default };
      }
      lastErr = new Error(`[csoundInit] Loaded ${key} but found no Csound/default export.`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("[csoundInit] No usable Csound export found.");
}

// --- Basic test instrument --------------------------------------------------
const ORC = `
sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

instr 1
  iamp = p4
  ifrq = p5
  a1 oscili iamp, ifrq
  outs a1, a1
endin
`;

export async function primeAudioContext() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) throw new Error("[csoundInit] AudioContext not available in this browser.");

  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state !== "running") await audioCtx.resume();
  return audioCtx;
}

export async function enableCsound() {
  if (csound) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const ac = await primeAudioContext();
    const { Csound } = await importCsoundModule();

    csound = await Csound({ audioContext: ac, autoConnect: true });

    // Attach exactly one message listener
    const ret = csound.on?.("message", onMsg);
    msgUnsub = (typeof ret === "function") ? ret : null;

    await csound.setOption("-odac");
    await csound.compileOrc(ORC);
    await csound.start();

    console.log("✅ Csound engine ready", { csoundSource, csoundVersion });
    return true;
  })();

  return initPromise;
}

export async function playTestTone({ freq = 440, dur = 0.25, amp = 0.25 } = {}) {
  await enableCsound();
  await csound.inputMessage(`i 1 0 ${dur} ${amp} ${freq}`);
}

export function getCsound() {
  return csound;
}

export async function resetCsound() {
  try {
    // Detach message handler
    try {
      if (csound) {
        if (typeof msgUnsub === "function") {
          msgUnsub();
        } else if (typeof csound.off === "function") {
          csound.off("message", onMsg);
        } else if (typeof csound.removeListener === "function") {
          csound.removeListener("message", onMsg);
        }
      }
    } catch (e) {
      console.warn("[csoundInit] message detach warning:", e);
    } finally {
      msgUnsub = null;
    }

    if (csound) {
      if (typeof csound.stop === "function") await csound.stop();
      if (typeof csound.cleanup === "function") await csound.cleanup();
      if (typeof csound.reset === "function") await csound.reset();
      if (typeof csound.destroy === "function") await csound.destroy();
    }

    if (audioCtx && typeof audioCtx.close === "function") {
      await audioCtx.close();
    }
  } catch (e) {
    console.warn("[csoundInit] reset warning:", e);
  } finally {
    csound = null;
    initPromise = null;
    audioCtx = null;
    csoundSource = "none";
    csoundVersion = "unknown";
  }
}
