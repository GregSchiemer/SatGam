// audioEngine.js
import { primeAudioContext, enableCsound, playTestTone } from "./csoundInit.js"; 
// ^ adjust path to your actual csoundInit.js location

export function makeAudioEngine() {
  let csound = null;
  let priming = null;

  async function prime({ beep = true } = {}) {
    if (csound) return csound;
    if (priming) return priming;

    priming = (async () => {
      await primeAudioContext();

      // IMPORTANT: enableCsound should return the csound instance.
      // If it currently doesn't, we’ll change it to return it.
      csound = await enableCsound();

      if (beep) {
        await playTestTone({ freq: 440, dur: 0.2, amp: 0.25 });
      }
      return csound;
    })();

    return priming;
  }

  function requireCsound() {
    if (!csound) throw new Error("[audio] Csound not primed yet");
    return csound;
  }

  async function noteOn({ keyID, dur, formalOct, nNotes, mode }) {
    // If someone taps immediately after confirm, this guarantees it still works.
    await prime({ beep: false });

    const msg = `i ${keyID} 0 ${dur} ${formalOct} ${nNotes} ${mode}`;
    requireCsound().inputMessage(msg);
  }

  return { prime, noteOn, isReady: () => !!csound };
}