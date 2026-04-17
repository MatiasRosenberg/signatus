/**
 * scroll-reveal.js — Intersection Observer reveal animations
 * Signatus
 */

'use strict';

(function initScrollReveal() {
  if (prefersReducedMotion()) {
    // Make everything visible immediately
    document.querySelectorAll('.reveal-up, .reveal-fade').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  const elements = document.querySelectorAll('.reveal-up, .reveal-fade');
  if (!elements.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.08,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // fire once
      }
    });
  }, observerOptions);

  elements.forEach(el => observer.observe(el));

  // iOS Safari fix: IntersectionObserver doesn't fire for elements
  // already in the viewport on page load — force-reveal them.
  setTimeout(() => {
    elements.forEach(el => {
      if (el.classList.contains('is-visible')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-visible');
        observer.unobserve(el);
      }
    });
  }, 120);

})();
