// js/gui/animation.js — owns the RAF loop
import { rt, renderFrame } from './runTime.js';

// Optional end-of-sequence callback, supplied by main.js
let onEndCallback = null;

/**
 * Allow main.js (or whoever owns the UI) to decide what happens
 * when the animation sequence finishes.
 */
export function setOnEndCallback(fn) {
  onEndCallback = (typeof fn === 'function') ? fn : null;
}

function tick() {
  // If we've been told to stop, bail early.
  if (!rt.ticking) return;

  // Count frames (purely informational / optional)
  rt.frame += 1;

  // Ask the current renderer to draw a frame based on time.
  renderFrame();

  // The renderer (or other code) may have turned ticking off
  // to signal "sequence finished".
  if (!rt.ticking) {
    if (onEndCallback) {
      // Let main.js decide how to show the end screen.
      onEndCallback();
    }
    return;
  }

  // Otherwise, keep going.
  rt.rafId = requestAnimationFrame(tick);
}

export function startAnimation() {
  if (rt.ticking) return;           // already running
  rt.ticking = true;
  rt.rafId = requestAnimationFrame(tick);
}

export function stopAnimation() {
  rt.ticking = false;
  if (rt.rafId) {
    cancelAnimationFrame(rt.rafId);
    rt.rafId = 0;
  }
}

