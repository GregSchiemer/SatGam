export function connectClock({ role = 'consort', wsPort, onStart, onTick, onStop } = {}) {
  const loc  = window.location;
  const host = loc.hostname || 'localhost';

  const q = new URLSearchParams(loc.search).get('wsPort');
  const qsPort = q && /^\d+$/.test(q) ? Number(q) : undefined;
  const port = wsPort ?? qsPort ?? 8010;

  // Choose ws/wss based on page scheme
  const wsProto = (loc.protocol === 'https:') ? 'wss' : 'ws';

  // Use the resolved port
  const url = `${wsProto}://${host}:${port}`;

  let ws = null;
  let tickTimer = null;

  function _send(o) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(o));
    }
  }

  function start({ bpm } = {}) { _send({ type: 'start', bpm }); }
  function stop()              { _send({ type: 'stop' }); }

  function startTickLoop(hz = 1) {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(() => _send({ type: 'tick' }), 1000 / hz);
  }

  function stopTickLoop() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  function open() {
    ws = new WebSocket(url);

    ws.onopen = () => _send({ type: 'register', role });

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'start') onStart && onStart(msg);
        else if (msg.type === 'tick') onTick && onTick(msg);
        else if (msg.type === 'stop') onStop && onStop(msg);
      } catch {}
    };

    ws.onclose = () => {
      // Stop any leader tick loop if the socket drops
      stopTickLoop();
      setTimeout(open, 1000);
    };
  }

  open();

  return { url, role, start, stop, startTickLoop, stopTickLoop };
}