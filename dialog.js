/* Paste Guard dialog: the paste warning, as a reusable module.
 * Used by the content script on the AI sites and by the welcome page's "Try it" box.
 * Styles are inlined here and applied inside a shadow root; tokens come from src/theme.js. */
(function (root) {
  'use strict';
  const T = root.PasteGuardTheme;
  const CSS = ':host { all: initial; }\n' + T.tokensCss(':host') + `
    * { box-sizing: border-box; }
    .backdrop { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
      padding: var(--pg-s4); background: var(--pg-scrim); font-family: var(--pg-font); color: var(--pg-text);
      -webkit-backdrop-filter: blur(8px) saturate(1.1); backdrop-filter: blur(8px) saturate(1.1);
      animation: pg-fade 120ms var(--pg-ease-out) both; }
    .backdrop.out { animation: pg-out 90ms ease-out forwards; pointer-events: none; }
    .card { position: relative; width: min(520px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; overscroll-behavior: contain;
      padding: var(--pg-s5); border-radius: var(--pg-r-lg); background: var(--pg-surface-solid); border: 1px solid var(--pg-border);
      box-shadow: var(--pg-shadow-3), var(--pg-inner); animation: pg-pop var(--pg-dur-med) var(--pg-ease-spring) both; }
    @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      .card { background: var(--pg-surface); -webkit-backdrop-filter: blur(24px) saturate(1.3); backdrop-filter: blur(24px) saturate(1.3); } }
    .head { display: flex; gap: var(--pg-s4); align-items: center; margin-bottom: var(--pg-s4); }
    .shield { position: relative; flex: none; width: 48px; height: 48px; display: grid; place-items: center;
      border-radius: var(--pg-r-md); color: var(--pg-danger); background: var(--pg-danger-bg); border: 1px solid var(--pg-danger-line); }
    .shield::after { content: ""; position: absolute; inset: -1px; border-radius: inherit; border: 2px solid var(--pg-danger);
      opacity: 0; animation: pg-ring 2.2s var(--pg-ease-out) infinite; pointer-events: none; }
    h2 { margin: 0; font-size: 18px; line-height: 1.25; font-weight: 750; letter-spacing: -.015em; }
    .sub { margin: var(--pg-s1) 0 0; font-size: 13px; line-height: 1.4; color: var(--pg-muted); }
    .label { margin: 0 0 var(--pg-s2); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--pg-muted); }
    .list { list-style: none; margin: 0 0 var(--pg-s3); padding: 0; display: flex; flex-direction: column; gap: var(--pg-s2); }
    .list.scroll { max-height: 296px; overflow-y: auto; padding: 12px 0; margin-block: -12px var(--pg-s2);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
      mask-image: linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%); }
    .row { display: flex; align-items: center; gap: var(--pg-s3); padding: var(--pg-s3); border-radius: var(--pg-r-md);
      background: var(--pg-surface-2); border: 1px solid var(--pg-border);
      animation: pg-row 220ms var(--pg-ease-out) both; animation-delay: calc(min(var(--i, 0), 5) * 30ms); }
    .chip { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: var(--pg-r-sm);
      color: var(--pg-danger); background: var(--pg-danger-bg); }
    .meta { flex: 1; min-width: 0; }
    .type { font-size: 14px; font-weight: 650; }
    .prev { margin-top: 2px; font-family: var(--pg-mono); font-size: 12px; color: var(--pg-muted); overflow-wrap: anywhere; }
    .pill { flex: none; min-width: 32px; padding: 2px 10px; border-radius: var(--pg-r-pill); text-align: center; font-size: 12px; font-weight: 700;
      font-variant-numeric: tabular-nums; color: var(--pg-danger); background: var(--pg-danger-bg); border: 1px solid var(--pg-danger-line); }
    .ignore { flex: none; padding: 6px 10px; border-radius: var(--pg-r-sm); font-size: 12px; font-weight: 650; color: var(--pg-muted);
      border: 1px solid var(--pg-border); background: transparent; }
    .ignore:hover:not(:disabled) { color: var(--pg-text); border-color: var(--pg-muted); }
    .ignore:disabled { cursor: default; color: var(--pg-ok); border-color: transparent; background: var(--pg-ok-bg); }
    .row.ignored .chip, .row.ignored .pill { color: var(--pg-muted); background: var(--pg-surface-2); border-color: transparent; }
    .row.ignored .meta { opacity: .6; }
    .demo { display: flex; align-items: center; gap: var(--pg-s3); flex-wrap: wrap; margin-bottom: var(--pg-s5); padding: var(--pg-s3) var(--pg-s4);
      border-radius: var(--pg-r-md); border: 1px dashed var(--pg-border); font-family: var(--pg-mono); font-size: 13px; }
    .demo .before { color: var(--pg-muted); }
    .demo .after { color: var(--pg-ok); font-weight: 700; background: var(--pg-ok-bg); padding: 2px 8px; border-radius: var(--pg-r-sm); }
    .demo svg { color: var(--pg-muted); }
    .demo .cap { flex-basis: 100%; margin: 0; font-family: var(--pg-font); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--pg-muted); }
    button { font: inherit; cursor: pointer; border: 0; color: inherit; background: none; -webkit-tap-highlight-color: transparent;
      transition: transform var(--pg-dur-fast) var(--pg-ease-out), background-color var(--pg-dur-fast), border-color var(--pg-dur-fast), color var(--pg-dur-fast); }
    button:focus-visible { outline: 3px solid var(--pg-focus); outline-offset: 2px; }
    button:active { transform: scale(.98); }
    .primary { position: relative; overflow: hidden; width: 100%; display: flex; align-items: center; justify-content: center; gap: var(--pg-s3);
      padding: 14px var(--pg-s4); border-radius: var(--pg-r-md); font-size: 16px; font-weight: 700; color: #fff; background: var(--pg-grad); box-shadow: var(--pg-glow); }
    .primary::before { content: ""; position: absolute; inset: 0; background: #fff; opacity: 0; transition: opacity var(--pg-dur-fast); }
    .primary:hover::before { opacity: .12; }
    .primary > * { position: relative; }
    .more { display: flex; gap: var(--pg-s2); margin-top: var(--pg-s2); }
    .secondary, .ghost { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--pg-s2); padding: 10px var(--pg-s3);
      border-radius: var(--pg-r-md); font-size: 14px; font-weight: 600; }
    .secondary { background: var(--pg-surface-2); border: 1px solid var(--pg-border); }
    .secondary:hover { border-color: var(--pg-muted); }
    .ghost { color: var(--pg-muted); border: 1px solid transparent; }
    .ghost:hover { color: var(--pg-text); background: var(--pg-surface-2); }
    kbd { font: 600 11px/1 var(--pg-mono); padding: 3px 6px; border-radius: 6px; border: 1px solid currentColor; opacity: .85; }
    .primary kbd { border-color: rgba(255,255,255,.55); background: rgba(255,255,255,.16); opacity: 1; }
    @media (max-width: 380px) { .card { padding: var(--pg-s4); } .head { gap: var(--pg-s3); } .more { flex-direction: column; } }
    /* Short windows: keep the buttons on screen by letting the findings list scroll (edge fade) and hiding the example. */
    @media (max-height: 760px) {
      .list { max-height: 30vh; overflow-y: auto; padding: 12px 0; margin-block: -12px var(--pg-s2);
        -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
        mask-image: linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%); }
    }
    @media (max-height: 620px) { .demo { display: none; } .card { padding: var(--pg-s4); } .head { margin-bottom: var(--pg-s3); } }
    @keyframes pg-fade { from { opacity: .35; } to { opacity: 1; } }
    @keyframes pg-out { to { opacity: 0; } }
    @keyframes pg-pop { from { opacity: .5; transform: scale(.96) translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes pg-row { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes pg-ring { 0% { opacity: .55; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }
    @media (prefers-reduced-motion: reduce) {
      .card { animation: pg-fade 120ms linear both; }
      .row { animation: none; }
      .shield::after { animation: none; }
      button, .primary::before { transition: none; }
      button:active { transform: none; }
    }
  `;

  function el(tag, props, children) {
    const n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k]; else n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  // Constructable stylesheets are not blocked by a page's style CSP; fall back to a <style> tag.
  function applyStyles(shadow) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      shadow.adoptedStyleSheets = [sheet];
    } catch (e) {
      const st = document.createElement('style');
      st.textContent = CSS;
      shadow.appendChild(st);
    }
  }

  /**
   * show({ rows, total, onIgnore, onChoice, onClose })
   *   rows:   [{ id, type, label, count, preview }]   one per unique value (previews only, never full values)
   *   total:  number of findings in the paste
   *   onIgnore(rowId): called when the user presses Ignore on a row
   *   onChoice(choice, ignoredIds): 'mask' | 'anyway' | 'cancel', plus the ids ignored during this dialog
   *   onClose(): called as soon as the dialog closes, before onChoice
   */
  function show(opts) {
    const host = document.createElement('div');
    const state = { cleanup: null };
    try { build(opts, host, state); }
    catch (e) {
      // never leave a half-built dialog or a global key listener behind
      if (state.cleanup) state.cleanup();
      host.remove();
      throw e;
    }
  }

  function build(opts, host, state) {
    const rows = opts.rows;
    const ignored = new Set();
    host.setAttribute('data-paste-guard', '');
    try { host.setAttribute('data-pg-version', root.chrome.runtime.getManifest().version); } catch (e) { /* not in an extension context */ }
    host.setAttribute('data-pg-design', '2'); // visible in DevTools: confirms the glass design build is loaded
    const shadow = host.attachShadow({ mode: 'open' });
    applyStyles(shadow);

    const ignoreBtns = [];
    const items = rows.map(function (r, i) {
      const chip = el('span', { class: 'chip' }, [T.svg(T.TYPE_ICON[r.type] || 'tag', 20)]);
      const ig = el('button', { class: 'ignore', type: 'button', 'data-ignore': r.id, 'aria-label': 'Ignore ' + r.label + ' from now on', title: 'Never flag this value again', text: 'Ignore' });
      ignoreBtns.push(ig);
      const li = el('li', { class: 'row' }, [
        chip,
        el('div', { class: 'meta' }, [
          el('div', { class: 'type', text: r.label }),
          el('div', { class: 'prev', text: r.preview }),
        ]),
        el('span', { class: 'pill', text: '×' + r.count }),
        ig,
      ]);
      li.style.setProperty('--i', String(i));
      ig.addEventListener('click', function (e) {
        e.stopPropagation();
        if (ignored.has(r.id)) return;
        ignored.add(r.id);
        ig.textContent = 'Ignored'; ig.disabled = true;
        li.classList.add('ignored');
        if (opts.onIgnore) opts.onIgnore(r.id);
        renderDemo();
        // keep focus inside the dialog now that this button is disabled
        bMask.focus();
      });
      return li;
    });
    const list = el('ul', { class: 'list' + (rows.length > 5 ? ' scroll' : ''), 'aria-label': 'Detected items' }, items);

    // before -> after for the first item that will still be masked (preview only, never the full value)
    const demoBefore = el('span', { class: 'before' });
    const demoAfter = el('span', { class: 'after' });
    const demo = el('div', { class: 'demo', 'aria-label': 'Masking example' }, [
      el('p', { class: 'cap', text: 'What masking does' }), demoBefore, T.svg('arrow', 16), demoAfter,
    ]);
    function renderDemo() {
      const r = rows.filter(function (x) { return !ignored.has(x.id); })[0];
      demoBefore.textContent = r ? r.preview : '';
      demoAfter.textContent = r ? '[' + r.label + ']' : 'nothing to mask';
    }

    const bMask = el('button', { class: 'primary', type: 'button', 'data-action': 'mask' }, [
      el('span', { text: 'Paste masked' }), el('kbd', { text: 'Enter' }),
    ]);
    const bAny = el('button', { class: 'secondary', type: 'button', 'data-action': 'anyway', text: 'Paste anyway' });
    const bCancel = el('button', { class: 'ghost', type: 'button', 'data-action': 'cancel' }, [
      el('span', { text: 'Cancel' }), el('kbd', { text: 'Esc' }),
    ]);

    const total = opts.total;
    const card = el('div', { class: 'card', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'pg-t', 'aria-describedby': 'pg-d' }, [
      el('div', { class: 'head' }, [
        el('span', { class: 'shield' }, [T.svg('shield', 26)]),
        el('div', {}, [
          el('h2', { id: 'pg-t', text: 'Sensitive data in your paste' }),
          el('p', { class: 'sub', id: 'pg-d', text: total + (total === 1 ? ' item was' : ' items were') + ' found. Nothing leaves your device.' }),
        ]),
      ]),
      el('p', { class: 'label', text: 'Found' }),
      list,
      demo,
      bMask,
      el('div', { class: 'more' }, [bAny, bCancel]),
    ]);
    const backdrop = el('div', { class: 'backdrop' }, [card]);
    shadow.appendChild(backdrop);
    renderDemo();

    let done = false;
    function finish(choice) {
      if (done) return; done = true;
      document.removeEventListener('keydown', onKey, true);
      // Act immediately; the dialog only fades out visually.
      host.setAttribute('data-closing', '');
      backdrop.classList.add('out');
      setTimeout(function () { host.remove(); }, 100);
      if (opts.onClose) opts.onClose();
      opts.onChoice(choice, new Set(ignored));
    }
    function focusables() {
      return ignoreBtns.filter(function (b) { return !b.disabled; }).concat([bMask, bAny, bCancel]);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish('cancel'); }
      else if (e.key === 'Enter') {
        e.preventDefault(); e.stopImmediatePropagation();
        const a = shadow.activeElement;
        if (a && a.hasAttribute('data-ignore')) { a.click(); return; }
        finish(a && a.getAttribute('data-action') ? a.getAttribute('data-action') : 'mask');
      } else if (e.key === 'Tab') {
        e.preventDefault(); e.stopImmediatePropagation();
        const btns = focusables();
        let i = btns.indexOf(shadow.activeElement);
        i = (i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length;
        btns[i].focus();
      } else {
        e.stopImmediatePropagation();
      }
    }
    // capture on document so the site's editor never sees keys meant for the dialog
    state.cleanup = function () { document.removeEventListener('keydown', onKey, true); };
    document.addEventListener('keydown', onKey, true);
    [bMask, bAny, bCancel].forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); finish(b.getAttribute('data-action')); });
    });
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) finish('cancel'); });
    (opts.container || document.documentElement || document).appendChild(host);
    bMask.focus();
  }

  root.PasteGuardDialog = { show: show };
})(typeof globalThis !== 'undefined' ? globalThis : this);
