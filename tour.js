/* Paste Guard interactive tour: the coach layer around the stand-in chat page (promo/standin). Static, no network.
 * The visitor does every step; the dialog, detectors and placeholder list are the real modules. */
(function () {
  'use strict';
  const G = globalThis;
  const D = G.PasteGuardDetectors, DLG = G.PasteGuardDialog, RS = G.PasteGuardRestore, T = G.PasteGuardTheme, SW = G.PGStandin;
  const host = document.getElementById('swHost');
  if (!D || !DLG || !RS || !T || !SW || !host) return;
  const reduced = G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (id) { return document.getElementById(id); };
  const root = document.documentElement;

  function el(tag, cls, text, attrs) {
    const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  const app = SW.create(host, { D: D, DLG: DLG, RS: RS, T: T, onEvent: onEvent, dialogContainer: document.body });
  const ALT = app.alt;
  const V = T.isMac() ? 'Cmd+V' : 'Ctrl+V';

  // ---------- steps ----------
  // target: what the spotlight frames. focus: what receives keyboard focus when the step starts.
  const STEPS = [
    { id: 'welcome', name: 'Start', title: 'A guided tour you can click through',
      text: 'You do each step yourself on a stand-in chat page, using the real Paste Guard warning and detectors. It takes about two minutes and uses made-up data only.', primary: 'Start the tour' },
    { id: 'paste', name: 'Paste', title: 'Paste this',
      text: 'Press the button, or ' + V + ' in the message box. It pastes made-up text with an email, a card number, a UPI ID and an API key. Your own clipboard is never read.',
      target: function () { return app.el.querySelector('.sw-comp'); }, point: function () { return app.pasteBtn; }, focus: function () { return app.pasteBtn; }, action: ['Paste made-up text', function () { app.paste(); }] },
    { id: 'choose', name: 'Choose', title: 'Paste Guard speaks up',
      text: 'This is the real warning. Try Ignore on a row, then Paste masked (Enter). Paste anyway and Cancel (Esc) work too, exactly as in the extension.', hideCard: true },
    { id: 'send', name: 'Send', title: 'Send it',
      text: 'Press Send. The assistant receives only the placeholders, such as [EMAIL_1]. It never gets your email, card or key.',
      target: function () { return app.el.querySelector('.sw-comp'); }, point: function () { return app.sendBtn; }, focus: function () { return app.sendBtn; }, action: ['Send', function () { app.send(); }] },
    { id: 'restore', name: 'Restore', title: 'Your values come back',
      text: 'The reply streams in using placeholders, then your screen shows the original values again. Press ' + ALT + '+R or the pill to see what the assistant really saw, and again to switch back.',
      target: function () { return app.el.querySelector('.sw-chat'); }, point: function () { return app.pill.hidden ? app.chat : app.pillToggle; }, focus: function () { return app.pill.hidden ? app.sendBtn : app.pillToggle; }, action: ['Switch view', function () { app.toggleView(); }] },
    { id: 'mask', name: 'Mask a word', title: 'Mask a word of your own',
      text: 'Select the word Zorbex (double-click it, or hold Shift and use the arrow keys), then press Mask this or ' + ALT + '+Shift+M. It becomes [CUSTOM_1] and joins a personal dictionary.',
      target: function () { return app.el.querySelector('.sw-comp'); }, point: function () { return app.input; }, focus: function () { return app.input; }, action: ['Select the word for me', function () { app.selectWord('Zorbex'); }] },
    { id: 'settings', name: 'Settings', title: 'Change a setting',
      text: 'Open the Paste Guard icon in the toolbar. Switch Email off, or change the mode to Auto-mask, then press Paste again and see the difference.',
      target: function () { return app.popup.hidden ? app.extBtn : app.popup; }, point: function () { return app.popup.hidden ? app.extBtn : app.seg; }, focus: function () { return app.extBtn; }, action: ['Paste again', function () { app.paste(); }] },
    { id: 'finish', name: 'Finish', title: 'You have seen it all', finish: true },
  ];
  const NAMES = STEPS.filter(function (s) { return s.id !== 'welcome'; });
  let idx = 0, settingsTouched = false, advancing = false, toggles = 0;

  // ---------- coach layer ----------
  const layer = $('tourLayer');
  const spot = el('div', 'tour-spot'); spot.setAttribute('aria-hidden', 'true');
  const pointer = el('div', 'tour-pointer'); pointer.setAttribute('aria-hidden', 'true'); pointer.appendChild(cursorIcon());
  function cursorIcon() {
    const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '34'); s.setAttribute('height', '34');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'M5 3l14 8-6 2 4 7-3 1.6-4-7-5 4z'); p.setAttribute('fill', 'currentColor'); p.setAttribute('stroke', '#fff'); p.setAttribute('stroke-width', '1.4'); p.setAttribute('stroke-linejoin', 'round');
    s.appendChild(p); return s;
  }
  const card = el('section', 'tour-card', null, { 'aria-label': 'Tour guide' });
  const stepLabel = el('p', 'tour-step'); const title = el('h2', 'tour-title'); const text = el('p', 'tour-text');
  const act = el('div', 'tour-actions');
  const backB = el('button', 'tour-btn', 'Back', { type: 'button' });
  const actB = el('button', 'tour-btn', '', { type: 'button' });
  const nextB = el('button', 'tour-btn primary', 'Next', { type: 'button' });
  const skipB = el('button', 'tour-link', 'Skip tour', { type: 'button' });
  act.append(backB, actB, nextB);
  const msg = el('p', 'tour-note'); msg.setAttribute('role', 'status');
  card.append(stepLabel, title, text, msg, act, skipB);
  card.setAttribute('aria-live', 'polite');
  const prog = el('nav', 'tour-prog', null, { 'aria-label': 'Tour progress' });
  const ol = el('ol'); prog.appendChild(ol);
  NAMES.forEach(function (s) { const li = el('li'); li.appendChild(el('span', 'tour-bar')); li.appendChild(el('span', 'tour-pname', s.name)); ol.appendChild(li); });
  const restartB = el('button', 'tour-link tour-restart', 'Restart', { type: 'button' });
  prog.appendChild(restartB);
  layer.append(prog, card, spot, pointer);

  const finish = $('tourFinish');

  let lastRect = null;
  function rectOf(n) { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
  function place(animate) {
    const s = STEPS[idx];
    const hidden = !s.target || (app.state().dialogOpen);
    layer.classList.toggle('no-spot', hidden);
    if (hidden) { lastRect = null; return; }
    const t = s.target(), r = rectOf(t), pad = 8;
    const x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2;
    spot.style.left = x + 'px'; spot.style.top = y + 'px'; spot.style.width = w + 'px'; spot.style.height = h + 'px';
    if (animate && lastRect && !reduced && spot.animate) {
      spot.animate([{ transform: 'translate(' + (lastRect.x - x) + 'px,' + (lastRect.y - y) + 'px) scale(' + (lastRect.w / w) + ',' + (lastRect.h / h) + ')', transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: 520, easing: 'cubic-bezier(.2,1.2,.4,1)' });
    }
    lastRect = { x: x, y: y, w: w, h: h };
    const pt = s.point ? s.point() : null;
    pointer.hidden = !pt;
    if (pt) { const pr = rectOf(pt); pointer.style.left = (pr.x + pr.w * 0.62) + 'px'; pointer.style.top = (pr.y + pr.h * 0.7) + 'px'; }
    // the card sits on the side with more room (a bottom sheet on a phone, set in CSS)
    if (!G.matchMedia('(max-width: 760px)').matches) {
      const below = G.innerHeight - (r.y + r.h), above = r.y;
      card.classList.toggle('above', below < 250 && above > below);
    }
  }
  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; place(false); }); }
  G.addEventListener('resize', schedule); G.addEventListener('scroll', schedule, { passive: true });

  // Scroll so the target (and, on the restore step, the status pill under the chat) sits clear of the sticky bar and above the guide card.
  function bringIntoView(n, stepId) {
    if (!n) return;
    const r = n.getBoundingClientRect();
    let top = r.top, bottom = r.bottom;
    if (stepId === 'restore' && !app.pill.hidden) { const pr = app.pill.getBoundingClientRect(); top = Math.max(top, pr.top - 260); bottom = pr.bottom; } // the pill matters most; keep some of the reply above it
    const limit = G.matchMedia('(max-width: 760px)').matches ? G.innerHeight * 0.5 : G.innerHeight - 60;
    let delta = 0;
    if (bottom > limit) delta = bottom - limit + 12;            // what the visitor must press or read comes first, even if a tall chat loses its top edge
    else if (top < 120) delta = top - 160;
    if (delta) G.scrollTo({ top: Math.max(0, G.scrollY + delta), behavior: 'instant' }); // an instant jump: a smooth scroll would move the button under a finger that is already tapping it
  }

  // the restored text can add lines a moment after the reply ends, so check the position again a few times
  function settleRestoreView() {
    [160, 600, 1300].forEach(function (ms) { setTimeout(function () { if (STEPS[idx].id === 'restore') { bringIntoView(STEPS[idx].target(), 'restore'); schedule(); } }, ms); });
  }

  function prerequisites(id) {
    const st = app.state();
    if ((id === 'send') && !app.input.value.trim() && !app.chat.querySelector('.sw-msg')) { app.reset(); app.paste(undefined, 'mask'); }
    if (id === 'restore' && !app.chat.querySelector('.sw-msg.ai')) {
      if (!/\[[A-Z_]+_\d+\]/.test(app.input.value)) { app.reset(); app.paste(undefined, 'mask'); }
      if (app.input.value.trim()) app.send();
    }
    if (id === 'mask' && !/Zorbex/.test(app.input.value)) { app.input.value = ''; app.fillSentence(); }
    if (id === 'settings') { settingsTouched = false; if (!app.input.value.trim()) app.input.value = ''; }
    void st;
  }

  function go(n, opts) {
    n = Math.max(0, Math.min(STEPS.length - 1, n));
    if (n !== idx) toggles = 0;
    advancing = false;
    idx = n;
    const s = STEPS[idx];
    if (!(opts && opts.noPrereq)) prerequisites(s.id);
    msg.textContent = '';
    root.setAttribute('data-tour-step', s.id);
    layer.classList.toggle('is-finish', !!s.finish);
    finish.hidden = !s.finish;
    // progress
    [].forEach.call(ol.children, function (li, i) {
      const k = i + 1; li.classList.toggle('done', k < idx); li.classList.toggle('now', k === idx);
      if (k === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    prog.classList.toggle('on', idx > 0);
    stepLabel.textContent = idx === 0 ? 'Interactive tour' : s.finish ? 'Done' : 'Step ' + idx + ' of ' + (NAMES.length - 1) + ' · ' + s.name;
    title.textContent = s.title;
    text.textContent = s.finish ? '' : s.text;
    backB.hidden = idx === 0; skipB.hidden = idx === 0 || !!s.finish; restartB.hidden = idx === 0;
    actB.hidden = !s.action; if (s.action) actB.textContent = s.action[0];
    nextB.textContent = idx === 0 ? s.primary : idx === STEPS.length - 2 ? 'Finish' : 'Next';
    nextB.hidden = !!s.finish;
    card.classList.toggle('hide', !!s.hideCard || !!s.finish);
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
    // staggered reveal of the card's children
    [].forEach.call(card.children, function (c, i) { c.style.setProperty('--i', i); });
    if (s.target) bringIntoView(s.target(), s.id);
    if (s.id === 'restore') settleRestoreView();
    place(true);
    const f = s.focus && s.focus();
    const a = document.activeElement;
    if (f && (!a || a === document.body || card.contains(a))) f.focus({ preventScroll: true });
    else if (idx === 0) nextB.focus({ preventScroll: true });
    if (s.finish) { const b = finish.querySelector('a, button'); if (b) b.focus({ preventScroll: true }); }
    emitTour();
  }
  function emitTour() { root.setAttribute('data-tour-idx', String(idx)); }

  function advanceFrom(id, delay) {
    if (STEPS[idx].id !== id || advancing) return;
    advancing = true;
    setTimeout(function () { if (STEPS[idx].id === id) go(idx + 1); advancing = false; }, reduced ? 0 : delay);
  }

  function onEvent(name, d) {
    const id = STEPS[idx].id;
    if (name === 'dialog-open') { layer.classList.add('no-spot'); if (id === 'paste') go(2, { noPrereq: true }); }
    if (name === 'choice') {
      if (d.choice === 'cancel' && id === 'choose') { go(1, { noPrereq: true }); msg.textContent = 'Cancelled. Nothing was pasted. Press Paste to try again.'; }
      else if (d.choice === 'cancel') place(false);
      else if (id === 'choose') advanceFrom('choose', 450);
      else if (id === 'settings' && settingsTouched) advanceFrom('settings', 1000);
      else place(false);
    }
    if (name === 'masked' && id === 'paste') advanceFrom('paste', 450);   // auto-mask mode: no dialog
    if (name === 'masked' && id === 'settings' && settingsTouched) advanceFrom('settings', 1400);
    if (name === 'paste' && id === 'paste' && !app.state().dialogOpen) setTimeout(function () { if (STEPS[idx].id === 'paste' && !app.state().dialogOpen && /\S/.test(app.input.value)) advanceFrom('paste', 600); }, 60);
    if (name === 'sent' && id === 'send') advanceFrom('send', 500);
    if (name === 'view' && id === 'restore') {
      toggles++;
      msg.textContent = d.view === 'placeholders' ? 'This is what the assistant actually received. Switch back to continue.' : 'And this is what you see.';
      if (toggles >= 2 && d.view === 'original') advanceFrom('restore', 700);
    }
    if (name === 'word-masked' && id === 'mask') { msg.textContent = 'Masked, and saved to your dictionary.'; advanceFrom('mask', 700); }
    if (name === 'settings') settingsTouched = true;
    if (name === 'settings-open' || name === 'settings-close' || name === 'settings') setTimeout(function () { place(true); }, 30);
    if (name === 'paste' && id === 'settings' && settingsTouched) {
      msg.textContent = 'See the difference? The same text now behaves differently.';
      setTimeout(function () { if (STEPS[idx].id === 'settings' && !app.state().dialogOpen && !advancing) advanceFrom('settings', 1400); }, 80);
    }
    if (name === 'reply-done' && id === 'restore' && !app.state().restorable) msg.textContent = 'You pasted without masking, so the assistant received the real values and there is nothing to restore. Restart the tour and choose Paste masked to see Restore.';
    if (name === 'reply-done' && id === 'restore') settleRestoreView();
    if (name === 'reply-done' || name === 'selection') schedule();
  }

  nextB.addEventListener('click', function () { go(idx + 1); });
  backB.addEventListener('click', function () { go(idx - 1, { noPrereq: true }); });
  skipB.addEventListener('click', function () { go(STEPS.length - 1, { noPrereq: true }); });
  actB.addEventListener('click', function () { const s = STEPS[idx]; if (s.action) s.action[1](); });
  restartB.addEventListener('click', restart);
  const fr = $('tourRestart'); if (fr) fr.addEventListener('click', restart);
  function restart() { app.reset(); settingsTouched = false; G.scrollTo({ top: 0, behavior: 'auto' }); go(0, { noPrereq: true }); }

  // Escape closes the settings panel when it is open and no dialog is showing
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !app.popup.hidden && !app.state().dialogOpen) { app.openSettings(false); app.extBtn.focus(); } });

  go(0, { noPrereq: true });
  root.setAttribute('data-tour-ready', '1');
  G.PGTour = { app: app, go: go, steps: STEPS };
})();
