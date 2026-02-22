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

export function easeInOutQuad01(nowMs, bgFade) {
  if (!bgFade?.startMs || !bgFade?.durationMs) return 1;

  const u = Math.min(1, (nowMs - bgFade.startMs) / bgFade.durationMs);
  return (u < 0.5)
    ? (2 * u * u)
    : (1 - Math.pow(-2 * u + 2, 2) / 2);
}

export function hide(){
	return 'transparent';
}

export function isConcertMode(status) {  
return status.modeChosen === 'concert';   // mirror your tap-handler rule
}

export function logStatusProbe(stringID, status, extra = {}) {
  if (!status) {
    console.log(stringID, { status: null, ...extra });
    return;
  }

  console.log(stringID, {
    running: status.running,
    isEndScreen: status.isEndScreen,
    modeChosen: status.modeChosen,
    index: status.index,
    bgFamily: status.bgFamily,
    bgFamilyTarget: status.bgFamilyTarget,
    ...extra, // caller-specific fields (keyID, tapFamily, familyOn, etc.)
  });
}