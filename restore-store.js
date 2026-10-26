/* Paste Guard restore store: session-wide placeholder numbering and the placeholder -> original value mapping.
 * The mapping lives only in chrome.storage.session (memory, cleared when the browser closes), per site origin.
 * Original values are never written to disk, to the page, to a URL or to the console.
 * The pure functions at the top take the clock as an argument so tests can check expiry without waiting. */
(function (root) {
  'use strict';
  const TTL_MS = 4 * 60 * 60 * 1000; // entries expire 4 hours after they were last used
  const CAP = 500;                    // at most 500 entries per site origin (oldest go first)
  const MAX_VALUE = 8000;             // longer values are masked but not restorable
  const PREFIX = 'restore:';
  const TOKEN_RE = /\[([A-Za-z][A-Za-z_]*)_(\d{1,6})\]/g;

  // The clock. Tests on the dev build can shift it (scripts/test-hooks.js); the shipped build always uses the real time.
  function now() { return Date.now(); }

  function empty() { return { v: 1, items: {}, counters: {} }; }

  // Drop expired entries, then the oldest ones beyond the cap. Returns the same object.
  function prune(state, now) {
    const items = state.items;
    Object.keys(items).forEach(function (k) { if (!(now - items[k].ts <= TTL_MS)) delete items[k]; });
    const keys = Object.keys(items);
    if (keys.length > CAP) {
      keys.sort(function (a, b) { return items[a].ts - items[b].ts; });
      keys.slice(0, keys.length - CAP).forEach(function (k) { delete items[k]; });
    }
    return state;
  }

  // Accept anything read from storage; never trust its shape.
  function normalize(raw, now) {
    const s = empty();
    if (raw && typeof raw === 'object') {
      if (raw.counters && typeof raw.counters === 'object') {
        Object.keys(raw.counters).forEach(function (t) { const n = Number(raw.counters[t]); if (/^[A-Z_]+$/.test(t) && n > 0 && n < 1e6) s.counters[t] = Math.floor(n); });
      }
      if (raw.items && typeof raw.items === 'object') {
        Object.keys(raw.items).forEach(function (label) {
          const it = raw.items[label];
          if (/^[A-Z_]+_\d{1,6}$/.test(label) && it && typeof it.value === 'string' && typeof it.key === 'string' && typeof it.ts === 'number') {
            s.items[label] = { type: String(it.type || ''), key: it.key, value: it.value, ts: it.ts };
          }
        });
      }
    }
    return prune(s, now);
  }

  function count(state) { return Object.keys(state.items).length; }

  function labelByKey(state) {
    const m = {};
    Object.keys(state.items).forEach(function (l) { m[state.items[l].key] = l; });
    return m;
  }

  // Labels for `rows` ({key, type}) WITHOUT changing the state: the same value keeps its label, a new value gets
  // the next number for its type. Used to show the dialog before the user has decided anything.
  function peekLabels(state, rows) {
    const known = labelByKey(state), next = {}, out = {};
    rows.forEach(function (r) {
      if (known[r.key]) { out[r.key] = known[r.key]; return; }
      next[r.type] = (next[r.type] || state.counters[r.type] || 0) + 1;
      out[r.key] = r.type + '_' + next[r.type];
    });
    return out;
  }

  // Record `rows` ({key, type, value}) under `labels` (from peekLabels), refreshing the clock on reused entries.
  function commit(state, rows, labels, now) {
    rows.forEach(function (r) {
      const label = labels[r.key];
      if (!label) return;
      const n = Number(label.slice(label.lastIndexOf('_') + 1));
      if (n > (state.counters[r.type] || 0)) state.counters[r.type] = n;
      if (r.value.length <= MAX_VALUE) state.items[label] = { type: r.type, key: r.key, value: r.value, ts: now };
    });
    return prune(state, now);
  }

  // Exact tokens in `text` that exist in the mapping: [{start, end, label, value}]. Case-insensitive.
  function findTokens(text, state, now) {
    const out = [];
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      const label = m[1].toUpperCase() + '_' + m[2];
      const it = state.items[label];
      if (it && now - it.ts <= TTL_MS) out.push({ start: m.index, end: m.index + m[0].length, label: label, value: it.value });
    }
    return out;
  }

  // Forget every stored value but keep the counters, so a number is never reused for a different value this session.
  function forgetItems(state) { state.items = {}; return state; }

  // ---------- storage (chrome.storage.session, with an in-memory fallback inside the page) ----------
  const mem = {};
  function area() { try { return root.chrome && root.chrome.storage && root.chrome.storage.session; } catch (e) { return null; } }
  function lastErr() { try { return !!root.chrome.runtime.lastError; } catch (e) { return false; } }
  function keyFor(origin) { return PREFIX + origin; }
  function read(origin, cb) {
    const k = keyFor(origin), a = area();
    if (!a) { cb(mem[k]); return; }
    try {
      a.get(k, function (r) {
        if (lastErr()) { cb(mem[k]); return; }
        cb(r && r[k]);
      });
    } catch (e) { cb(mem[k]); }
  }
  function write(origin, state, cb) {
    const k = keyFor(origin), a = area();
    mem[k] = state; // fallback copy: memory of this page only
    if (!a) { if (cb) cb(); return; }
    try {
      const o = {}; o[k] = state;
      a.set(o, function () { lastErr(); if (cb) cb(); });
    } catch (e) { if (cb) cb(); }
  }
  // Popup helpers: how many values are stored across all sites, and forget them all.
  function countAll(cb) {
    const a = area();
    if (!a) { cb(0); return; }
    a.get(null, function (all) {
      const now = Date.now();
      let n = 0;
      Object.keys(all || {}).forEach(function (k) { if (k.indexOf(PREFIX) === 0) n += count(normalize(all[k], now)); });
      cb(n);
    });
  }
  function forgetAll(cb) {
    const a = area();
    if (!a) { cb(); return; }
    a.get(null, function (all) {
      const keys = Object.keys(all || {}).filter(function (k) { return k.indexOf(PREFIX) === 0; });
      let left = keys.length;
      if (!left) { cb(); return; }
      keys.forEach(function (k) {
        const st = normalize(all[k], Date.now());
        forgetItems(st);
        const o = {}; o[k] = st;
        a.set(o, function () { if (--left === 0) cb(); });
      });
    });
  }

  root.PasteGuardRestore = {
    TTL_MS: TTL_MS, CAP: CAP, MAX_VALUE: MAX_VALUE, PREFIX: PREFIX,
    empty: empty, normalize: normalize, prune: prune, count: count, peekLabels: peekLabels, commit: commit,
    findTokens: findTokens, forgetItems: forgetItems,
    now: function () { return root.PasteGuardRestore.__now(); }, __now: now,
    keyFor: keyFor, read: read, write: write, countAll: countAll, forgetAll: forgetAll,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PasteGuardRestore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
