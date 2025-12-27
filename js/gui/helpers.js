// helpers.js
// Math utilities.

export function set2Pi() {
  return parseFloat((2 * Math.PI).toFixed(2));
}

export function setArcStart(angle) {
  return parseFloat((Math.PI * angle).toFixed(2));
}

export function clockify(totalMs) {
  const totalSec = Math.floor(totalMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = String(totalSec % 60).padStart(2, '0');
  return { mins, secs };
}

export function isInsideCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return (dx * dx + dy * dy) <= (r * r);
}

export function hide(){
	return 'transparent';
}
