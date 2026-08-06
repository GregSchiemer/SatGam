// js/gui/csoundInit.js
//
// SatGam Csound initialisation using the @csound/browser
// "Vanilla/Ping" API: await Csound()

let csound = null;
let initPromise = null;
let audioCtx = null;

let msgUnsub = null;

let csoundSource = 'none';
let csoundVersion = 'unknown';

// One permanent handler.
// Do not set this function to null during reset.
const onMsg = (msg) => {
  const s =
    typeof msg === 'string'
      ? msg
      : String(msg ?? '');

  if (csoundVersion === 'unknown') {
    const match = s.match(
      /--Csound version\s+([^\n\r]+)/
    );

    if (match) {
      csoundVersion = match[1].trim();

      // console.log(
      //   '[csoundIni-t 1] engine:',
      //   {
      //     csoundSource,
      //     csoundVersion,
      //   }
      // );
    }
  }

  console.log('[csound]', s);
};

const SOURCES = Object.freeze({
  local6: '../synth/csound6/csound.js',
  local7: '../synth/csound7/csound.js',

  cdn6:
    'https://cdn.jsdelivr.net/npm/' +
    '@csound/browser@6.18.7/dist/csound.js',

  cdn7:
    'https://cdn.jsdelivr.net/npm/' +
    '@csound/browser@7.0.0-beta13/dist/csound.js',
});

const qs = new URLSearchParams(
  globalThis.location?.search || ''
);

const choice =
  qs.get('csound') ||
  'local6';

const TRY_ORDER =
  choice.startsWith('local')
    ? [choice, 'cdn6']
    : [choice];

async function importCsoundModule() {
  let lastErr = null;

  for (const key of TRY_ORDER) {
    const url = SOURCES[key];

    if (!url) {
      continue;
    }

    try {
      const module = await import(url);

      if (typeof module.Csound === 'function') {
        csoundSource = `${key}:${url}`;
        return module;
      }

      if (typeof module.default === 'function') {
        csoundSource = `${key}-default:${url}`;

        return {
          Csound: module.default,
        };
      }

      lastErr = new Error(
        `[csoundIni-t 2] Loaded ${key} but found ` +
        `no Csound/default export.`
      );
    } catch (error) {
      lastErr = error;
    }
  }

  throw (
    lastErr ||
    new Error(
      '[csoundIni-t 3] No usable Csound export found.'
    )
  );
}

// Csound orchestra code is intentionally not embedded in this module.
// The active orchestra is edited using the CsoundQt IDE and fetched
// from assets/csd in enableCsound().
const ORC = null;

export async function primeAudioContext() {
  const AudioContextConstructor =
    globalThis.AudioContext ||
    globalThis.webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error(
      '[csoundIni-t 4] AudioContext is not available ' +
      'in this browser.'
    );
  }

  if (!audioCtx) {
    audioCtx = new AudioContextConstructor();
  }

  if (audioCtx.state !== 'running') {
    await audioCtx.resume();
  }

  return audioCtx;
}

export async function enableCsound() {
  if (csound) {
    return csound;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const ac = await primeAudioContext();
    const { Csound } = await importCsoundModule();

    csound = await Csound({
      audioContext: ac,
      autoConnect: true,
    });

    // Attach exactly one message listener.
    const listenerResult =
      csound.on?.(
        'message',
        onMsg
      );

    msgUnsub =
      typeof listenerResult === 'function'
        ? listenerResult
        : null;

    await csound.setOption('-odac');

    // --------------------------------------------------------
    // Load the active orchestra from assets/csd.
    //
    // By default:
    //   assets/csd/sprite-chords.orc
    //
    // A different orchestra can be selected with the existing
    // ?orc=<filename> URL parameter.
    // --------------------------------------------------------
    const params =
      new URLSearchParams(
        window.location.search
      );

    const orcName =
      params.get('orc') ??
      'sprite-chords.orc';

    // Resolve relative to:
    // js/gui/csoundInit.js
    //
    // ../../assets/csd/<orcName>
    const orcURL = new URL(
      `../../assets/csd/${orcName}`,
      import.meta.url
    ).toString();

    const response = await fetch(
      orcURL,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(
        `[csound] failed to fetch ORC ` +
        `${orcName} (${response.status})`
      );
    }

    const orcText =
      await response.text();

    if (!orcText.trim()) {
      throw new Error(
        `[csound] fetched ORC ${orcName}, ` +
        `but the file is empty`
      );
    }

    console.log(
      '[csound] compiling external ORC',
      {
        orcName,
        orcURL,
        chars: orcText.length,
      }
    );

    // The fetched external orchestra is the sole active source.
    await csound.compileOrc(orcText);

    await csound.start();

    // Initialise shared defaults once so baseCps,
    // ampDbfs, bend1 and bend2 are non-zero.
    await csound.inputMessage(
      'i 900 0 0.01'
    );

    console.log(
      '✅ Csound engine ready',
      {
        csoundSource,
        csoundVersion,
        orcName,
      }
    );

    return csound;
  })();

  return initPromise;
}

export async function playTestTone({
  dur = 0.2,
} = {}) {
  const cs = await enableCsound();

  // Report baseCps from JavaScript when the selected
  // @csound/browser build exposes getControlChannel().
  try {
    const base =
      await cs.getControlChannel?.(
        'baseCps'
      );

    if (typeof base === 'number') {
      console.log(
        '[csound] baseCps (JS) =',
        base,
        'Hz'
      );
    }
  } catch (_) {
    // Ignore this diagnostic when the API is unavailable.
  }

  // The external ORC must define instr 902.
  await cs.inputMessage(
    `i 902 0 ${dur}`
  );
}

export function getCsound() {
  return csound;
}

export async function resetCsound() {
  try {
    // Detach the message handler.
    try {
      if (csound) {
        if (typeof msgUnsub === 'function') {
          msgUnsub();
        } else if (
          typeof csound.off === 'function'
        ) {
          csound.off(
            'message',
            onMsg
          );
        } else if (
          typeof csound.removeListener ===
          'function'
        ) {
          csound.removeListener(
            'message',
            onMsg
          );
        }
      }
    } catch (error) {
      console.warn(
        '[csoundIni-t 5] message detach warning:',
        error
      );
    } finally {
      msgUnsub = null;
    }

    if (csound) {
      if (
        typeof csound.stop === 'function'
      ) {
        await csound.stop();
      }

      if (
        typeof csound.cleanup === 'function'
      ) {
        await csound.cleanup();
      }

      if (
        typeof csound.reset === 'function'
      ) {
        await csound.reset();
      }

      if (
        typeof csound.destroy === 'function'
      ) {
        await csound.destroy();
      }
    }

    if (
      audioCtx &&
      typeof audioCtx.close === 'function'
    ) {
      await audioCtx.close();
    }
  } catch (error) {
    console.warn(
      '[csoundIni-t 6] reset warning:',
      error
    );
  } finally {
    csound = null;
    initPromise = null;
    audioCtx = null;
    msgUnsub = null;

    csoundSource = 'none';
    csoundVersion = 'unknown';
  }
}