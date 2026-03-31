// js/gui/wakeLock.js
// Keep screen awake for the full SatGam performance window.
// 12:24 + 0:24 tail = 12:48 total.

export const SATGAM_WAKE_MS = (12 * 60 + 48) * 1000; // 768000 ms

let wakeSentinel = null;
let wakeDeadlineMs = 0;
let wakeTimerId = 0;
let lifecycleInstalled = false;
let currentStatus = null;

export function wakeLockSupported() {
  return window.isSecureContext && ('wakeLock' in navigator);
}

export async function startPerformanceWakeLock(
  status,
  durationMs = SATGAM_WAKE_MS
) {
  currentStatus = status;
  wakeDeadlineMs = Date.now() + durationMs;

  status.wakeLockSupported = wakeLockSupported();
  status.wakeLockActive = false;
  status.wakeLockError = '';

  installWakeLockLifecycle();

  clearTimeout(wakeTimerId);

  const ok = await acquireWakeLock(status);

  wakeTimerId = window.setTimeout(() => {
    stopPerformanceWakeLock(status);
  }, durationMs);

  return ok;
}

export async function stopPerformanceWakeLock(status = currentStatus) {
  clearTimeout(wakeTimerId);
  wakeTimerId = 0;
  wakeDeadlineMs = 0;

  if (wakeSentinel) {
    const sentinel = wakeSentinel;
    wakeSentinel = null;

    try {
      await sentinel.release();
    } catch (err) {
      console.warn('[wakeLock] release failed', err);
    }
  }

  if (status) {
    status.wakeLockActive = false;
  }
}

async function acquireWakeLock(status = currentStatus) {
  if (!wakeLockSupported()) return false;
  if (document.visibilityState !== 'visible') return false;
  if (Date.now() >= wakeDeadlineMs) return false;
  if (wakeSentinel && !wakeSentinel.released) return true;

  try {
    wakeSentinel = await navigator.wakeLock.request('screen');

    wakeSentinel.addEventListener(
      'release',
      () => {
        wakeSentinel = null;
        if (status) status.wakeLockActive = false;
        console.log('[wakeLock] released');
      },
      { once: true }
    );

    status.wakeLockSupported = true;
    status.wakeLockActive = true;
    status.wakeLockError = '';

    console.log('[wakeLock] active');
    return true;
  } catch (err) {
    status.wakeLockSupported = true;
    status.wakeLockActive = false;
    status.wakeLockError = `${err.name}: ${err.message}`;

    console.warn('[wakeLock] request failed', err);
    return false;
  }
}

function installWakeLockLifecycle() {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;

  document.addEventListener('visibilitychange', async () => {
    if (!currentStatus) return;
    if (!currentStatus.running) return;
    if (document.visibilityState !== 'visible') return;
    if (Date.now() >= wakeDeadlineMs) return;

    await acquireWakeLock(currentStatus);
  });

  window.addEventListener('pagehide', () => {
    stopPerformanceWakeLock(currentStatus);
  });
}