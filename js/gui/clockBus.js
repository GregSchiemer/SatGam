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
  const socketId = `${busId}:ws${++SOCKET_SEQ}`;
  const guardKey = `${statusId}|${role}|${url}`;

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

  // Log 1
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

    send(obj) {
      bus.ws?.send(obj);
    },

startTicking(getMsPerBeat, {
  forceMs = null,
  sendTicks = true,
  checkpointEveryBeats = 24,
} = {}) {
  bus.stopTicking();

  bus.tickCount = 0;   // number of checkpoint ticks actually sent
  bus.beatCount = 0;   // number of local beats elapsed

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

    dispose() {
      bus.stopTicking();
      ACTIVE_BUSES.delete(guardKey);
      bus.ws?.close?.();
      bus.ws = null;
    },
  };

  ACTIVE_BUSES.set(guardKey, bus);

  // Log 2
  console.log('[clockBus] opening socket', {
    statusId,
    busId,
    socketId,
    role,
    url,
  });

  bus.ws = new WS(url, {
    onOpen: () => {
      // Log 3
      console.log('[clockBus] connected', {
        statusId,
        busId,
        socketId,
        role,
        url,
      });

      bus.send({ type: 'register', role });   // server.py expects this first
    },

    onMsg: (msg) => {
      onMsg && onMsg(msg);
    },
  });

  return bus;
}