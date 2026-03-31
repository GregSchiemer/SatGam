// js/gui/net.js — minimal WebSocket helper with controlled reconnect + tracing

export class WS {
  constructor(url, { onOpen, onMsg, onClose, onError, reconnectMs = 1000 } = {}) {
    this.url = url;
    this.onOpen = onOpen || (() => {});
    this.onMsg = onMsg || (() => {});
    this.onClose = onClose || (() => {});
    this.onError = onError || (() => {});
    this.reconnectMs = reconnectMs;

    this.ws = null;
    this._closedByUser = false;
    this._reconnectTimer = null;
    this._connectCount = 0;

    this._connect();
  }

  _connect() {
    if (this._closedByUser) return;

    this._connectCount += 1;
    console.log('[WS] connect attempt', {
      url: this.url,
      attempt: this._connectCount,
    });

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] open', { url: this.url });
      this.onOpen();
    };

    this.ws.onmessage = (e) => {
      try {
        this.onMsg(JSON.parse(e.data));
      } catch (err) {
        console.warn('[WS] bad JSON message', {
          url: this.url,
          data: e.data,
          err,
        });
      }
    };

    this.ws.onerror = (err) => {
      console.warn('[WS] error', { url: this.url, err });
      this.onError(err);
    };

    this.ws.onclose = (ev) => {
      console.log('[WS] close', {
        url: this.url,
        code: ev.code,
        reason: ev.reason,
        wasClean: ev.wasClean,
        closedByUser: this._closedByUser,
      });

      this.onClose(ev);

      if (this._closedByUser) return;

      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = setTimeout(() => this._connect(), this.reconnectMs);
    };
  }

  send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  close() {
    this._closedByUser = true;
    clearTimeout(this._reconnectTimer);

    if (this.ws) {
      this.ws.close();
    }
  }
}