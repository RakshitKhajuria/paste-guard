/* Paste Guard scanner page. Runs the real detectors (detectors.js is copied from src/ at build time).
 * No network access: this file makes no requests and sends nothing anywhere. */
(function () {
  'use strict';
  const D = globalThis.PasteGuardDetectors;
  const $ = function (id) { return document.getElementById(id); };
  const input = $('input'), marked = $('marked'), rows = $('rows'), summary = $('summary');
  const results = $('results'), count = $('count');
  if (!D || !input) return;

  const GROUP_IDS = {
    secrets: ['apiKey'], identity: ['aadhaar', 'pan', 'ssn'], contact: ['email', 'phone'], payments: ['card'],
    regional: ['upi', 'ifsc', 'gstin', 'bankAcct', 'iban', 'nino'], phoneLocal: ['phoneLocal'],
  };
  const MARK_LIMIT = 20000;   // the marked view shows at most this many characters
  const EXAMPLE = [
    'Hi team, can you help debug this deploy script?',
    'Contact: rahul.sharma@example.com or +91 98765 43210',
    'AWS key: AKIAIOSFODNN7EXAMPLE',
    'Aadhaar: 2345 6789 0123 (dummy), PAN: ABCDE1234F',
    'Pay me at rahul@okaxis, card 4111 1111 1111 1111',
    'Thanks!',
  ].join('\n');

  function enabled() {
    const on = {};
    document.querySelectorAll('[data-group]').forEach(function (cb) {
      (GROUP_IDS[cb.getAttribute('data-group')] || []).forEach(function (id) { on[id] = cb.checked; });
    });
    return on;
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    const text = input.value;
    count.textContent = text ? text.length.toLocaleString('en') + ' characters' : '';
    rows.textContent = ''; marked.textContent = '';
    if (!text) { summary.textContent = 'Nothing yet. Press Try the example.'; results.classList.remove('has'); return; }

    const findings = D.scan(text, enabled());
    if (findings === null) { summary.textContent = 'That text is too large to scan here (over 20 million characters).'; return; }
    const groups = D.groupFindings(text, findings);
    const total = findings.length;
    summary.textContent = total
      ? total + (total === 1 ? ' item' : ' items') + ' found, as ' + groups.length + (groups.length === 1 ? ' distinct value.' : ' distinct values.')
      : 'Nothing found. That does not guarantee the text is safe: only known patterns are detected.';
    results.classList.toggle('has', total > 0);

    const label = {};
    groups.forEach(function (g) {
      label[g.key] = g.label;
      const li = el('li');
      li.appendChild(el('span', 'tag', '[' + g.label + ']'));
      li.appendChild(el('span', 'prev', g.preview));
      li.appendChild(el('span', 'times', '×' + g.count));
      rows.appendChild(li);
    });

    // Marked view: surrounding text unchanged, each finding shown as two characters plus its tag.
    let pos = 0;
    const sorted = findings.slice().sort(function (a, b) { return a.start - b.start; });
    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[i];
      if (f.start >= MARK_LIMIT) break;
      if (f.start < pos) continue;
      marked.appendChild(document.createTextNode(text.slice(pos, f.start)));
      const m = el('mark');
      m.appendChild(el('span', 'prev', f.preview));
      m.appendChild(el('span', 'tag', label[D.keyOf(f.type, text.slice(f.start, f.end))] || f.type));
      marked.appendChild(m);
      pos = f.end;
    }
    marked.appendChild(document.createTextNode(text.slice(pos, Math.max(pos, MARK_LIMIT))));
    if (text.length > MARK_LIMIT) marked.appendChild(el('p', 'muted', 'Only the first ' + MARK_LIMIT.toLocaleString('en') + ' characters are shown here.'));

  }

  let timer = 0;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 120); });
  document.querySelectorAll('[data-group]').forEach(function (cb) { cb.addEventListener('change', render); });
  $('example').addEventListener('click', function () { input.value = EXAMPLE; render(); input.focus(); });
  render();
})();
