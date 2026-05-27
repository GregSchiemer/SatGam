// js/gui/clientStatus.js
//
// Passive client-side diagnostic helper.
//
// IMPORTANT:
//   This module must not import clockBus.js.
//   This module must not import main.js.
//   This module must not create its own WebSocket.
//
// It simply prepares/sends small diagnostic messages when another module
// gives it an already-open WebSocket.

let activeWs = null;
let queue = [];

/**
 * Build a diagnostic payload for server.py.
 */
export function makeClientStatus(status, stage, extra = {}) {
  return {
    type: 'client-status',
    stage,

    // Core identity
    role: status?.role ?? 'unknown',
    page: window.location.pathname,
    statusId: status?.statusId ?? null,

    // Useful runtime hints
    modeChosen: status?.modeChosen ?? null,
    modeConfirmed: status?.modeConfirmed ?? null,
    running: status?.running ?? null,
    isEndScreen: status?.isEndScreen ?? null,

    // Browser identity
    userAgent: navigator.userAgent,

    // Time of creation in the browser
    clientTime: new Date().toISOString(),

    ...extra,
  };
}

/**
 * Attach the WebSocket that clockBus.js owns.
 * Once attached, queued milestone messages are flushed.
 */
export function attachClientStatusSocket(ws) {
  activeWs = ws;
  flushClientStatusQueue();
}

/**
 * Detach the current socket, usually on close/error.
 */
export function detachClientStatusSocket(ws) {
  if (!ws || activeWs === ws) {
    activeWs = null;
  }
}

/**
 * Queue or send a milestone.
 *
 * Safe to call from main.js before the WebSocket is open.
 * If no socket is available yet, the message is queued.
 */
export function sendClientStatus(status, stage, extra = {}) {
  const payload = makeClientStatus(status, stage, extra);

  if (sendPayload(payload)) {
    return true;
  }

  queue.push(payload);
  console.log('[client-status] queued', payload);
  return false;
}

/**
 * Send a milestone immediately using a supplied WebSocket.
 *
 * Useful from clockBus.js immediately after sending the register message.
 */
export function sendClientStatusNow(ws, status, stage, extra = {}) {
  const payload = makeClientStatus(status, stage, extra);
  return sendPayload(payload, ws);
}

/**
 * Flush queued milestones, if the active socket is open.
 */
export function flushClientStatusQueue(ws = activeWs) {
  if (!isOpen(ws)) return false;

  while (queue.length > 0) {
    const payload = queue.shift();
    if (!sendPayload(payload, ws)) {
      queue.unshift(payload);
      return false;
    }
  }

  return true;
}

/**
 * Clear queued messages. Mostly useful during resets/debugging.
 */
export function clearClientStatusQueue() {
  queue = [];
}

/**
 * Internal send helper.
 */
function sendPayload(payload, ws = activeWs) {
  if (!isOpen(ws)) return false;

  try {
    ws.send(JSON.stringify(payload));
    console.log('[client-status] sent', payload);
    return true;
  } catch (err) {
    console.warn('[client-status] send failed', payload, err);
    return false;
  }
}

/**
 * Internal WebSocket-open test.
 */
function isOpen(ws) {
  return (
    ws &&
    typeof WebSocket !== 'undefined' &&
    ws.readyState === WebSocket.OPEN
  );
}