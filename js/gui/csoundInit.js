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
//      console.log("[csoundIni-t 1] engine:", { csoundSource, csoundVersion });
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
      lastErr = new Error(`[csoundIni-t 2] Loaded ${key} but found no Csound/default export.`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("[csoundIni-t 3] No usable Csound export found.");
}

// --- Basic test instrument --------------------------------------------------
/*
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
*/

/*
// --- CSD 'sprite-notes' instrument --------------------------------------------------

const ORC = `
sr     = 44100
ksmps  = 32
nchnls = 2
0dbfs  = 1

maxalloc 110, 40

giSine  ftgen 100, 0, 16384, 10, 1

gkBaseCps chnexport "baseCps", 1
gkAmpDbfs chnexport "ampDbfs", 1
gkBend1   chnexport "bend1",   1
gkBend2   chnexport "bend2",   1

instr 900
  chnset cpspch(8.00), "baseCps"
  chnset -18,          "ampDbfs"
  chnset 100/99,       "bend1"
  chnset 99/98,        "bend2"
endin

instr 901
  chnset p4, "baseCps"
endin

; shared cpsxpch voice
; p4 = formalOct, p5 = degree 0..24
instr 110
  iOct   = p4
  iDeg   = p5

  iBase  = chnget:i("baseCps")
  iAmp   = ampdbfs(chnget:i("ampDbfs"))
  ibend1 = chnget:i("bend1")
  ibend2 = chnget:i("bend2")

  ipch   = iOct + (iDeg * 0.01)
  ifreq  cpsxpch ipch, 25, 5, iBase
  kfreq  = ifreq

  kover  linseg  0, p3*0.05, iAmp, p3*0.95, 0, 0.05, 0

  k0     linen   kover, 0.01, p3, p3*0.9
  k1     linen   kover, 0.02, p3, p3*0.8
  k2     linen   kover, 0.03, p3, p3*0.7
  k3     linen   kover, 0.04, p3, p3*0.6
  k4     linen   kover, 0.05, p3, p3*0.5

  k5     linseg  ifreq, p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
  k6     linseg  ifreq, p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
  k7     linseg  ifreq, p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
  k8     linseg  ifreq, p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

  a0     oscil   k0, kfreq, giSine
  a1     oscil   k1, k5,    giSine
  a2     oscil   k2, k6,    giSine
  a3     oscil   k3, k7,    giSine
  a4     oscil   k4, k8,    giSine

  asigL  = a0 + a1 + a4
  asigR  = a0 + a2 + a3

  outch  1, asigL, 2, asigR
endin

; phones 1..25 (single note)
; JS can keep sending: i <1..25> 0 <dur> <formalOct> <nNotes> <mode>
; p5/p6 are read as dummies so there are no warnings
instr 1
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 0
  turnoff
endin
instr 2
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 1
  turnoff
endin
instr 3
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 2
  turnoff
endin
instr 4
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 3
  turnoff
endin
instr 5
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 4
  turnoff
endin
instr 6
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 5
  turnoff
endin
instr 7
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 6
  turnoff
endin
instr 8
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 7
  turnoff
endin
instr 9
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 8
  turnoff
endin
instr 10
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 9
  turnoff
endin
instr 11
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 10
  turnoff
endin
instr 12
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 11
  turnoff
endin
instr 13
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 12
  turnoff
endin
instr 14
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 13
  turnoff
endin
instr 15
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 14
  turnoff
endin
instr 16
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 15
  turnoff
endin
instr 17
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 16
  turnoff
endin
instr 18
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 17
  turnoff
endin
instr 19
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 18
  turnoff
endin
instr 20
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 19
  turnoff
endin
instr 21
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 20
  turnoff
endin
instr 22
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 21
  turnoff
endin
instr 23
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 22
  turnoff
endin
instr 24
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 23
  turnoff
endin
instr 25
  iD5 = p5  : iD6 = p6
  schedule 110, 0, p3, p4, 24
  turnoff
endin
`;
*/

// --- CSD 'chord' instrument --------------------------------------------------


