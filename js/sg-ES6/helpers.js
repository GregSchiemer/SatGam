// helpers.js - math utilities.

export function set2Pi() {
  return parseFloat((2 * Math.PI).toFixed(2));
}

export function setArcStart(angle) {
  return parseFloat((Math.PI * angle).toFixed(2));
}

export function isInsideCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return (dx * dx + dy * dy) <= (r * r);
}

export function hide(){
	return 'transparent';
}

export function clockify(t) {
  return mins(t) + secs(t);
}

function mins(t) {
  const m = Math.floor(t / 60);
  return m < 10 ? "0" + m + ":" : m + ":";
}

function secs(t) {
  const s = Math.floor(t % 60);
  return s < 10 ? "0" + s : s;
}
