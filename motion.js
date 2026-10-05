(() => {
  'use strict';

  // Load after app.js so the project chapters are available to the observer.
  // No CSS rule hides content: an unavailable API or script leaves a usable page.
  if (!Element.prototype.animate) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const entrance = new Set();
  const pending = new Set();
  const revealed = new WeakSet();
  const ease = 'cubic-bezier(.16, 1, .3, 1)';
  let observer;

  const distance = name => Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  ) || 0;

  function play(element, { offset = 0, opacity = 0, delay = 0, duration = 680, intro = false } = {}) {
    if (!element || reducedMotion.matches || document.hidden) return;
    const style = getComputedStyle(element);
    const finalOpacity = Number(style.opacity);
    const finalTransform = style.transform;
    const className = offset ? 'motion-entering' : 'motion-fading';
    const from = { opacity: finalOpacity * opacity };
    const to = { opacity: finalOpacity };
    if (offset) {
      from.transform = `translate3d(0, ${offset}px, 0)${finalTransform === 'none' ? '' : ` ${finalTransform}`}`;
      to.transform = finalTransform;
    }

    element.classList.add(className);
    const animation = element.animate([from, to], {
      duration, delay, easing: ease, fill: 'both'
    });
    active.set(animation, element);
    if (intro) entrance.add(animation);

    const release = () => {
      if (!active.has(animation)) return;
      active.delete(animation);
      entrance.delete(animation);
      element.classList.remove(className);
      // Remove the finished effect as well as its compositing hint. The natural
      // styles are already the final state, so later frame changes stay independent.
      animation.cancel();
    };
    animation.addEventListener('finish', release, { once: true });
    animation.addEventListener('cancel', release, { once: true });
  }

  function finishEntrance() {
    [...entrance].forEach(animation => animation.cancel());
  }

  function revealImmediately(root) {
    if (!root) return;
    pending.forEach(element => {
      if (root === element || root.contains(element)) {
        pending.delete(element);
        revealed.add(element);
        observer?.unobserve(element);
      }
    });
    active.forEach((element, animation) => {
      if (root === element || root.contains(element)) animation.cancel();
    });
  }

  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (id) revealImmediately(document.getElementById(id));
  }

  const hero = document.getElementById('home');
  const entranceOffset = distance('--entrance-distance');
  const isHome = !location.hash || location.hash === '#home';
  if (hero && isHome && window.scrollY < 24 && !reducedMotion.matches) {
    play(hero.querySelector('.hero-visual'), { opacity: .3, duration: 1000, intro: true });
    play(hero.querySelector('.hero-topline'), { opacity: .15, duration: 600, intro: true });
    play(hero.querySelector('.eyebrow'), { offset: entranceOffset * .4, delay: 50, duration: 650, intro: true });
    play(hero.querySelector('h1'), { offset: entranceOffset, delay: 100, duration: 850, intro: true });
    play(hero.querySelector('.hero-description'), { offset: entranceOffset * .6, delay: 190, duration: 750, intro: true });
    play(hero.querySelector('.hero-bottom'), { offset: entranceOffset * .35, delay: 260, duration: 650, intro: true });
  }

  const selectors = [
    '.intro .section-index', '.intro h2', '.intro-bottom',
    '.section-topline', '.work-heading', '.work-end',
    '.about-title-block > .eyebrow', '.about-title-block h2', '.about-chinese',
    '.about-content > h3', '.about-content > p', '.skills', '.collaborators',
    '.awards-heading', '.award-row', '.contact-heading', '.contact-details',
    '.footer-bottom', '.card-heading', '.card-media'
  ];

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const element = entry.target;
        if (!entry.isIntersecting || revealed.has(element) || element.closest('[hidden]')) return;
        observer.unobserve(element);
        pending.delete(element);
        revealed.add(element);
        const image = element.classList.contains('card-media');
        // Images remain full-size and stationary. Only text moves; the sticky
        // chapter itself is never transformed, preserving its scroll geometry.
        play(element, image
          ? { opacity: .65, duration: 620 }
          : { offset: distance('--reveal-distance'), duration: 720 });
      });
    }, { rootMargin: '0px 0px 64px 0px', threshold: 0 });

    document.querySelectorAll(selectors.join(',')).forEach(element => {
      // Existing viewport content should never disappear on script startup,
      // including restored scroll positions and direct links into the page.
      if (element.getBoundingClientRect().top <= window.innerHeight) {
        revealed.add(element);
        return;
      }
      pending.add(element);
      observer.observe(element);
    });
    revealHash();
  }

  // Starting to use the page always takes precedence over its presentation.
  hero?.addEventListener('pointerdown', finishEntrance, { capture: true, passive: true });
  window.addEventListener('wheel', finishEntrance, { passive: true, once: true });
  window.addEventListener('touchstart', finishEntrance, { passive: true, once: true });
  window.addEventListener('scroll', () => {
    if (window.scrollY > 24 && entrance.size) finishEntrance();
  }, { passive: true });

  document.addEventListener('focusin', event => {
    finishEntrance();
    revealImmediately(event.target.closest('.project-card, section, footer'));
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    finishEntrance();
    let id;
    try { id = decodeURIComponent(link.getAttribute('href').slice(1)); } catch { return; }
    revealImmediately(document.getElementById(id));
  }, { capture: true });
  window.addEventListener('hashchange', revealHash);

  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      revealImmediately(document.documentElement);
      observer?.disconnect();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) [...active.keys()].forEach(animation => animation.cancel());
  });
  window.addEventListener('pagehide', () => {
    [...active.keys()].forEach(animation => animation.cancel());
  });
})();
