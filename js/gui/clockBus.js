// js/gui/clockBus.js — leader/consort clock bus using net.js WS helper

import { WS } from './net.js';

let BUS_SEQ = 0;
let SOCKET_SEQ = 0;

// Guard map lives once per page/module instance.
// Keyed so a duplicate call with the same status/role/url returns the same bus.
const ACTIVE_BUSES = new Map();

function resolveWsPort(wsPort) {
  const q = new URLSearchParams(window.location.search).get('wsPort');
  const qsPort = q && /^\d+$/.test(q) ? Number(q) : undefined;
  return wsPort ?? qsPort ?? 8010;
}

function resolveWsUrl(wsPort) {
  const loc = window.location;
  const host = loc.hostname || 'localhost';
  const proto = (loc.protocol === 'https:') ? 'wss' : 'ws';
  const port = resolveWsPort(wsPort);
  return `${proto}://${host}:${port}`;
}

// Role must be 'leader' or 'consort' to match server.py
export function makeClockBus({ role, wsPort, onMsg, statusId = 'no-status' } = {}) {
  const url = resolveWsUrl(wsPort);
  const busId = `${statusId}:bus${++BUS_SEQ}`;
  let socketId = `${busId}:ws${++SOCKET_SEQ}`;
  const guardKey = `${statusId}|${role}|${url}`;

  const STALE_CONNECT_MS = 4000;
  const WATCHDOG_MS = 2500;

  // Guard: block duplicate bus creation in the same page for the same status/role/url.
  if (ACTIVE_BUSES.has(guardKey)) {
    const existing = ACTIVE_BUSES.get(guardKey);
    console.warn('[clockBus] duplicate makeClockBus blocked', {
      statusId,
      role,
      url,
      guardKey,
      existingBusId: existing.busId,
    });
    return existing;
  }

  console.log('[clockBus] makeClockBus', {
    statusId,
    busId,
    role,
    url,
    guardKey,
  });

  const bus = {
    statusId,
    busId,
    socketId,
    role,
    url,
    ws: null,

    tickTimer: null,
    tickCount: 0,
    beatCount: 0,

    watchdogTimer: null,

    disposed: false,
    connectStartedAt: 0,
    lastOpenAt: 0,
    lastCloseAt: 0,
    openCount: 0,
    closeCount: 0,

    _cleanupFns: [],

    nativeReadyState() {
      return bus.ws?.ws?.readyState ?? WebSocket.CLOSED;
    },

    isOpen() {
      return bus.nativeReadyState() === WebSocket.OPEN;
    },

    isConnecting() {
      return bus.nativeReadyState() === WebSocket.CONNECTING;
    },

    send(obj) {
      if (bus.disposed) {
        console.warn('[clockBus] send ignored; bus disposed', {
          statusId,
          busId,
          role,
          type: obj?.type,
        });
        return false;
      }

      if (bus.isOpen()) {
        bus.ws.send(obj);
        return true;
      }

      console.warn('[clockBus] send while socket not open', {
        statusId,
        busId,
        socketId,
        role,
        type: obj?.type,
        readyState: bus.nativeReadyState(),
      });

      bus.ensureSocket(`send:${obj?.type ?? 'unknown'}`);
      return false;
    },

    startTicking(getMsPerBeat, {
      forceMs = null,
      sendTicks = true,
      checkpointEveryBeats = 24,
    } = {}) {
      bus.stopTicking();

      bus.tickCount = 0;
      bus.beatCount = 0;

      const loop = () => {
        const ms = forceMs ?? Math.max(10, Number(getMsPerBeat?.() ?? 1000));

        bus.beatCount += 1;

        if (
          sendTicks &&
          checkpointEveryBeats > 0 &&
          (bus.beatCount % checkpointEveryBeats) === 0
        ) {
          bus.tickCount += 1;
          bus.send({ type: 'tick' });

          console.log('[clockBus] state tick sent', {
            beatCount: bus.beatCount,
            tickCount: bus.tickCount,
          });
        }

        bus.tickTimer = setTimeout(loop, ms);
      };

      const firstMs = forceMs ?? Math.max(10, Number(getMsPerBeat?.() ?? 1000));
      bus.tickTimer = setTimeout(loop, firstMs);
    },

    stopTicking() {
      if (bus.tickTimer) clearTimeout(bus.tickTimer);
      bus.tickTimer = null;
    },

    startWatchdog() {
      bus.stopWatchdog();

      bus.watchdogTimer = setInterval(() => {
        if (bus.disposed) return;

        // Only nudge aggressively when the page is foregrounded.
        if (document.visibilityState !== 'visible') return;

        const rs = bus.nativeReadyState();

        if (rs === WebSocket.OPEN) return;

        if (rs === WebSocket.CONNECTING) {
          const age = Date.now() - (bus.connectStartedAt || Date.now());
          if (age < STALE_CONNECT_MS) return;
        }

        console.warn('[clockBus] watchdog restart', {
          statusId,
          busId,
          socketId,
          role,
          url,
          readyState: rs,
          visibilityState: document.visibilityState,
        });

        bus.ensureSocket('watchdog');
      }, WATCHDOG_MS);
    },

    stopWatchdog() {
      if (bus.watchdogTimer) clearInterval(bus.watchdogTimer);
      bus.watchdogTimer = null;
    },

    openSocket(reason = 'initial') {
      if (bus.disposed) return;

      socketId = `${busId}:ws${++SOCKET_SEQ}`;
      bus.socketId = socketId;
      bus.connectStartedAt = Date.now();

      console.log('[clockBus] opening socket', {
        statusId,
        busId,
        socketId,
        role,
        url,
        reason,
      });

      bus.ws = new WS(url, {
        reconnectMs: 1000,

        onOpen: () => {
          bus.lastOpenAt = Date.now();
          bus.connectStartedAt = 0;
          bus.openCount += 1;

          console.log('[clockBus] connected', {
            statusId,
            busId,
            socketId,
            role,
            url,
            openCount: bus.openCount,
          });

          // server.py expects this first
          bus.send({ type: 'register', role });
        },

        onMsg: (msg) => {
          onMsg && onMsg(msg);
        },

        onClose: (ev) => {
          bus.lastCloseAt = Date.now();
          bus.closeCount += 1;

          console.warn('[clockBus] socket closed', {
            statusId,
            busId,
            socketId,
            role,
            url,
            code: ev?.code,
            reason: ev?.reason,
            wasClean: ev?.wasClean,
            closeCount: bus.closeCount,
          });
        },

        onError: (err) => {
          console.warn('[clockBus] socket error', {
            statusId,
            busId,
            socketId,
            role,
            url,
            err,
          });
        },
      });
    },

    ensureSocket(reason = 'manual') {
      if (bus.disposed) return;

      const rs = bus.nativeReadyState();

      if (rs === WebSocket.OPEN) return;

      if (rs === WebSocket.CONNECTING) {
        const age = Date.now() - (bus.connectStartedAt || Date.now());
        if (age < STALE_CONNECT_MS) return;

        console.warn('[clockBus] stale CONNECTING socket; restarting', {
          statusId,
          busId,
          socketId,
          role,
          url,
          ageMs: age,
          reason,
        });
      }

      if (bus.ws?.close) {
        try { bus.ws.close(); } catch (_) {}
      }

      bus.openSocket(reason);
    },

    installLifecycleNudges() {
      const nudge = (reason) => {
        console.log('[clockBus] lifecycle nudge', {
          statusId,
          busId,
          socketId,
          role,
          url,
          reason,
          visibilityState: document.visibilityState,
        });
        bus.ensureSocket(reason);
      };

      const onVisible = () => {
        if (document.visibilityState === 'visible') nudge('visibilitychange');
      };

      const onFocus = () => nudge('focus');
      const onPageShow = () => nudge('pageshow');
      const onOnline = () => nudge('online');

      // Extra iPhone-friendly “user just touched the page” nudges.
      const onPointerDown = () => nudge('pointerdown');
      const onTouchStart = () => nudge('touchstart');
      const onKeyDown = () => nudge('keydown');

      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', onFocus);
      window.addEventListener('pageshow', onPageShow);
      window.addEventListener('online', onOnline);

      window.addEventListener('pointerdown', onPointerDown, { passive: true });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('keydown', onKeyDown);

      bus._cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisible));
      bus._cleanupFns.push(() => window.removeEventListener('focus', onFocus));
      bus._cleanupFns.push(() => window.removeEventListener('pageshow', onPageShow));
      bus._cleanupFns.push(() => window.removeEventListener('online', onOnline));
      bus._cleanupFns.push(() => window.removeEventListener('pointerdown', onPointerDown));
      bus._cleanupFns.push(() => window.removeEventListener('touchstart', onTouchStart));
      bus._cleanupFns.push(() => window.removeEventListener('keydown', onKeyDown));
    },

    dispose() {
      bus.disposed = true;
      bus.stopTicking();
      bus.stopWatchdog();

      for (const fn of bus._cleanupFns) {
        try { fn(); } catch (_) {}
      }
      bus._cleanupFns.length = 0;

      ACTIVE_BUSES.delete(guardKey);

      if (bus.ws?.close) {
        try { bus.ws.close(); } catch (_) {}
      }
      bus.ws = null;
    },
  };

  ACTIVE_BUSES.set(guardKey, bus);

  bus.installLifecycleNudges();
  bus.startWatchdog();
  bus.openSocket('initial');

  return bus;
}
