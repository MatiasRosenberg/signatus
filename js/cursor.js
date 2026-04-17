/**
 * cursor.js — Custom cursor behavior
 * Signatus
 */

'use strict';

(function initCursor() {
  // Don't run on touch-only devices
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor      = document.getElementById('cursor');
  const cursorTrail = document.getElementById('cursorTrail');
  if (!cursor || !cursorTrail) return;

  let mouseX = -100, mouseY = -100;
  let trailX = -100, trailY = -100;
  let isHovering = false;
  let rafId = null;

  // Move primary dot instantly
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  // Animate trail with lerp
  function animateTrail() {
    trailX = lerp(trailX, mouseX, 0.12);
    trailY = lerp(trailY, mouseY, 0.12);

    cursorTrail.style.left = trailX + 'px';
    cursorTrail.style.top  = trailY + 'px';

    rafId = requestAnimationFrame(animateTrail);
  }
  animateTrail();

  // Hover state on interactive elements
  const interactiveSelector = 'a, button, [role="button"], input, textarea, select, label';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      if (!isHovering) {
        isHovering = true;
        cursor.style.transform      = 'translate(-50%, -50%) scale(2.5)';
        cursor.style.background     = 'var(--clr-accent)';
        cursorTrail.style.opacity   = '0';
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) {
      if (isHovering) {
        isHovering = false;
        cursor.style.transform    = 'translate(-50%, -50%) scale(1)';
        cursorTrail.style.opacity = '1';
      }
    }
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity      = '0';
    cursorTrail.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    cursor.style.opacity      = '1';
    cursorTrail.style.opacity = isHovering ? '0' : '1';
  });

})();
