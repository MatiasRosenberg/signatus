/**
 * ticker.js — Populate and animate the news ticker
 * Signatus
 */

'use strict';

(function initTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const items = [
    '#GoSignatus',
    'Organización de Esports',
    'Argentina & LATAM',
    'Counter-Strike 2',
    'Proyecto Jalki',
    'Fundada · Dic 2022',
    'Inclusión en el esport',
    'Competencia · Comunidad · Crecimiento',
    '#GoSignatus',
    'Buenos Aires Major 2027',
    'Convocatoria abierta',
    'signatusteam@gmail.com',
  ];

  // Duplicate for seamless loop
  const allItems = [...items, ...items];

  const fragment = document.createDocumentFragment();

  allItems.forEach(text => {
    const span = document.createElement('span');
    span.className = 'ticker__item';
    span.textContent = text;
    fragment.appendChild(span);
  });

  track.appendChild(fragment);

  // Pause on hover
  track.parentElement.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
  });
  track.parentElement.addEventListener('mouseleave', () => {
    track.style.animationPlayState = 'running';
  });

})();
