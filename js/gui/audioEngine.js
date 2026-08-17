// js/gui/audioEngine.js

import {
  primeAudioContext,
  enableCsound,
  playTestTone,
} from './csoundInit.js';

// ------------------------------------------------------------
// Module-scoped singleton state
// ------------------------------------------------------------
let csound = null;
let priming = null;

// idle | loading | prepared | unavailable | failed | running
let stage = 'idle';

let lastError = null;

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------
function resetError() {
  lastError = null;
}

function setFailed(error) {
  lastError = error;
  stage = 'failed';
}

function requireCsound() {
  if (!csound) {
    throw new Error(
      '[audio] Csound not primed yet'
    );
  }

  return csound;
}

function validateNoteArguments({
  keyID,
  dur,
  formalOct,
  nNotes,
  chordMode,
  appMode,
}) {
  if (
    !Number.isInteger(keyID) ||
    keyID < 1 ||
    keyID > 25
  ) {
    throw new Error(
      `[audio.noteOn] invalid keyID=${keyID}; ` +
      `expected an integer from 1 to 25`
    );
  }

  if (
    !Number.isFinite(dur) ||
    dur <= 0
  ) {
    throw new Error(
      `[audio.noteOn] invalid dur=${dur}`
    );
  }

  if (!Number.isFinite(formalOct)) {
    throw new Error(
      `[audio.noteOn] invalid formalOct=${formalOct}`
    );
  }

  if (
    !Number.isInteger(nNotes) ||
    nNotes < 1 ||
    nNotes > 5
  ) {
    throw new Error(
      `[audio.noteOn] invalid nNotes=${nNotes}; ` +
      `expected an integer from 1 to 5`
    );
  }

  if (!Number.isFinite(chordMode)) {
    throw new Error(
      `[audio.noteOn] invalid chordMode=${chordMode}`
    );
  }

  if (
    appMode !== 1 &&
    appMode !== 5
  ) {
    throw new Error(
      `[audio.noteOn] invalid appMode=${appMode}; ` +
      `expected 1 for PREVIEW or 5 for CONCERT`
    );
  }
}

// ------------------------------------------------------------
// Public singleton methods
// ------------------------------------------------------------
async function prime({
  mode = 'concert',
  beep = true,
} = {}) {
  resetError();

  /*
   * PREVIEW now also requires Csound because sprites are
   * playable melodically in PREVIEW Start View.
   */
  if (
    mode !== 'concert' &&
    mode !== 'preview'
  ) {
    stage = 'unavailable';
    return null;
  }

  if (csound) {
    if (stage !== 'running') {
      stage = 'prepared';
    }

    return csound;
  }

  if (priming) {
    return priming;
  }

  stage = 'loading';

  priming = (async () => {
    try {
      await primeAudioContext();

      csound = await enableCsound();

      if (beep) {
        await playTestTone({
          dur: 0.2,
        });
      }

      stage = 'prepared';

      return csound;
    } catch (error) {
      setFailed(error);
      throw error;
    } finally {
      priming = null;
    }
  })();

  return priming;
}

async function noteOn({
  keyID,
  dur,
  formalOct,
  nNotes,
  chordMode,
  appMode,
}) {
  validateNoteArguments({
    keyID,
    dur,
    formalOct,
    nNotes,
    chordMode,
    appMode,
  });

  if (!csound) {
    const mode =
      appMode === 1
        ? 'preview'
        : 'concert';

    await prime({
      mode,
      beep: false,
    });
  }

  const msg =
    `i ${keyID} 0 ${dur} ` +
    `${formalOct} ${nNotes} ` +
    `${chordMode} ${appMode}`;

  console.log('[audioEngine.noteOn]', {
    keyID,
    dur,
    formalOct,
    nNotes,
    chordMode,
    appMode,
    msg,
  });

  await requireCsound().inputMessage(msg);
}

function isReady() {
  return (
    !!csound &&
    (
      stage === 'prepared' ||
      stage === 'running'
    )
  );
}

function getAudioStage() {
  return stage;
}

function getAudioError() {
  return lastError;
}

async function releasePreviewNote() {
  const msg = 'i 212 0 0.01';

  console.log('[audioEngine.releasePreviewNote]', {
    msg,
  });

  await requireCsound().inputMessage(msg);
}

async function startConcertAudio({
  beep = false,
} = {}) {
  await prime({
    mode: 'concert',
    beep,
  });

  stage = 'running';

  return requireCsound();
}

async function beepReadyTone() {
  if (!csound) {
    await prime({
      mode: 'concert',
      beep: false,
    });
  }

  await playTestTone({
    dur: 0.2,
  });
}

function resetAudioEngineForDebug() {
  csound = null;
  priming = null;
  stage = 'idle';
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
  releasePreviewNote,
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

// Optional direct exports
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