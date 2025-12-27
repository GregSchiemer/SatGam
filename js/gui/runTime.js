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

// local only and unused, possibly redundant
export function setMode(mode) {
  rt.mode = mode;
}

// local only and unused, possibly redundant
export function setTicking(isOn) {
  rt.ticking = !!isOn;
}

// local only and unused, possibly redundant
export function isTicking() {
  return rt.ticking;
}

// optional debug frame counter (unused at present)
export function getFrame() {
  return rt.frame;
}

// optional debug frame counter (unused at present)
export function bumpFrame() {
  rt.frame += 1;
}


// js/gui/runTime.js

export function makeWallClockRenderer(config) {
  const {
    ctx,
    slots = [],
    role = 'consort',
    f = 0,
    status,

    prepareAndRenderBackground,
    renderSavedBackground,
    getFamilyMask,
    familyForIndex,
    drawPhoneAt,

    renderStartBoth,
    renderRunning,
    renderStartLeader,
    renderEnd,
  } = config;

  if (!ctx || !Array.isArray(slots) || !drawPhoneAt || !familyForIndex) {
    console.warn('[runTime] makeWallClockRenderer: missing ctx/slots/drawPhoneAt/familyForIndex');
    return () => {};
  }

  const RADIAL_OFFSET = Math.PI / 2;

  return function frameRenderer(fauxClock) {
    // 1) Background
    if (typeof renderSavedBackground === 'function') {
      renderSavedBackground(ctx);
    } else if (typeof prepareAndRenderBackground === 'function') {
      prepareAndRenderBackground(f);
    }

    // If we don't have a status object, just draw phones + bail
    if (!status || typeof status !== 'object') {
      // (phones-only fallback)
      let mask = null;
      if (typeof getFamilyMask === 'function') {
        mask = getFamilyMask(fauxClock);
      }
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const family = (mask != null) ? familyForIndex(i, mask) : familyForIndex(i);
        const baseAngle = slot.angle ?? 0;
        const angle = baseAngle + RADIAL_OFFSET;
        drawPhoneAt(ctx, { ...slot, angle, family, active: true, shadow: true });
      }
      return;
    }

    const isLeader  = (role === 'leader');
    const isRunning = !!status.running;

    // --- LEADER MODE-SELECT VIEW: text only, NO phones ---
    if (!isRunning && isLeader) {
      if (typeof renderStartLeader === 'function') {
        renderStartLeader(ctx, status);
      } else if (typeof renderStartBoth === 'function') {
        renderStartBoth(ctx, status);
      }
      return; // ← important: skip phone drawing
    }

    // 2) Phones (for consort pre-view, and for running on both)
    let mask = null;
    if (typeof getFamilyMask === 'function') {
      mask = getFamilyMask(fauxClock);
    }

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const family = (mask != null) ? familyForIndex(i, mask) : familyForIndex(i);
      const baseAngle = slot.angle ?? 0;
      const angle = baseAngle + RADIAL_OFFSET;

      drawPhoneAt(ctx, {
        ...slot,
        angle,
        family,
        active: true,
        shadow: true,
      });
    }

    // 3) Text overlays for other cases
    if (!isRunning) {
      // CONSORT pre-view (leader case already handled above)
      if (typeof renderStartBoth === 'function') {
        renderStartBoth(ctx, status);
      }
      return;
    }

    // RUNNING view (both leader and consort)
    if (typeof renderRunning === 'function') {
      renderRunning(ctx, status);
    }
    // Later you can call renderEnd(ctx, status) when the show finishes.
  };
}
