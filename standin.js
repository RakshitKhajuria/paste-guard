/* Paste Guard stand-in chat page, shared by the interactive tour (real time) and the tutorial video (stepped time).
 * It is a simulation on a generic page: it runs the REAL detectors, the REAL dialog and the REAL placeholder-list code
 * (copied from src/ at build time) in this page's memory. No storage, no network, no brand UI of any AI product.
 * Timers go through opts.after so the video renderer can drive time frame by frame. */
(function (root) {
  'use strict';

  const SAMPLE = [
    'Hi team, notes for the Zorbex launch:',
    'Email: jane.doe@example.com',
    'Card: 4111 1111 1111 1111',
    'UPI: rahul@okaxis',
    'AWS key: AKIAIOSFODNN7EXAMPLE',
  ].join('\n');
  const WORD_SENTENCE = 'Our client Zorbex signs on Friday';
  const SETTINGS_IDS = ['email', 'card', 'apiKey', 'phone', 'aadhaar', 'upi'];

  function create(host, o) {
    const D = o.D, DLG = o.DLG, RS = o.RS, T = o.T;
    const after = o.after || function (fn, ms) { return setTimeout(fn, ms); };
    const emit = o.onEvent || function () {};
    const mac = o.platform ? o.platform === 'mac' : T.isMac();
    const ALT = mac ? 'Option' : 'Alt';
    const keys = function (s) { return String(s).replace(/\bAlt\b/g, ALT); };
    const now = o.now || function () { return Date.now(); };

    const settings = { enabled: true, mode: 'ask', restore: true, detectors: Object.assign({}, D.defaultSettings().detectors) };
    const rstate = RS.empty();
    const ignored = new Set();
    let dictionary = [];
    let view = 'original', lastSent = '', dismissed = false, dialogOpen = false, sel = null, streaming = false;
    const bubbles = [];

    function el(tag, cls, text, attrs) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      return n;
    }

    // ---------- markup ----------
    host.textContent = '';
    host.classList.add('sw');
    const tokens = el('style'); tokens.textContent = T.tokensCss('.sw'); host.appendChild(tokens);

    const bar = el('div', 'sw-bar');
    const dots = el('div', 'sw-dots'); dots.setAttribute('aria-hidden', 'true'); for (let i = 0; i < 3; i++) dots.appendChild(el('i'));
    const addr = el('div', 'sw-addr', 'Stand-in chat page (a simulation)');
    const extBtn = el('button', 'sw-ext', null, { type: 'button', 'aria-label': 'Paste Guard settings', 'aria-expanded': 'false', 'aria-controls': 'swPopup', title: 'Paste Guard settings' });
    extBtn.appendChild(T.svg('shieldCheck', 20));
    bar.append(dots, addr, extBtn);

    const body = el('div', 'sw-body');
    const head = el('div', 'sw-head'); head.append(el('strong', null, 'New conversation'), el('span', 'sw-sub', 'Generic assistant'));
    const chat = el('div', 'sw-chat'); chat.setAttribute('aria-live', 'polite'); chat.setAttribute('aria-label', 'Conversation');
    const empty = el('p', 'sw-empty', 'No messages yet.'); chat.appendChild(empty);

    const pill = el('div', 'sw-pill'); pill.hidden = true; pill.setAttribute('role', 'group'); pill.setAttribute('aria-label', 'Restore');
    const pillDot = el('span', 'sw-dot'); pillDot.setAttribute('aria-hidden', 'true');
    const pillText = el('span', 'sw-pilltxt');
    const pillToggle = el('button', 'sw-pillbtn', null, { type: 'button' });
    const pillLabel = document.createTextNode('Show placeholders ');
    const pillKbd = el('kbd', null, keys('Alt+R')); pillToggle.append(pillLabel, pillKbd);
    pillToggle.title = 'Switch between original values and placeholders (' + keys('Alt+R') + ')';
    const pillX = el('button', 'sw-pillx', '×', { type: 'button', 'aria-label': 'Dismiss' });
    pill.append(pillDot, pillText, pillToggle, pillX);

    const comp = el('div', 'sw-comp');
    const chipBar = el('div', 'sw-chipbar'); chipBar.hidden = true;
    const chip = el('button', 'sw-chip', null, { type: 'button' });
    chip.appendChild(T.svg('shieldCheck', 16));
    const chipText = document.createTextNode('Mask this');
    chip.append(chipText, el('kbd', null, keys('Alt+Shift+M')));
    chipBar.append(chip);
    const label = el('label', 'sw-vh', 'Message', { for: 'swInput' });
    const input = el('textarea', 'sw-input', null, { id: 'swInput', rows: '4', spellcheck: 'false', autocomplete: 'off', placeholder: 'Message the assistant' });
    const row = el('div', 'sw-row');
    const pasteBtn = el('button', 'sw-btn', 'Paste made-up text', { type: 'button' });
    const sendBtn = el('button', 'sw-btn sw-primary', 'Send', { type: 'button' });
    const hint = el('span', 'sw-hint', keys('Cmd+V / Ctrl+V works too. Your own clipboard is never read.').replace('Cmd+V / Ctrl+V', mac ? 'Cmd+V' : 'Ctrl+V'));
    row.append(pasteBtn, sendBtn, hint);
    comp.append(chipBar, label, input, row);

    const status = el('p', 'sw-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    body.append(head, chat, pill, comp, status);

    // ---------- mini popup (the real design tokens, a subset of the real controls) ----------
    const popup = el('div', 'sw-popup', null, { id: 'swPopup', role: 'region', 'aria-label': 'Paste Guard settings' }); popup.hidden = true;
    const ph = el('div', 'sw-ph');
    const shield = el('div', 'sw-shield'); shield.appendChild(T.svg('shieldCheck', 22));
    const phText = el('div', 'sw-phtext'); phText.append(el('strong', null, 'Paste Guard'));
    const phStatus = el('span', 'sw-phstat', 'Protection on'); phText.appendChild(phStatus);
    const master = toggle('Enable Paste Guard', true, function (v) { settings.enabled = v; phStatus.textContent = v ? 'Protection on' : 'Protection off'; phStatus.classList.toggle('off', !v); changed('enabled', v); });
    ph.append(shield, phText, master.wrap);
    const modeLabel = el('p', 'sw-cap', 'When something is found');
    const seg = el('div', 'sw-seg', null, { role: 'radiogroup', 'aria-label': 'When something is found' });
    const segBtns = {};
    [['ask', 'Ask'], ['auto', 'Auto-mask'], ['off', 'Off']].forEach(function (m) {
      const b = el('button', null, m[1], { type: 'button', role: 'radio', 'aria-checked': m[0] === 'ask' ? 'true' : 'false', 'data-mode': m[0] });
      b.addEventListener('click', function () { setMode(m[0]); }); segBtns[m[0]] = b; seg.appendChild(b);
    });
    const detLabel = el('p', 'sw-cap', 'Detect');
    const dets = el('div', 'sw-dets');
    const detToggles = {};
    D.DETECTORS.filter(function (d) { return SETTINGS_IDS.indexOf(d.id) >= 0; }).forEach(function (d) {
      const r = el('label', 'sw-det'); r.appendChild(el('span', null, d.label));
      const t = toggle(d.label, !!settings.detectors[d.id], function (v) { settings.detectors[d.id] = v; changed('detector:' + d.id, v); }, true);
      detToggles[d.id] = t; r.appendChild(t.wrap); dets.appendChild(r);
    });
    const rr = el('label', 'sw-det sw-restore'); rr.appendChild(el('span', null, 'Restore original values in replies'));
    const restoreT = toggle('Restore original values in replies', true, function (v) { settings.restore = v; if (!v) view = 'original'; refresh(); changed('restore', v); }, true);
    rr.appendChild(restoreT.wrap);
    popup.append(ph, modeLabel, seg, detLabel, dets, rr);
    host.append(bar, body, popup);

    function toggle(name, on, cb, small) {
      const wrap = el('span', small ? 'sw-tgl' : 'sw-switch');
      const inp = el('input', null, null, { type: 'checkbox', 'aria-label': name }); inp.checked = on;
      const track = el('span', 'sw-track'); track.appendChild(el('span', 'sw-thumb'));
      inp.addEventListener('change', function () { cb(inp.checked); });
      wrap.append(inp, track);
      return { wrap: wrap, input: inp };
    }
    function changed(what, v) { say('Setting changed.'); emit('settings', { what: what, value: v }); }
    function say(t) { status.textContent = t; }

    // ---------- settings ----------
    function openSettings(open) {
      const v = open == null ? popup.hidden : open;
      popup.hidden = !v; extBtn.setAttribute('aria-expanded', String(v));
      host.classList.toggle('sw-popup-open', v);
      emit(v ? 'settings-open' : 'settings-close');
    }
    extBtn.addEventListener('click', function () { openSettings(); });
    function setMode(m) {
      settings.mode = m;
      Object.keys(segBtns).forEach(function (k) { segBtns[k].setAttribute('aria-checked', String(k === m)); });
      seg.setAttribute('data-mode', m);
      changed('mode', m);
    }
    function setDetector(id, v) { if (detToggles[id]) detToggles[id].input.checked = v; settings.detectors[id] = v; changed('detector:' + id, v); }
    function setRestore(v) { restoreT.input.checked = v; settings.restore = v; if (!v) view = 'original'; refresh(); changed('restore', v); }

    // ---------- scanning and masking, as in the extension ----------
    function findAll(text) {
      let f = D.scan(text, settings.detectors) || [];
      if (dictionary.length) f = D.mergeFindings(f, D.scanDictionary(text, dictionary));
      return f;
    }
    function insert(text, s, e) {
      const v = input.value, a = s == null ? input.selectionStart : s, b = e == null ? input.selectionEnd : e;
      input.value = v.slice(0, a) + text + v.slice(b);
      const c = a + text.length; input.setSelectionRange(c, c);
      updateSelection();
    }
    function record(text, findings, skip, labels) {
      if (!labels) return;
      const rows = [];
      D.groupFindings(text, findings).forEach(function (r) { if (skip.has(r.key)) return; const f = r.findings[0]; rows.push({ key: r.key, type: r.type, value: text.slice(f.start, f.end) }); });
      RS.commit(rstate, rows, labels, now());
    }
    // force === 'mask': mask straight away with no dialog (the tour uses this when a visitor skips ahead).
    function paste(text, force) {
      text = text == null ? SAMPLE : text;
      if (dialogOpen) return;
      emit('paste', { text: text, forced: force === 'mask' });
      if (force !== 'mask' && (!settings.enabled || settings.mode === 'off')) { insert(text); say('Protection is off, so the text was pasted as it is.'); refresh(); return; }
      const findings = findAll(text);
      const rows = D.groupFindings(text, findings).filter(function (r) { return force === 'mask' || !ignored.has(r.key); });
      if (!findings.length) { insert(text); say('Nothing sensitive found: pasted as normal, no dialog.'); return; }
      if (!rows.length) { insert(text); say('Everything found was on your Ignore list, so it was pasted as it is.'); return; }
      const labels = settings.restore ? RS.peekLabels(rstate, rows.map(function (r) { return { key: r.key, type: r.type }; })) : null;
      if (labels) rows.forEach(function (r) { r.label = labels[r.key] || r.label; });
      const at = input.selectionStart;
      if (settings.mode === 'auto' || force === 'mask') {
        const none = new Set(); const skipK = force === 'mask' ? none : ignored;
        const m = D.maskText(text, findings, skipK, labels); record(text, findings, skipK, labels);
        insert(m, at, at); say('Auto-mask: pasted the masked text with no dialog.'); refresh(); emit('masked', { auto: true }); return;
      }
      dialogOpen = true;
      DLG.show({
        container: o.dialogContainer || host,
        rows: rows.map(function (r) { return { id: r.key, type: r.type, label: r.label, count: r.count, preview: r.preview }; }),
        total: rows.reduce(function (n, r) { return n + r.count; }, 0),
        onIgnore: function (id) { ignored.add(id); },
        onClose: function () { dialogOpen = false; },
        onChoice: function (choice, ign) {
          const skip = new Set(ignored); ign.forEach(function (k) { skip.add(k); });
          if (choice === 'mask') { const m = D.maskText(text, findings, skip, labels); record(text, findings, skip, labels); insert(m, at, at); say('Pasted masked. This is what the AI will receive.'); refresh(); }
          else if (choice === 'anyway') { insert(text, at, at); say('Pasted as it is. Paste Guard never blocks the final choice.'); }
          else say('Cancelled. Nothing was pasted.');
          input.focus(); emit('choice', { choice: choice, ignored: ign.size });
        },
      });
      emit('dialog-open');
    }

    // ---------- Mask this and the dictionary ----------
    function updateSelection() {
      const s = input.selectionStart, e = input.selectionEnd, raw = input.value.slice(s, e), w = raw.trim();
      const ok = e > s && w && w.length <= 100 && w.indexOf('\n') < 0 && !/^\[[A-Za-z][A-Za-z_]*_\d{1,6}\]$/.test(w) && (document.activeElement === input || o.forceSelection);
      sel = ok ? { s: s + raw.indexOf(w), e: s + raw.indexOf(w) + w.length, word: w } : null;
      chipBar.hidden = !sel;
      if (sel) chipText.textContent = 'Mask “' + (w.length > 18 ? w.slice(0, 18) + '…' : w) + '” ';
      emit('selection', { word: sel && sel.word });
    }
    ['select', 'keyup', 'mouseup', 'focus', 'blur'].forEach(function (ev) { input.addEventListener(ev, function () { setTimeout(updateSelection, 0); }); });
    document.addEventListener('selectionchange', function () { if (document.activeElement === input) updateSelection(); });
    chip.addEventListener('mousedown', function (e) { e.preventDefault(); });
    function maskSelection() {
      if (!sel) return false;
      const w = sel.word, key = D.keyOf('CUSTOM', w);
      let lab;
      if (settings.restore) { const labels = RS.peekLabels(rstate, [{ key: key, type: 'CUSTOM' }]); lab = labels[key]; RS.commit(rstate, [{ key: key, type: 'CUSTOM', value: w }], labels, now()); }
      else lab = 'CUSTOM_1';
      insert('[' + lab + ']', sel.s, sel.e);
      const have = dictionary.some(function (x) { return x.toLowerCase() === w.toLowerCase(); });
      let msg;
      if (have) msg = 'Masked. Already in your dictionary.';
      else if (dictionary.length >= D.DICTIONARY_LIMIT) msg = 'Masked. Your dictionary is full (' + D.DICTIONARY_LIMIT + ' words). Pro unlocks unlimited words.';
      else { dictionary.push(w); msg = 'Masked and added to your dictionary, so it is masked in every later paste.'; }
      say(msg); refresh(); input.focus(); emit('word-masked', { label: lab });
      return true;
    }
    chip.addEventListener('click', maskSelection);
    function selectWord(word) {
      const i = input.value.indexOf(word); if (i < 0) return false;
      input.focus(); input.setSelectionRange(i, i + word.length); updateSelection(); return true;
    }

    // ---------- the chat ----------
    function paint(node, text) {
      node.textContent = '';
      if (!settings.restore || view !== 'original') { node.appendChild(document.createTextNode(text)); return 0; }
      let pos = 0, n = 0;
      RS.findTokens(text, rstate, now()).forEach(function (t) {
        node.appendChild(document.createTextNode(text.slice(pos, t.start)));
        node.appendChild(el('span', 'sw-val', t.value)); pos = t.end; n++;
      });
      node.appendChild(document.createTextNode(text.slice(pos)));
      return n;
    }
    function bubble(who, text) {
      const b = el('div', 'sw-msg ' + who); b.appendChild(el('span', 'sw-who', who === 'user' ? 'You' : 'Assistant'));
      const body2 = el('div', 'sw-text'); b.appendChild(body2); chat.appendChild(b);
      const rec = { body: body2, text: text }; bubbles.push(rec); empty.hidden = true; paint(body2, text); chat.scrollTop = chat.scrollHeight;
      return rec;
    }
    function refresh() {
      let total = 0;
      bubbles.forEach(function (b) { total += paint(b.body, b.text); });
      const has = RS.count(rstate) > 0;
      pill.hidden = !(settings.restore && has && !dismissed && (total > 0 || view === 'placeholders'));
      pillText.textContent = view === 'placeholders' ? 'Showing placeholders' : 'Restored ' + total + (total === 1 ? ' value' : ' values');
      pillLabel.textContent = view === 'placeholders' ? 'Show originals ' : 'Show placeholders ';
      pill.classList.toggle('ph', view === 'placeholders');
    }
    function toggleView() {
      if (!settings.restore || !RS.count(rstate)) return false;
      view = view === 'original' ? 'placeholders' : 'original'; refresh(); emit('view', { view: view }); return true;
    }
    pillToggle.addEventListener('click', toggleView);
    pillX.addEventListener('click', function () { dismissed = true; refresh(); });

    function tokensIn(t) { const out = []; (t.match(/\[[A-Za-z][A-Za-z_]*_\d{1,6}\]/g) || []).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); return out; }
    function send() {
      const text = input.value;
      if (!text.trim()) { say('Write or paste something first.'); return false; }
      lastSent = text; bubble('user', text); input.value = ''; updateSelection(); refresh();
      say(findAll(text).length ? 'Sent. This text still holds values Paste Guard would flag (you chose Paste anyway).' : 'Sent. The assistant received only placeholders.');
      emit('sent', { text: text });
      reply();
      return true;
    }
    // A made-up reply that uses the placeholders it received, streamed two characters at a time so placeholders are
    // often cut in half on screen and turn into the value once whole.
    function reply() {
      const t = tokensIn(lastSent), parts = ['Thanks, I have it.'];
      if (t[0]) parts.push('I will write to ' + t[0] + ' first');
      if (t[1]) parts.push('and note ' + t[1] + ' in the summary');
      if (t[2]) parts.push('and keep ' + t[2] + ' out of the thread');
      const full = parts.join(' ') + (t.length ? '.' : ' Nothing in your message needed hiding.');
      const rec = bubble('ai', ''); let i = 0; streaming = true;
      (function step() {
        if (i >= full.length) { streaming = false; refresh(); emit('reply-done'); return; }
        i += 2; rec.text = full.slice(0, i); refresh(); chat.scrollTop = chat.scrollHeight; after(step, o.streamMs || 50);
      })();
    }
    function forget() { RS.forgetItems(rstate); view = 'original'; refresh(); say('Forgotten: the values are gone from memory and replies show placeholders.'); emit('forget'); }

    pasteBtn.addEventListener('click', function () { paste(); });
    sendBtn.addEventListener('click', send);
    // Never read the visitor's clipboard: a real paste or Cmd/Ctrl+V pastes the made-up text instead.
    input.addEventListener('paste', function (e) { e.preventDefault(); paste(); });
    document.addEventListener('keydown', function (e) {
      if (!host.isConnected) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyR') { if (toggleView()) e.preventDefault(); }
      else if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') { if (maskSelection()) e.preventDefault(); }
    }, true);

    function reset() {
      Object.assign(settings, { enabled: true, mode: 'ask', restore: true });
      Object.keys(settings.detectors).forEach(function (k) { settings.detectors[k] = D.defaultSettings().detectors[k]; if (detToggles[k]) detToggles[k].input.checked = settings.detectors[k]; });
      master.input.checked = true; phStatus.textContent = 'Protection on'; phStatus.classList.remove('off'); restoreT.input.checked = true;
      Object.keys(segBtns).forEach(function (k) { segBtns[k].setAttribute('aria-checked', String(k === 'ask')); });
      RS.forgetItems(rstate); rstate.counters = {}; ignored.clear(); dictionary = []; bubbles.length = 0; view = 'original'; dismissed = false; lastSent = '';
      chat.textContent = ''; chat.appendChild(empty); empty.hidden = false; input.value = ''; say(''); openSettings(false); chipBar.hidden = true; refresh();
    }

    refresh();
    return {
      el: host, input: input, chat: chat, pasteBtn: pasteBtn, sendBtn: sendBtn, extBtn: extBtn, popup: popup, pill: pill, pillToggle: pillToggle, chipBar: chipBar, chip: chip,
      seg: seg, segBtns: segBtns, detToggles: detToggles, restoreToggle: restoreT, status: status,
      paste: paste, send: send, toggleView: toggleView, maskSelection: maskSelection, selectWord: selectWord, setMode: setMode, setDetector: setDetector, setRestore: setRestore,
      openSettings: openSettings, forget: forget, reset: reset, say: say,
      fillSentence: function () { input.value = WORD_SENTENCE; input.focus(); updateSelection(); },
      state: function () { return { settings: settings, ignored: ignored, dictionary: dictionary.slice(), view: view, restorable: RS.count(rstate), dialogOpen: dialogOpen, streaming: streaming, sel: sel }; },
      alt: ALT, SAMPLE: SAMPLE, WORD_SENTENCE: WORD_SENTENCE,
    };
  }
  root.PGStandin = { create: create, SAMPLE: SAMPLE, WORD_SENTENCE: WORD_SENTENCE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
