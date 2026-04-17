/**
 * utils.js — Shared utilities
 * Signatus
 */

'use strict';

/**
 * Throttle a function call to at most once per `limit` ms.
 * @param {Function} fn
 * @param {number} limit
 */
function throttle(fn, limit = 16) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= limit) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Debounce a function call: wait `delay` ms after last invocation.
 * @param {Function} fn
 * @param {number} delay
 */
function debounce(fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Clamp a value between min and max.
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Linear interpolation.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Check if user prefers reduced motion.
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
