/**
 * nav.js
 * Navigation scroll behavior + hamburger mobile menu.
 */

export function initNav() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuClose  = document.querySelector('.menu-close');
  if (!navbar) return;

  let lastScrollY   = 0;
  let ticking       = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;

        // Border fade in after 80px
        navbar.classList.toggle('scrolled', y > 80);

        // Hide on scroll down >200px, show on scroll up
        if (y > 200 && y > lastScrollY + 10) {
          navbar.classList.add('hidden');
        } else if (y < lastScrollY - 5) {
          navbar.classList.remove('hidden');
        }

        lastScrollY = y;
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hamburger toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (menuClose && mobileMenu) {
    menuClose.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  // Close mobile menu on link click
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
}
