// js/gui/animation.js — owns the RAF loop
import { rt, renderFrame } from './runTime.js';

// Optional end-of-sequence callback, supplied by main.js
let onEndCallback = null;

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
  // If an old RAF somehow survived, cancel it first.
  if (rt.rafId) {
    cancelAnimationFrame(rt.rafId);
    rt.rafId = 0;
  }

  // Always start from a clean runtime state.
  rt.ticking = true;
  rt.frame = 0;

  rt.rafId = requestAnimationFrame(tick);
}

export function stopAnimation() {
  rt.ticking = false;

  if (rt.rafId) {
    cancelAnimationFrame(rt.rafId);
    rt.rafId = 0;
  }

  // Clear frame count so the next run starts cleanly.
  rt.frame = 0;
}

