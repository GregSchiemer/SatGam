// js/gui/net.js — ultra-minimal WebSocket helper (auto-reconnect)

export class WS {
  constructor(url, { onOpen, onMsg } = {}) {
    this.url = url;
    this.onOpen = onOpen || (() => {});
    this.onMsg  = onMsg  || (() => {});
    this.ws = null;
    this._connect();
  }
  _connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.onOpen();
    this.ws.onmessage = (e) => {
      try { this.onMsg(JSON.parse(e.data)); } catch {}
    };
    this.ws.onclose = () => setTimeout(() => this._connect(), 1000);
  }
  send(obj) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(obj)); }
}
