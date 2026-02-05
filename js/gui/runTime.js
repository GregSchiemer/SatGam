// js/gui/runTime.js

// Internal runtime state (shared across the app)
export const rt = {
  // Who is this page for? (set from main.js)
  role: 'consort',   // 'leader' or 'consort'
  mode: 'concert',   // 'concert' or 'preview'
  ticking: false,    // true when RAF loop is running
  rafId: 0,          // last requestAnimationFrame id
  frame: 0,          // how many frames we've rendered (if you use it)
  render: null,      // (fauxClock) => void
};

// called from main.js
export function setRole(role) {
  if (role !== 'leader' && role !== 'consort') {
    console.warn('[runTime] invalid role:', role);
    return;
  }
  rt.role = role;
}

// called from main.js
export function getRole() {
  return rt.role;
}

// gets from the main.js module
export function getMode() {
  return rt.mode;
}

export function setRender(fn) {
  rt.render = (typeof fn === 'function') ? fn : null;
}

export function renderFrame() {
  if (!rt.render) return;

  const nowMs = performance.now();
  const fauxClock = nowMs * 0.001; // seconds since page load

  rt.render(fauxClock);
}

export function refresh() {
  renderFrame();
}