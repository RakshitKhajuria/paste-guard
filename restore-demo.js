/* Paste Guard "Try Restore and Mask this" page. A local simulation of the extension's flow, using the real detectors and the
 * real restore-store module (both copied from src/ at build time). Everything lives in this page's memory: no storage, no
 * requests, nothing is sent anywhere. Reload the page and it is all gone. */
(function () {
  'use strict';
  const D = globalThis.PasteGuardDetectors, RS = globalThis.PasteGuardRestore;
  const $ = function (id) { return document.getElementById(id); };
  if (!D || !RS || !$('rdInput')) return;

  const input = $('rdInput'), chat = $('rdChat'), emptyNote = $('rdEmpty');
  const EXAMPLE = 'Please email jane.doe@example.com about the Zorbex launch and pay rahul@okaxis. AWS key AKIAIOSFODNN7EXAMPLE';
  const MAX_CUSTOM = 100;

  const state = RS.empty();           // placeholder -> original value, like the extension's memory-only list
  let dictionary = [];                // personal dictionary (up to D.DICTIONARY_LIMIT words)
  let restoreOn = true, view = 'original', lastSent = '', pending = null, sel = null, dismissed = false;
  const bubbles = [];                 // {node, text, who}

  function isMac() { return /mac|iphone|ipad/i.test(String(navigator.platform || '') + ' ' + String(navigator.userAgent || '')); }
  const ALT = isMac() ? 'Option' : 'Alt';
  document.querySelectorAll('[data-keys]').forEach(function (n) { n.textContent = n.textContent.replace(/\bAlt\b/g, ALT); });

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function say(id, text) { $(id).textContent = text; }
  const now = function () { return Date.now(); };

  // ---------- scanning (built-in detectors plus the personal dictionary, as in the extension) ----------
  function findAll(text) {
    let f = D.scan(text, undefined) || [];
    if (dictionary.length) f = D.mergeFindings(f, D.scanDictionary(text, dictionary));
    return f;
  }
  function placeholderish(s) { return /^\[[A-Za-z][A-Za-z_]*_\d{1,6}\]$/.test(s.trim()); }

  // ---------- the checkpoint (what the extension's dialog does) ----------
  function showCheckpoint(text, findings) {
    const rows = D.groupFindings(text, findings);
    const labels = restoreOn ? RS.peekLabels(state, rows.map(function (r) { return { key: r.key, type: r.type }; })) : null;
    pending = { text: text, findings: findings, rows: rows, labels: labels, at: input.selectionStart };
    const list = $('rdFound'); list.textContent = '';
    rows.forEach(function (r) {
      const li = el('li');
      li.appendChild(el('span', 'prev', r.preview));
      li.appendChild(el('span', 'rd-arrow', '→'));
      li.appendChild(el('span', 'tag', '[' + (labels ? labels[r.key] : r.label) + ']'));
      if (labels && state.items[labels[r.key]]) li.appendChild(el('span', 'rd-same', 'same value, same number'));
      if (r.count > 1) li.appendChild(el('span', 'times', '×' + r.count));
      list.appendChild(li);
    });
    $('rdCheck').hidden = false;
    $('rdCheck').classList.remove('rd-in'); void $('rdCheck').offsetWidth; $('rdCheck').classList.add('rd-in');
    $('rdMaskPaste').focus();
  }
  function closeCheckpoint() { pending = null; $('rdCheck').hidden = true; }
  function insertAtCaret(text, start, end) {
    const v = input.value;
    const s = start == null ? input.selectionStart : start, e = end == null ? input.selectionEnd : end;
    input.value = v.slice(0, s) + text + v.slice(e);
    const c = s + text.length; input.setSelectionRange(c, c);
    updateSelection();
  }
  function commitMask(text, findings, labels) {
    if (!labels) return;
    const rows = [];
    D.groupFindings(text, findings).forEach(function (r) { const f = r.findings[0]; rows.push({ key: r.key, type: r.type, value: text.slice(f.start, f.end) }); });
    RS.commit(state, rows, labels, now());
  }
  $('rdMaskPaste').addEventListener('click', function () {
    if (!pending) return;
    const p = pending, masked = D.maskText(p.text, p.findings, new Set(), p.labels);
    commitMask(p.text, p.findings, p.labels);
    closeCheckpoint(); insertAtCaret(masked, p.at, p.at); input.focus(); refreshAll();
    say('rdStatus', restoreOn ? 'Pasted masked. The list that remembers each original value now has ' + RS.count(state) + ' entr' + (RS.count(state) === 1 ? 'y' : 'ies') + ', in this page’s memory only.' : 'Pasted masked. Restore is off, so nothing was remembered.');
  });
  $('rdAnyway').addEventListener('click', function () { if (!pending) return; const p = pending; closeCheckpoint(); insertAtCaret(p.text, p.at, p.at); input.focus(); say('rdStatus', 'Pasted as is. The AI would receive the original text.'); });
  $('rdCancel').addEventListener('click', function () { closeCheckpoint(); input.focus(); say('rdStatus', 'Cancelled. Nothing was pasted.'); });
  $('rdCheck').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); $('rdCancel').click(); }
    else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); $('rdMaskPaste').click(); }
  });

  function handlePaste(text) {
    if (!text) return false;
    const findings = findAll(text);
    if (!findings.length) return false;
    showCheckpoint(text, findings);
    return true;
  }
  input.addEventListener('paste', function (e) {
    const text = e.clipboardData && e.clipboardData.getData('text/plain');
    if (handlePaste(text)) e.preventDefault();
  });
  $('rdExample').addEventListener('click', function () {
    input.focus();
    if (!handlePaste(EXAMPLE)) insertAtCaret(EXAMPLE);
  });
  $('rdClearInput').addEventListener('click', function () { input.value = ''; closeCheckpoint(); updateSelection(); input.focus(); });

  // ---------- Mask this + personal dictionary ----------
  function updateSelection() {
    const s = input.selectionStart, e = input.selectionEnd, raw = input.value.slice(s, e), word = raw.trim();
    const ok = e > s && word && word.length <= MAX_CUSTOM && !/\n/.test(word) && !placeholderish(word) && document.activeElement === input;
    sel = ok ? { s: s + raw.indexOf(word), e: s + raw.indexOf(word) + word.length, word: word } : null;
    $('rdSelBar').hidden = !sel;
    if (sel) $('rdMaskThis').firstChild.textContent = 'Mask this: “' + (word.length > 24 ? word.slice(0, 24) + '…' : word) + '” ';
  }
  ['select', 'keyup', 'mouseup', 'focus', 'blur'].forEach(function (ev) { input.addEventListener(ev, function () { setTimeout(updateSelection, 0); }); });
  document.addEventListener('selectionchange', function () { if (document.activeElement === input) updateSelection(); });
  $('rdMaskThis').addEventListener('mousedown', function (e) { e.preventDefault(); });
  function maskSelection() {
    if (!sel) return false;
    const word = sel.word, key = D.keyOf('CUSTOM', word);
    let label;
    if (restoreOn) {
      const labels = RS.peekLabels(state, [{ key: key, type: 'CUSTOM' }]);
      label = labels[key];
      RS.commit(state, [{ key: key, type: 'CUSTOM', value: word }], labels, now());
    } else label = 'CUSTOM_1';
    insertAtCaret('[' + label + ']', sel.s, sel.e);
    const have = dictionary.some(function (w) { return w.toLowerCase() === word.toLowerCase(); });
    let msg;
    if (have) msg = 'Masked. Already in your dictionary.';
    else if (dictionary.length >= D.DICTIONARY_LIMIT) msg = 'Masked. Your dictionary is full (' + D.DICTIONARY_LIMIT + ' words). Pro unlocks unlimited words.';
    else { dictionary.push(word); msg = 'Masked and added to your dictionary. It is now masked in every later paste.'; }
    say('rdStatus', msg); renderDictionary(); refreshAll(); input.focus();
    return true;
  }
  $('rdMaskThis').addEventListener('click', maskSelection);
  function renderDictionary() {
    const ul = $('rdDict'); ul.textContent = '';
    dictionary.forEach(function (w, i) {
      const li = el('li'); li.appendChild(el('span', 'rd-word', w));
      const b = el('button', 'rd-x', '×'); b.type = 'button'; b.setAttribute('aria-label', 'Remove ' + w);
      b.addEventListener('click', function () { dictionary.splice(i, 1); renderDictionary(); });
      li.appendChild(b); ul.appendChild(li);
    });
    $('rdDictCount').textContent = dictionary.length + ' of ' + D.DICTIONARY_LIMIT + ' words';
    $('rdDictEmpty').hidden = dictionary.length > 0;
    $('rdDictClear').disabled = !dictionary.length;
    $('rdDictFull').hidden = dictionary.length < D.DICTIONARY_LIMIT;
  }
  $('rdDictClear').addEventListener('click', function () { dictionary = []; renderDictionary(); });

  // ---------- chat: what the AI receives, replies, Restore ----------
  function tokensIn(text) { const seen = []; (text.match(/\[[A-Za-z][A-Za-z_]*_\d{1,6}\]/g) || []).forEach(function (t) { if (seen.indexOf(t) < 0) seen.push(t); }); return seen; }
  // Replace known placeholders with their original values. Returns the DOM pieces and how many were restored.
  function paint(node, text) {
    node.textContent = '';
    let n = 0;
    if (!restoreOn || view !== 'original') { node.appendChild(document.createTextNode(text)); return 0; }
    let pos = 0;
    RS.findTokens(text, state, now()).forEach(function (t) {
      node.appendChild(document.createTextNode(text.slice(pos, t.start)));
      node.appendChild(el('span', 'rd-val', t.value));
      pos = t.end; n++;
    });
    node.appendChild(document.createTextNode(text.slice(pos)));
    return n;
  }
  function addBubble(who, text) {
    const b = el('div', 'rd-msg ' + who);
    b.appendChild(el('span', 'rd-who', who === 'user' ? 'You' : 'Fake AI'));
    const body = el('div', 'rd-body'); b.appendChild(body);
    chat.appendChild(b); chat.scrollTop = chat.scrollHeight;
    const rec = { body: body, text: text, who: who }; bubbles.push(rec); paint(body, text);
    emptyNote.hidden = true;
    return rec;
  }
  function refreshAll() {
    let total = 0;
    bubbles.forEach(function (b) { total += paint(b.body, b.text); });
    const has = RS.count(state) > 0;
    $('rdPill').hidden = !(restoreOn && has && !dismissed && (total > 0 || view === 'placeholders'));
    $('rdPillText').textContent = view === 'placeholders' ? 'Showing placeholders' : 'Restored ' + total + (total === 1 ? ' value' : ' values');
    $('rdToggle').firstChild.textContent = view === 'placeholders' ? 'Show originals ' : 'Show placeholders ';
    $('rdStored').textContent = RS.count(state);
    $('rdForget').disabled = !has;
    chat.classList.toggle('rd-ph', view === 'placeholders');
  }
  function toggleView() { if (!restoreOn || !RS.count(state)) return; view = view === 'original' ? 'placeholders' : 'original'; refreshAll(); }
  $('rdToggle').addEventListener('click', toggleView);
  $('rdDismiss').addEventListener('click', function () { dismissed = true; refreshAll(); });
  $('rdForget').addEventListener('click', function () { RS.forgetItems(state); view = 'original'; refreshAll(); say('rdStatus', 'Forgotten. The memory list is empty, so replies show placeholders. Numbers are not reused for different values.'); });
  $('rdRestore').addEventListener('change', function () {
    restoreOn = this.checked; if (!restoreOn) { view = 'original'; } refreshAll();
    say('rdStatus', restoreOn ? 'Restore is on: values are remembered in memory and shown again in replies.' : 'Restore is off: nothing is remembered or restored, and numbering restarts every paste.');
  });

  $('rdSend').addEventListener('click', function () {
    const text = input.value;
    if (!text.trim()) { say('rdStatus', 'Write or paste something first.'); return; }
    lastSent = text; $('rdReceived').value = text;
    addBubble('user', text); input.value = ''; closeCheckpoint(); updateSelection(); refreshAll();
    const leaks = findAll(text).length;
    say('rdStatus', leaks ? 'Sent, but the text still holds values Paste Guard would flag (you chose Paste anyway).' : 'Sent. The AI received only what is in the box below, with placeholders.');
  });
  function replyTokens() { const t = tokensIn(lastSent); if (!t.length) say('rdStatus', 'Send a message that contains placeholders first: paste the example, choose Paste masked, then Send.'); return t; }
  $('rdStatic').addEventListener('click', function () {
    const t = replyTokens(); if (t.length) { addBubble('ai', 'Got it. I will use ' + t.join(', ') + ' as you asked.'); refreshAll(); }
  });
  $('rdLong').addEventListener('click', function () {
    const t = replyTokens(); if (!t.length) return;
    const parts = []; t.forEach(function (x) { for (let i = 1; i <= 3; i++) parts.push('Reminder ' + i + ': contact ' + x + ' before Friday.'); });
    addBubble('ai', parts.join('\n')); refreshAll();
  });
  let streaming = false;
  $('rdStream').addEventListener('click', function () {
    const t = replyTokens(); if (!t.length || streaming) return;
    const full = 'Streaming reply: first ' + t[0] + (t[1] ? ', then ' + t[1] : '') + ', and once more ' + t[0] + '. Done.';
    const rec = addBubble('ai', ''); let i = 0; streaming = true;
    // Two characters at a time, so a placeholder is often cut in half on screen: it flips to the value once it is whole.
    (function step() {
      if (i >= full.length) { streaming = false; refreshAll(); return; }
      i += 2; rec.text = full.slice(0, i); refreshAll(); chat.scrollTop = chat.scrollHeight; setTimeout(step, 55);
    })();
  });
  $('rdClearChat').addEventListener('click', function () { chat.textContent = ''; chat.appendChild(emptyNote); emptyNote.hidden = false; bubbles.length = 0; lastSent = ''; $('rdReceived').value = ''; refreshAll(); });

  // keyboard shortcuts (Alt, or Option on a Mac; matched on the physical key so Option+R's special character does not matter)
  document.addEventListener('keydown', function (e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyR' && restoreOn && RS.count(state)) { e.preventDefault(); toggleView(); }
    else if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM' && sel) { e.preventDefault(); maskSelection(); }
  }, true);

  renderDictionary(); refreshAll();
  document.documentElement.setAttribute('data-rd-ready', '1');
})();
