// ============================================
// AYUFRESH — Shared JavaScript
// ============================================

// ── Navbar scroll ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
});

// ── Mobile menu ──
function toggleMobile() {
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('mobileMenu').classList.toggle('open');
}
function closeMobile() {
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobileMenu').classList.remove('open');
}

// ── Scroll reveal ──
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => observer.observe(el));
}

// ── Stagger children ──
function staggerChildren(selector) {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.style.transitionDelay = (i * 0.1) + 's';
  });
}

// ── Leaf particles ──
function createLeafParticles(containerId, count = 10) {
  const container = document.getElementById(containerId);
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const leaf = document.createElement('div');
    leaf.style.cssText = `
      position:absolute;
      left:${Math.random()*100}%;
      font-size:${12+Math.random()*10}px;
      opacity:0;
      animation: leafFloat ${10+Math.random()*15}s linear ${Math.random()*12}s infinite;
      pointer-events:none;
    `;
    leaf.textContent = ['🍃','🌿','🍂','✦'][Math.floor(Math.random()*4)];
    container.appendChild(leaf);
  }
}

// ── Active nav link ──
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a:not(.nav-cta)').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === path || (path === '/' && href === '/'));
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  setActiveNav();
});
