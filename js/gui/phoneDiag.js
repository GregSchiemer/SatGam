// js/gui/phoneDiag.js
//
// One-line on-phone diagnostic overlay.
// No imports. No WebSocket dependency. No canvas dependency.

const DIAG_ID = 'satgam-phone-diag';

const diag = {
  role: '?',
  secure: window.isSecureContext ? 'yes' : 'NO',
  protocol: window.location.protocol,
  ws: 'not-started',
  phase: 'boot',
};

let el = null;

export function installPhoneDiag(status = {}) {
  diag.role = status?.role ?? diag.role;
  diag.secure = window.isSecureContext ? 'yes' : 'NO';
  diag.protocol = window.location.protocol;

  if (!el) {
    el = document.createElement('div');
    el.id = DIAG_ID;

/*
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '999999',
      padding: '4px 6px',
      fontFamily: 'Menlo, Consolas, monospace',
      fontSize: '10px',
      lineHeight: '12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: 'white',
      background: 'rgba(0, 0, 0, 0.72)',
      pointerEvents: 'none',
    });
*/

	Object.assign(el.style, {
	  position: 'fixed',
	  left: '0',
	  right: '0',
	  top: '0',
	  zIndex: '999999',
	  padding: '6px 8px',
	  fontFamily: 'Menlo, Consolas, monospace',
	  fontSize: '12px',
	  lineHeight: '15px',
	  whiteSpace: 'normal',
	  overflow: 'visible',
	  color: 'white',
	  background: 'rgba(0, 0, 0, 0.82)',
	  pointerEvents: 'none',
	});

    document.body.appendChild(el);
  }

  renderPhoneDiag();
}

export function setPhoneDiag(patch = {}) {
  Object.assign(diag, patch);
  renderPhoneDiag();
}

function renderPhoneDiag() {
  if (!el) return;

  el.textContent =
    `SatGam diag | role=${diag.role}` +
    ` | secure=${diag.secure}` +
    ` | proto=${diag.protocol}` +
    ` | bus=${diag.ws}` +
    ` | phase=${diag.phase}`;
}