const ORC = `
; Phonehenge / Stockhausen (Studie II) — cpsxpch version (for web app)
sr     = 44100
ksmps  = 32
nchnls = 2
0dbfs  = 1

; voice polyphony (how many overlapping voices instr 110 can play)
maxalloc 110, 40

giSine  ftgen 100, 0, 16384, 10, 1

; 25th root of 5 ratios (used only if you want the tablei voice later)
giScale ftgen 1, 0, 32, -2, \
  1.00000000, 1.06649494, 1.13741146, 1.21304357, 1.29370483, \
  1.37972966, 1.47147471, 1.56932033, 1.67367220, 1.78496293, \
  1.90365394, 2.03023730, 2.16523781, 2.30921517, 2.46276630, \
  2.62652780, 2.80117862, 2.98744283, 3.18609267, 3.39795172, \
  3.62389832, 3.86486923, 4.12186348, 4.39594656, 4.68825477

; chord degree offsets
giChordOff ftgen 2, 0, 8, -2, 0, 4, 9, 15, 24

; shared params (JS can tweak)
gkBaseCps chnexport "baseCps", 1
gkAmpDbfs chnexport "ampDbfs", 1
gkBend1   chnexport "bend1",   1
gkBend2   chnexport "bend2",   1

instr 900
  chnset cpspch(8.00), "baseCps"
  chnset -18,          "ampDbfs"
  chnset 100/99,       "bend1"
  chnset 99/98,        "bend2"
endin

; ------------------------------------------
; Shared cpsxpch voice
; p4 = formalOct
; p5 = degree 0..24
; ------------------------------------------
instr 110
  iOct   = p4
  iDeg   = p5

  iBase  = chnget:i("baseCps")
  iAmp   = ampdbfs(chnget:i("ampDbfs"))
  ibend1 = chnget:i("bend1")
  ibend2 = chnget:i("bend2")

  ipch   = iOct + (iDeg * 0.01)
  ifreq  cpsxpch ipch, 25, 5, iBase
  kfreq  = ifreq

  kover  linseg  0, p3*0.05, iAmp, p3*0.95, 0, 0.05, 0

  k0     linen   kover, 0.01, p3, p3*0.9
  k1     linen   kover, 0.02, p3, p3*0.8
  k2     linen   kover, 0.03, p3, p3*0.7
  k3     linen   kover, 0.04, p3, p3*0.6
  k4     linen   kover, 0.05, p3, p3*0.5

  k5     linseg  ifreq, p3*0.5, (ifreq)*ibend1,     p3*0.4, ifreq
  k6     linseg  ifreq, p3*0.4, (ifreq)*ibend2,     p3*0.5, ifreq
  k7     linseg  ifreq, p3*0.3, (ifreq)*(2-ibend1), p3*0.6, ifreq
  k8     linseg  ifreq, p3*0.2, (ifreq)*(2-ibend2), p3*0.7, ifreq

  a0     oscil   k0, kfreq, giSine
  a1     oscil   k1, k5,    giSine
  a2     oscil   k2, k6,    giSine
  a3     oscil   k3, k7,    giSine
  a4     oscil   k4, k8,    giSine

  asigL  = a0 + a1 + a4
  asigR  = a0 + a2 + a3

  outch  1, asigL, 2, asigR
endin

; ------------------------------------------
; Chord scheduler
; p4 = voiceDur
; p5 = baseOct
; p6 = baseDeg
; p7 = nNotes (1..5)
; p8 = mode (0 chord offsets, 1 formal-oct doubling)
; ------------------------------------------
instr 210
  iVoiceDur = p4
  iBaseOct  = p5
  iBaseDeg  = p6

  iN  = int(p7)
  if (iN <= 0) then
    iN = 5
  endif
  if (iN > 5) then
    iN = 5
  endif

  iMode = int(p8)

  if (iMode == 1) then
    schedule 110, 0, iVoiceDur, iBaseOct,     iBaseDeg
    schedule 110, 0, iVoiceDur, iBaseOct + 1, iBaseDeg
  else
    iIdx = 0
    while (iIdx < iN) do
      iOff    tablei iIdx, giChordOff
      iSum    = iBaseDeg + iOff
      iCarry  = int(iSum / 25)
      iDeg    = iSum - (iCarry * 25)
      iOct    = iBaseOct + iCarry
      schedule 110, 0, iVoiceDur, iOct, iDeg
      iIdx += 1
    od
  endif

  turnoff
endin

; ------------------------------------------
; Phone instruments 1..25
; Call: i <1..25> 0 <dur> <formalOct> <nNotes> <mode>
; ------------------------------------------
instr 1  ; degree 0
  schedule 210, 0, 0.01, p3, p4, 0,  p5, p6
  turnoff
endin
instr 2  ; degree 1
  schedule 210, 0, 0.01, p3, p4, 1,  p5, p6
  turnoff
endin
instr 3  ; degree 2
  schedule 210, 0, 0.01, p3, p4, 2,  p5, p6
  turnoff
endin
instr 4  ; degree 3
  schedule 210, 0, 0.01, p3, p4, 3,  p5, p6
  turnoff
endin
instr 5  ; degree 4
  schedule 210, 0, 0.01, p3, p4, 4,  p5, p6
  turnoff
endin
instr 6  ; degree 5
  schedule 210, 0, 0.01, p3, p4, 5,  p5, p6
  turnoff
endin
instr 7  ; degree 6
  schedule 210, 0, 0.01, p3, p4, 6,  p5, p6
  turnoff
endin
instr 8  ; degree 7
  schedule 210, 0, 0.01, p3, p4, 7,  p5, p6
  turnoff
endin
instr 9  ; degree 8
  schedule 210, 0, 0.01, p3, p4, 8,  p5, p6
  turnoff
endin
instr 10 ; degree 9
  schedule 210, 0, 0.01, p3, p4, 9,  p5, p6
  turnoff
endin
instr 11
  schedule 210, 0, 0.01, p3, p4, 10, p5, p6
  turnoff
endin
instr 12
  schedule 210, 0, 0.01, p3, p4, 11, p5, p6
  turnoff
endin
instr 13
  schedule 210, 0, 0.01, p3, p4, 12, p5, p6
  turnoff
endin
instr 14
  schedule 210, 0, 0.01, p3, p4, 13, p5, p6
  turnoff
endin
instr 15
  schedule 210, 0, 0.01, p3, p4, 14, p5, p6
  turnoff
endin
instr 16
  schedule 210, 0, 0.01, p3, p4, 15, p5, p6
  turnoff
endin
instr 17
  schedule 210, 0, 0.01, p3, p4, 16, p5, p6
  turnoff
endin
instr 18
  schedule 210, 0, 0.01, p3, p4, 17, p5, p6
  turnoff
endin
instr 19
  schedule 210, 0, 0.01, p3, p4, 18, p5, p6
  turnoff
endin
instr 20
  schedule 210, 0, 0.01, p3, p4, 19, p5, p6
  turnoff
endin
instr 21
  schedule 210, 0, 0.01, p3, p4, 20, p5, p6
  turnoff
endin
instr 22
  schedule 210, 0, 0.01, p3, p4, 21, p5, p6
  turnoff
endin
instr 23
  schedule 210, 0, 0.01, p3, p4, 22, p5, p6
  turnoff
endin
instr 24
  schedule 210, 0, 0.01, p3, p4, 23, p5, p6
  turnoff
endin
instr 25
  schedule 210, 0, 0.01, p3, p4, 24, p5, p6
  turnoff
endin
`;


