/**
 * app.js
 * Main entry point for The Machine Room portfolio.
 * Initializes all modules and runs page-load sequence.
 */

import { initParticles } from './particles.js';
import { initCursor }    from './cursor.js';
import { initNav }       from './nav.js';

// ── Scroll progress bar ──
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const max = document.body.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
}

// ── Scroll reveals via IntersectionObserver ──
function initReveals() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseFloat(el.dataset.delay || '0');
        setTimeout(() => el.classList.add('revealed'), delay * 1000);
        observer.unobserve(el); // only animate once
      }
    });
  }, { threshold: 0.15, rootMargin: '-50px' });

  elements.forEach(el => observer.observe(el));
}

// ── Timeline viewport trigger ──
function initTimeline() {
  const entries = document.querySelectorAll('.timeline-entry');
  if (!entries.length) return;

  const observer = new IntersectionObserver((items) => {
    items.forEach(item => {
      if (item.isIntersecting) {
        item.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.3 });

  entries.forEach(e => observer.observe(e));
}

// ── Hero load-in sequence ──
function heroSequence() {
  const items = [
    { el: document.querySelector('.hero-tagline'),  delay: 300 },
    { el: document.querySelector('.hero-name'),     delay: 500 },
    { el: document.querySelector('.hero-subtitle'), delay: 700 },
    { el: document.querySelector('.hero-ctas'),     delay: 900 },
  ];

  items.forEach(({ el, delay }) => {
    if (!el) return;
    setTimeout(() => {
      el.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)';
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    }, delay);
  });

  // Metrics staggered
  const metrics = document.querySelectorAll('.metric-block');
  metrics.forEach((m, i) => {
    setTimeout(() => {
      m.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)';
      m.style.opacity   = '1';
      m.style.transform = 'translateY(0)';
    }, 1100 + i * 100);
  });

  // Scroll indicator
  const scrollInd = document.querySelector('.scroll-indicator');
  if (scrollInd) {
    setTimeout(() => scrollInd.classList.add('visible'), 2000);
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) scrollInd.classList.replace('visible', 'hidden');
    }, { once: true, passive: true });
  }
}

// ── Email copy toast ──
function initEmailCopy() {
  const emailLink = document.querySelector('.contact-email');
  const toast     = document.getElementById('copy-toast');
  if (!emailLink || !toast) return;

  emailLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailLink.dataset.email || emailLink.textContent.trim();
    navigator.clipboard.writeText(email).then(() => {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }).catch(() => {
      // Fallback: just follow mailto
      window.location.href = 'mailto:' + email;
    });
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initScrollProgress();
  initReveals();
  initTimeline();
  heroSequence();
  initEmailCopy();

  // Three.js loads after DOM — small delay to let fonts/layout settle
  setTimeout(initParticles, 100);
});
