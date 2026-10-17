// GA4 and Microsoft Clarity. Only the public site is measured, so local previews stay out of the data.
// To test elsewhere, add ?tags=debug: GA4 hits go to DebugView only and Clarity sessions get env=debug.
(() => {
  const GA4_ID = 'G-F4BSCGG9BJ';
  const CLARITY_ID = 'yz169zsn9h';
  const debug = new URLSearchParams(window.location.search).get('tags') === 'debug';
  if (window.location.hostname !== 'sasukewebjob-ai.github.io' && !debug) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // GA4 treats any debug_mode value as on, so the key is only sent when testing.
  window.gtag('config', GA4_ID, debug ? { debug_mode: true } : {});

  window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments); };
  if (debug) window.clarity('set', 'env', 'debug');

  [`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`, `https://www.clarity.ms/tag/${CLARITY_ID}`].forEach(src => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  });
})();