export async function primeAudioContext() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) throw new Error("[csoundIni-t 4] AudioContext not available in this browser.");

  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state !== "running") await audioCtx.resume();
  return audioCtx;
}

export async function enableCsound() {
  if (csound) return csound;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const ac = await primeAudioContext();
    const { Csound } = await importCsoundModule();

    csound = await Csound({ audioContext: ac, autoConnect: true });

    // Attach exactly one message listener
    const ret = csound.on?.("message", onMsg);
    msgUnsub = (typeof ret === "function") ? ret : null;

    await csound.setOption("-odac");

    // ---- Load ORC from assets/csd (no copy/paste into JS) ----
    const params = new URLSearchParams(window.location.search);
    const orcName = params.get("orc") ?? "sprite-chords.orc";

    // Resolve robustly relative to this module file (js/gui/csoundInit.js):
    // ../../assets/csd/<orcName>
    const orcURL = new URL(`../../assets/csd/${orcName}`, import.meta.url).toString();

    const res = await fetch(orcURL, { cache: "no-store" });
    if (!res.ok) throw new Error(`[csound] failed to fetch ORC ${orcName} (${res.status})`);
    const orcText = await res.text();

    console.log("[csound] compiling ORC", { orcName, orcURL, chars: orcText.length });
    await csound.compileOrc(orcText);

    await csound.start();

    // ---- Initialise shared defaults ONCE so baseCps/ampDbfs/etc are non-zero ----
    await csound.inputMessage("i 900 0 0.01");

    console.log("✅ Csound engine ready", { csoundSource, csoundVersion, orcName });
    return csound;
  })();

  return initPromise;
}

export async function playTestTone({ dur = 0.2 } = {}) {
  const cs = await enableCsound();

  // Helpful: report baseCps from JS as well (matches printf_i inside instr 902)
  try {
    const base = await cs.getControlChannel?.("baseCps");
    if (typeof base === "number") console.log("[csound] baseCps (JS) =", base, "Hz");
  } catch (_) {
    // ignore if API not available in this build
  }

  // Use a dedicated ORC-side test instrument that prints baseCps and plays it.
  // (You must define instr 902 in the ORC.)
  await cs.inputMessage(`i 902 0 ${dur}`);
}
/*
export async function enableCsound() {
  if (csound) return csound;
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
    return csound;
  })();

  return initPromise;
}

export async function playTestTone({ dur = 0.2 } = {}) {
  const cs = await enableCsound();
  // (safe even if already run, but you can omit if enableCsound always runs it)
  await cs.inputMessage("i 900 0 0.01");
  await cs.inputMessage(`i 1 0 ${dur} 0 1 0`);  // key 1, oct 0, 1 note, mode 0
}
*/

/*
export async function playTestTone({ freq = 440, dur = 0.25, amp = 0.25 } = {}) {
  await enableCsound();
  await csound.inputMessage(`i 1 0 ${dur} ${amp} ${freq}`);
}
*/

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
      console.warn("[csoundIni-t 5] message detach warning:", e);
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
    console.warn("[csoundIni-t 6] reset warning:", e);
  } finally {
    csound = null;
    initPromise = null;
    audioCtx = null;
    csoundSource = "none";
    csoundVersion = "unknown";
  }
}
