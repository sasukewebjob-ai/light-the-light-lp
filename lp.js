/* Progressive enhancement only: all essential content and links work without JS. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Group-session tabs: click or arrow/Home/End keyboard navigation.
  const tabs = [...document.querySelectorAll('[data-step]')];
  const panels = [...document.querySelectorAll('.step-panel')];
  const tabList = document.querySelector('.step-tabs');
  function selectStep(index, moveFocus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (moveFocus) tabs[index].focus();
  }
  if (tabList && tabs.length === panels.length) {
    tabList.setAttribute('role', 'tablist');
    const narrowTabs = window.matchMedia('(max-width: 850px)');
    const updateOrientation = () => tabList.setAttribute('aria-orientation', narrowTabs.matches ? 'horizontal' : 'vertical');
    updateOrientation();
    narrowTabs.addEventListener('change', updateOrientation);
    tabs.forEach((tab, i) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', tab.id);
      panels[i].tabIndex = 0;
      tab.addEventListener('click', () => selectStep(i));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (i + 1) % tabs.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (i + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); selectStep(next, true); }
      });
    });
    selectStep(0);
  }

  // Answers stay readable without JS; closed panels are also removed from tab order.
  document.querySelectorAll('.faq-question').forEach(button => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    function setOpen(open) {
      button.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-closed', !open);
      panel.inert = !open;
    }
    setOpen(false);
    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  });

  // A single animation frame updates orientation and the small-screen CTA.
  const header = document.getElementById('header');
  const progress = document.getElementById('readingProgress');
  const hero = document.querySelector('.hero');
  const finalSection = document.getElementById('contact');
  const floating = document.getElementById('mobileCta');
  const sectionLinks = [...document.querySelectorAll('.main-nav a')];
  const sectionTargets = sectionLinks.map(link => document.querySelector(link.getAttribute('href')));
  let queued = false;
  function updateScroll() {
    queued = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, y / max)) : 0})`;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    let active = -1;
    sectionTargets.forEach((section, index) => { if (section && section.getBoundingClientRect().top <= 160) active = index; });
    sectionLinks.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (floating && hero && finalSection) {
      const belowHero = hero.getBoundingClientRect().bottom < 80;
      const atEnd = finalSection.getBoundingClientRect().top < window.innerHeight;
      floating.hidden = !(window.innerWidth <= 600 && belowHero && !atEnd);
    }
  }
  function scheduleScroll() { if (!queued) { queued = true; window.requestAnimationFrame(updateScroll); } }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('load', scheduleScroll);
  document.querySelectorAll('details').forEach(details => details.addEventListener('toggle', scheduleScroll));
  if ('ResizeObserver' in window) new ResizeObserver(scheduleScroll).observe(document.body);
  updateScroll();

  // Only animate below-fold content, once. Respect the user's motion preference.
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const reveals = [...document.querySelectorAll('.reveal')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-pending');
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04, rootMargin: '0px 0px 30px 0px' });
    document.documentElement.classList.add('motion-ready');
    reveals.forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('is-pending');
        observer.observe(element);
      }
    });
    const disableMotion = event => {
      if (!event.matches) return;
      reveals.forEach(element => element.classList.remove('is-pending'));
      observer.disconnect();
    };
    reduceMotion.addEventListener('change', disableMotion);
    // Anchor navigation must never land on text still waiting to reveal.
    window.addEventListener('hashchange', () => {
      const target = document.getElementById(window.location.hash.slice(1));
      target?.querySelectorAll('.is-pending').forEach(element => element.classList.remove('is-pending'));
    });
  }

  // Send through one existing analytics path, never both (GA4 + GTM).
  document.querySelectorAll('a[data-cta]').forEach(link => {
    link.addEventListener('click', () => {
      const payload = { cta_location: link.dataset.cta };
      if (typeof window.gtag === 'function') window.gtag('event', 'line_click', payload);
      else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'line_click', ...payload });
    });
  });
})();
