export function connectClock({ role = 'consort', wsPort, onStart, onTick, onStop } = {}) {
  const loc = window.location;
  const host = loc.hostname || 'localhost';

  const q = new URLSearchParams(window.location.search).get('wsPort');
  const qsPort = q && /^\d+$/.test(q) ? Number(q) : undefined; // only a number if present & digits
  const port = wsPort ?? qsPort ?? 8010;

//  const q = new URLSearchParams(loc.search).get('wsPort');
//  const qsPort = q && /^\d+$/.test(q) ? Number(q) : undefined;
//  const port = wsPort ?? qsPort ?? 8010;

  const proto = (loc.protocol === 'https:') ? 'wss' : 'ws';
  const url = `${proto}://${host}:${port}`;
  
  let ws, tickTimer=null;

  function open() {
    ws = new WebSocket(url);
    ws.onopen = () => ws.send(JSON.stringify({ type:'register', role }));
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'start') onStart && onStart(msg);
        else if (msg.type === 'tick') onTick && onTick(msg);
        else if (msg.type === 'stop') onStop && onStop(msg);
      } catch {}
    };
    ws.onclose = () => setTimeout(open, 1000);
  }
  open();

  function _send(o){ if (ws?.readyState===1) ws.send(JSON.stringify(o)); }
  function start({ bpm }={}){ _send({ type:'start', bpm }); }
  function stop(){ _send({ type:'stop' }); }
  function startTickLoop(hz=1){ if (tickTimer) clearInterval(tickTimer); tickTimer=setInterval(()=>_send({type:'tick'}), 1000/hz); }
  function stopTickLoop(){ if (tickTimer) clearInterval(tickTimer); tickTimer=null; }

  return { url, role, start, stop, startTickLoop, stopTickLoop };
}
