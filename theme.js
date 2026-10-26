/* Paste Guard shared design tokens and inline icons.
 * Used by the popup (injected into <head>) and by the paste dialog (inside its shadow DOM),
 * so both surfaces draw from one set of colors, radii, spacing, shadows and motion curves.
 * No network, no external fonts or images: system fonts and hand-drawn SVG paths only. */
(function (root) {
  'use strict';

  const BASE = [
    '--pg-font: ui-sans-serif, system-ui, "SF Pro Display", "Segoe UI", Inter, Roboto, sans-serif;',
    '--pg-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;',
    // spacing scale (4 px half step, then 8 px steps)
    '--pg-s1: 4px; --pg-s2: 8px; --pg-s3: 12px; --pg-s4: 16px; --pg-s5: 24px; --pg-s6: 32px;',
    // radius scale
    '--pg-r-sm: 10px; --pg-r-md: 16px; --pg-r-lg: 24px; --pg-r-pill: 999px;',
    // motion
    '--pg-ease-spring: cubic-bezier(.2, 1.25, .4, 1); --pg-ease-out: cubic-bezier(.2, .8, .2, 1);',
    '--pg-dur-fast: 150ms; --pg-dur-med: 180ms;',
    // brand
    '--pg-accent-1: #335dff; --pg-accent-2: #7a4bf5;',
    '--pg-grad: linear-gradient(135deg, var(--pg-accent-1), var(--pg-accent-2));',
  ].join('\n');

  const LIGHT = [
    '--pg-bg: #f1f3ff; --pg-surface: rgba(255, 255, 255, .94); --pg-surface-solid: #ffffff;',
    '--pg-surface-2: rgba(25, 40, 120, .05); --pg-border: rgba(30, 45, 120, .14);',
    '--pg-text: #0e1330; --pg-muted: #4a5578;',
    '--pg-danger: #b42f1c; --pg-danger-bg: rgba(220, 70, 50, .10); --pg-danger-line: rgba(220, 70, 50, .28);',
    '--pg-ok: #0b7a41; --pg-ok-bg: rgba(15, 150, 80, .10);',
    '--pg-focus: #335dff; --pg-scrim: rgba(20, 25, 60, .45);',
    '--pg-shadow-1: 0 1px 2px rgba(20, 30, 90, .08);',
    '--pg-shadow-2: 0 4px 12px rgba(20, 30, 90, .10), 0 1px 3px rgba(20, 30, 90, .08);',
    '--pg-shadow-3: 0 24px 60px rgba(20, 30, 90, .28), 0 8px 20px rgba(20, 30, 90, .14);',
    '--pg-inner: inset 0 1px 0 rgba(255, 255, 255, .9);',
    '--pg-glow: 0 6px 20px rgba(80, 80, 255, .35);',
  ].join('\n');

  const DARK = [
    '--pg-bg: #0a0d1c; --pg-surface: rgba(20, 26, 54, .80); --pg-surface-solid: #141a36;',
    '--pg-surface-2: rgba(255, 255, 255, .05); --pg-border: rgba(160, 175, 255, .18);',
    '--pg-text: #eef1ff; --pg-muted: #a6aecf;',
    '--pg-danger: #ff8f7e; --pg-danger-bg: rgba(255, 120, 100, .14); --pg-danger-line: rgba(255, 140, 120, .32);',
    '--pg-ok: #4be09a; --pg-ok-bg: rgba(75, 224, 154, .14);',
    '--pg-focus: #9db4ff; --pg-scrim: rgba(4, 6, 16, .62);',
    '--pg-shadow-1: 0 1px 2px rgba(0, 0, 0, .4);',
    '--pg-shadow-2: 0 4px 14px rgba(0, 0, 0, .35), 0 1px 3px rgba(0, 0, 0, .4);',
    '--pg-shadow-3: 0 28px 70px rgba(0, 0, 0, .6), 0 8px 24px rgba(0, 0, 0, .4);',
    '--pg-inner: inset 0 1px 0 rgba(255, 255, 255, .08), inset 0 0 40px rgba(110, 120, 255, .06);',
    '--pg-glow: 0 6px 24px rgba(110, 100, 255, .45);',
  ].join('\n');

  // CSS text that defines every token on `selector`, for light and dark mode.
  function tokensCss(selector) {
    return selector + ' {\n' + BASE + '\n' + LIGHT + '\n}\n' +
      '@media (prefers-color-scheme: dark) {\n' + selector + ' {\n' + DARK + '\n}\n}\n';
  }

  // Icons: 24x24 stroke paths drawn for Paste Guard.
  const ICONS = {
    shield: ['M12 3l7.5 3v5.2c0 4.6-3.1 8.3-7.5 9.8-4.4-1.5-7.5-5.2-7.5-9.8V6L12 3z'],
    shieldCheck: ['M12 3l7.5 3v5.2c0 4.6-3.1 8.3-7.5 9.8-4.4-1.5-7.5-5.2-7.5-9.8V6L12 3z', 'M8.6 12.2l2.5 2.5 4.4-4.9'],
    mail: ['M4 6.5h16v11H4z', 'M4.5 7.5l7.5 5.8 7.5-5.8'],
    phone: ['M8 3.5h3l1.3 3.6-1.8 1.4a10.5 10.5 0 004.9 4.9l1.4-1.8 3.6 1.3v3a1.8 1.8 0 01-2 1.8A15.5 15.5 0 014.2 5.5 1.8 1.8 0 016 3.5z'],
    card: ['M3 6.5h18v11H3z', 'M3 10.5h18', 'M6.5 14.5h4'],
    id: ['M3 5.5h18v13H3z', 'M8.5 11.2a1.9 1.9 0 100-3.8 1.9 1.9 0 000 3.8z', 'M5.8 15.8c.4-1.7 1.6-2.6 2.7-2.6s2.3.9 2.7 2.6', 'M14 9h4.5M14 12h4.5M14 15h2.5'],
    key: ['M8 15.5a4 4 0 100-8 4 4 0 000 8z', 'M11 11.5h9.5M17.5 11.5v3M20.5 11.5v2'],
    tag: ['M3.5 12.5V4.5h8l9 9-8 8-9-9z', 'M8 8.5h.01'],
    lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 017 0v3'],
    arrow: ['M4 12h15M13.5 6.5L19 12l-5.5 5.5'],
    bank: ['M3 9.5l9-5 9 5', 'M5.5 10.5v7', 'M10 10.5v7', 'M14 10.5v7', 'M18.5 10.5v7', 'M3 20h18'],
    spark: ['M3 15c2.5 0 2.5-6 5-6s2.5 8 5 8 2.5-10 5-10 1.5 8 3 8'],
  };
  // Which icon a finding type uses.
  const TYPE_ICON = { EMAIL: 'mail', PHONE: 'phone', CARD: 'card', AADHAAR: 'id', PAN: 'id', SSN: 'id', API_KEY: 'key', CUSTOM: 'tag',
    UPI: 'card', IFSC: 'bank', BANK_ACCT: 'bank', IBAN: 'bank', GSTIN: 'id', NINO: 'id' };

  function svg(name, size) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', String(size || 20));
    s.setAttribute('height', String(size || 20));
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.75');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    (ICONS[name] || []).forEach(function (d) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }

  // Keyboard hints: the Alt key is called Option on a Mac. Evaluated at call time. The shortcuts themselves match on
  // event.code, so they work whatever character Option+letter types on a Mac.
  function isMac() {
    const n = root.navigator || {};
    return /mac|iphone|ipad/i.test(String(n.platform || '') + ' ' + String(n.userAgent || ''));
  }
  function altName() { return isMac() ? 'Option' : 'Alt'; }
  function keys(text) { return String(text).replace(/\bAlt\b/g, altName()); }

  const api = { tokensCss: tokensCss, svg: svg, TYPE_ICON: TYPE_ICON, isMac: isMac, altName: altName, keys: keys };
  root.PasteGuardTheme = api;

  // In the popup (an extension page) install the tokens on :root as soon as this script runs.
  if (typeof document !== 'undefined' && document.head && location.protocol === 'chrome-extension:') {
    const st = document.createElement('style');
    st.textContent = tokensCss(':root');
    document.head.appendChild(st);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
