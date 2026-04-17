/**
 * nav.js — Navigation: scroll state, mobile menu, smooth links
 * Signatus
 */

'use strict';

(function initNav() {
  const nav        = document.getElementById('nav');
  const burger     = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!nav) return;

  // ─── Scroll state ───────────────────────────────────────

  const handleScroll = throttle(() => {
    if (window.scrollY > 40) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }, 100);

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // initial check

  // ─── Mobile menu ────────────────────────────────────────

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = burger.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

      if (isOpen) {
        mobileMenu.style.display = 'flex';
        requestAnimationFrame(() => {
          mobileMenu.style.opacity = '1';
        });
      } else {
        mobileMenu.style.opacity = '0';
        setTimeout(() => {
          if (!burger.classList.contains('is-open')) {
            mobileMenu.style.display = '';
          }
        }, 250);
      }
    });

    // Close mobile menu when a link is clicked
    mobileMenu.querySelectorAll('.nav__mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        mobileMenu.style.opacity = '0';
        setTimeout(() => { mobileMenu.style.display = ''; }, 250);
      });
    });
  }

  // ─── Active link highlighting ────────────────────────────

  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinks = document.querySelectorAll('.nav__link');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.style.color = 'var(--clr-accent)';
            } else {
              link.style.color = '';
            }
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  sections.forEach(section => sectionObserver.observe(section));

})();
