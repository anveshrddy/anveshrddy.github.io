/**
 * cursor.js
 * Custom dual-layer cursor: inner dot + lagging outer ring.
 * Desktop only — disabled on touch devices.
 */

export function initCursor() {
  // Don't init on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;
  let rafId;

  // Track mouse
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
  }, { passive: true });

  // Lerp ring behind dot
  function lerp(a, b, t) { return a + (b - a) * t; }

  function loop() {
    ringX = lerp(ringX, mouseX, 0.15);
    ringY = lerp(ringY, mouseY, 0.15);
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    rafId = requestAnimationFrame(loop);
  }
  loop();

  // Expand ring on interactive elements
  const interactables = 'a, button, .skill-node, .identity-tag, .project-card, .project-card-featured, .card-link, .nav-logo, .contact-email, .social-link, .btn';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactables)) {
      ring.classList.add('hovering');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactables)) {
      ring.classList.remove('hovering');
    }
  });

  // Scale on click
  document.addEventListener('mousedown', () => {
    dot.classList.add('clicking');
    ring.classList.add('clicking');
  });

  document.addEventListener('mouseup', () => {
    dot.classList.remove('clicking');
    ring.classList.remove('clicking');
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
  });
}
