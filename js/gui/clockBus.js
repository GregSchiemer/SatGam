// js/gui/clockBus.js — leader/consort clock bus using net.js WS helper

import { WS } from './net.js';

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
export function makeClockBus({ role, wsPort, onMsg } = {}) {
  const url = resolveWsUrl(wsPort);

  const bus = {
    role,
    url,
    ws: null,
    tickTimer: null,
    tickCount: 0,

    send(obj) {
      bus.ws?.send(obj);
    },

    startTicking(getMsPerBeat, { forceMs = null } = {}) {
      // Recursive setTimeout lets the interval adapt if msPerBeat changes mid-run.
      bus.stopTicking();
      const loop = () => {
        const ms = forceMs ?? Math.max(10, Number(getMsPerBeat?.() ?? 1000));
        bus.send({ type: 'tick', n: bus.tickCount++, t: Date.now(), ms });
        bus.tickTimer = setTimeout(loop, ms);
      };
      loop();
    },

    stopTicking() {
      if (bus.tickTimer) clearTimeout(bus.tickTimer);
      bus.tickTimer = null;
    },
  };

  bus.ws = new WS(url, {
    onOpen: () => {
      bus.send({ type: 'register', role });   // server.py expects this first
      // optional: helpful log
      console.log('[clockBus] connected', { role, url });
    },
    onMsg: (msg) => {
      onMsg && onMsg(msg);
    },
  });

  return bus;
}