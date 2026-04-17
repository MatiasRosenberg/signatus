/**
 * main.js — Entry point & initialization
 * Signatus
 *
 * All modules are already self-initializing via IIFEs.
 * This file handles any cross-module logic and final setup.
 */

'use strict';

(function main() {

  // ─── Smooth scroll for all anchor links ─────────────────

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();

      const navHeight = document.getElementById('nav')?.offsetHeight ?? 64;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 8;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });

  // ─── Mark body as JS-enabled ─────────────────────────────

  document.body.classList.add('js-enabled');

  // ─── Back-to-top on logo click ───────────────────────────

  document.querySelectorAll('.nav__logo, .footer__logo').forEach(el => {
    el.addEventListener('click', (e) => {
      if (el.getAttribute('href') === '#hero' || el.getAttribute('href') === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // ─── Year auto-update in footer ──────────────────────────

  const yearEls = document.querySelectorAll('[data-year]');
  yearEls.forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // ─── Console signature ───────────────────────────────────

  console.log(
    '%c SIGNATUS %c #GoSignatus ',
    'background:#e53535;color:#ffffff;font-weight:700;padding:4px 8px;',
    'background:#09090b;color:#e53535;font-weight:400;padding:4px 8px;'
  );

})();
