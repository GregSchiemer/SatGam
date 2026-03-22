// audioEngine.js
import { primeAudioContext, enableCsound, playTestTone } from "./csoundInit.js";

// ------------------------------------------------------------
// Module-scoped singleton state
// ------------------------------------------------------------
let csound = null;
let priming = null;
let stage = "idle";	// idle | loading | prepared | unavailable | failed | running
let lastError = null;

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------
function resetError() {
  lastError = null;
}

function setFailed(err) {
  lastError = err;
  stage = "failed";
}

function requireCsound() {
  if (!csound) throw new Error("[audio] Csound not primed yet");
  return csound;
}

// ------------------------------------------------------------
// Public singleton methods
// ------------------------------------------------------------
async function prime({ mode = "concert", beep = true } = {}) {
  resetError();

  if (mode !== "concert") {
    stage = "unavailable";
    return null;
  }

  if (csound) {
    if (stage !== "running") stage = "prepared";
    return csound;
  }

  if (priming) return priming;

  stage = "loading";

  priming = (async () => {
    try {
      await primeAudioContext();
      csound = await enableCsound();

      if (beep) {
        await playTestTone({ freq: 440, dur: 0.2, amp: 0.25 });
      }

      stage = "prepared";
      return csound;
    } catch (err) {
      setFailed(err);
      throw err;
    } finally {
      priming = null;
    }
  })();

  return priming;
}

async function noteOn({ keyID, dur, formalOct, nNotes, mode }) {
  if (!csound) {
    await prime({ mode: "concert", beep: false });
  }

  const msg = `i ${keyID} 0 ${dur} ${formalOct} ${nNotes} ${mode}`;
  requireCsound().inputMessage(msg);
}

function isReady() {
  return !!csound && (stage === "prepared" || stage === "running");
}

function getAudioStage() {
  return stage;
}

function getAudioError() {
  return lastError;
}

async function startConcertAudio({ beep = false } = {}) {
  await prime({ mode: "concert", beep });
  stage = "running";
  return requireCsound();
}

async function beepReadyTone() {
  if (!csound) {
    await prime({ mode: "concert", beep: false });
  }
  await playTestTone({ freq: 440, dur: 0.2, amp: 0.25 });
}

function resetAudioEngineForDebug() {
  csound = null;
  priming = null;
  stage = "idle";
  lastError = null;
}

// ------------------------------------------------------------
// Singleton object
// ------------------------------------------------------------
const AUDIO_ENGINE = {
  prime,
  noteOn,
  isReady,
  getAudioStage,
  getAudioError,
  startConcertAudio,
  beepReadyTone,
  resetAudioEngineForDebug,
};

// ------------------------------------------------------------
// Compatibility export for existing main.js
// ------------------------------------------------------------
export function makeAudioEngine() {
  return AUDIO_ENGINE;
}

// Optional direct exports if you want them later
export {
  prime,
  noteOn,
  isReady,
  getAudioStage,
  getAudioError,
  startConcertAudio,
  beepReadyTone,
  resetAudioEngineForDebug,
};

