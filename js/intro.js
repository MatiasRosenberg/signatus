/**
 * intro.js — Fullscreen intro video overlay
 * Signatus
 */

'use strict';

(function initIntro() {
  const overlay = document.getElementById('introOverlay');
  const video   = document.getElementById('introVideo');
  if (!overlay || !video) return;

  // Prevent body scroll while intro plays
  document.body.style.overflow = 'hidden';

  function dismiss() {
    overlay.classList.add('intro--done');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 700);
  }

  // Dismiss when video ends
  video.addEventListener('ended', dismiss);

  // Fallback: dismiss after 8s if video fails or hangs
  const fallback = setTimeout(dismiss, 8000);

  // If video can't play at all, dismiss immediately
  video.addEventListener('error', () => {
    clearTimeout(fallback);
    dismiss();
  });

  // Clear fallback if video actually ends normally
  video.addEventListener('ended', () => clearTimeout(fallback));

  // Allow skipping with click or any key
  overlay.addEventListener('click', () => { clearTimeout(fallback); dismiss(); });
  document.addEventListener('keydown', () => { clearTimeout(fallback); dismiss(); }, { once: true });

})();
