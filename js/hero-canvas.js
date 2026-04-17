/**
 * hero-canvas.js — Animated particle/node background for hero section
 * Signatus
 */

'use strict';

(function initHeroCanvas() {
  if (prefersReducedMotion()) return;

  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, nodes, rafId;

  // ─── Config ─────────────────────────────────────────────

  const CONFIG = {
    nodeCount:    55,
    nodeRadius:   1.5,
    nodeColor:    'rgba(212, 245, 66, 0.55)',
    lineColor:    'rgba(212, 245, 66, 0.08)',
    linkDistance: 160,
    speed:        0.25,
    mouseRadius:  160,
  };

  let mouse = { x: -9999, y: -9999 };

  // ─── Resize ─────────────────────────────────────────────

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
    if (!nodes) initNodes();
  }

  // ─── Nodes ──────────────────────────────────────────────

  function createNode() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * CONFIG.speed,
      vy: (Math.random() - 0.5) * CONFIG.speed,
      r:  CONFIG.nodeRadius + Math.random() * 1,
    };
  }

  function initNodes() {
    nodes = Array.from({ length: CONFIG.nodeCount }, createNode);
  }

  // ─── Draw ───────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Update positions
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;

      // Bounce off edges
      if (node.x < 0 || node.x > W) node.vx *= -1;
      if (node.y < 0 || node.y > H) node.vy *= -1;
      node.x = clamp(node.x, 0, W);
      node.y = clamp(node.y, 0, H);
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.linkDistance) {
          const alpha = (1 - dist / CONFIG.linkDistance) * 0.12;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(212, 245, 66, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      // Mouse repulsion glow
      const mdx = node.x - mouse.x;
      const mdy = node.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      const mouseInfluence = mdist < CONFIG.mouseRadius
        ? (1 - mdist / CONFIG.mouseRadius)
        : 0;

      const r = node.r + mouseInfluence * 2;
      const alpha = 0.5 + mouseInfluence * 0.5;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 245, 66, ${alpha})`;
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  }

  // ─── Init ───────────────────────────────────────────────

  window.addEventListener('resize', debounce(resize, 200));
  resize();
  draw();

  // Track mouse for interaction
  document.addEventListener('mousemove', throttle((e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, 32));

  document.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

})();
