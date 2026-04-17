/**
 * faq.js — Accessible FAQ accordion
 * Signatus
 */

'use strict';

(function initFAQ() {
  const faqList = document.getElementById('faqList');
  if (!faqList) return;

  const questions = faqList.querySelectorAll('.faq__question');

  questions.forEach(button => {
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const answerId   = button.getAttribute('aria-controls');
      const answer     = document.getElementById(answerId);
      if (!answer) return;

      // Close all others (accordion behavior)
      questions.forEach(otherBtn => {
        if (otherBtn !== button) {
          const otherId     = otherBtn.getAttribute('aria-controls');
          const otherAnswer = document.getElementById(otherId);
          otherBtn.setAttribute('aria-expanded', 'false');
          if (otherAnswer) otherAnswer.hidden = true;
        }
      });

      // Toggle current
      const next = !isExpanded;
      button.setAttribute('aria-expanded', next ? 'true' : 'false');
      answer.hidden = !next;

      // Scroll into view if opening and item is partly off screen
      if (next) {
        requestAnimationFrame(() => {
          const rect = button.getBoundingClientRect();
          if (rect.top < 80) {
            window.scrollTo({
              top: window.scrollY + rect.top - 90,
              behavior: 'smooth'
            });
          }
        });
      }
    });

    // Keyboard: allow Enter and Space
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });
  });

})();
