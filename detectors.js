/* Paste Guard detectors: pure functions, usable in the browser and in Node tests.
 * Nothing here logs, stores or transmits matched values. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PasteGuardDetectors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CHUNK_SIZE = 200000;
  const CHUNK_OVERLAP = 4000;
  const MAX_SCAN_CHARS = 20000000;

  // ---- checksums ----
  function luhn(digits) {
    let sum = 0, alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits.charCodeAt(i) - 48;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return sum % 10 === 0;
  }

  const V_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ];
  const V_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];
  function verhoeff(digits) {
    let c = 0;
    for (let i = 0; i < digits.length; i++) {
      const d = digits.charCodeAt(digits.length - 1 - i) - 48;
      c = V_D[c][V_P[i % 8][d]];
    }
    return c === 0;
  }

  // ---- helpers ----
  function digitsOf(s) { return s.replace(/\D/g, ''); }
  function preview(value) {
    const head = value.slice(0, 2);
    return head + '*'.repeat(Math.min(Math.max(value.length - 2, 3), 8));
  }


  // Provider tokens with distinctive prefixes (modelled on the public gitleaks / GitHub lists).
  const SECRET_PATTERNS = [
    // cloud and hosting
    /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
    /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g,
    /\bGOCSPX-[A-Za-z0-9_-]{28}/g,
    /\bya29\.[A-Za-z0-9_-]{30,}/g,
    /\bLTAI[A-Za-z0-9]{16,24}\b/g,
    /\bdo[por]_v1_[a-f0-9]{64}\b/g,
    /\bfo1_[A-Za-z0-9_-]{43}\b/g,
    /\bfm(?:1[ar]|2)_[A-Za-z0-9+/=_-]{100,}/g,
    /\bHRKU-AA[0-9A-Za-z_-]{58}/g,
    /\bpscale_(?:tkn|pw|oauth)_[A-Za-z0-9=._-]{32,64}/g,
    /\bdapi[a-f0-9]{32}(?:-\d)?\b/g,
    /\bv1\.0-[a-f0-9]{24}-[a-f0-9]{146}\b/g,
    /AccountKey=[A-Za-z0-9+/]{86}==/g,
    // code hosting, packages, developer tools
    /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g,
    /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/g,
    /\bgl(?:pat|dt|rt|ptt|soat|ft|imt|agent|oas|ffct|cbt)-[A-Za-z0-9_.-]{20,}/g,
    /\bnpm_[A-Za-z0-9]{36}\b/g,
    /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}/g,
    /\brubygems_[a-f0-9]{48}\b/g,
    /\bCLOJARS_[a-z0-9]{60}\b/g,
    /\bhf_[A-Za-z]{34}\b/g,
    /\bapi_org_[A-Za-z]{34}\b/g,
    /\bPMAK-[a-f0-9]{24}-[a-f0-9]{34}\b/g,
    /\bpul-[a-f0-9]{40}\b/g,
    /\bsntry[su]_[A-Za-z0-9+/=_-]{40,}/g,
    /\bgl(?:c|sa)_[A-Za-z0-9+/=_-]{32,}/g,
    /\brdme_[a-z0-9]{70}\b/g,
    /\btfp_[A-Za-z0-9_-]{59}\b/g,
    /\bpnu_[A-Za-z0-9]{36}\b/g,
    /\bsgp_[a-f0-9]{16}_[a-f0-9]{40}\b/g,
    /\bico-[A-Za-z0-9]{32}\b/g,
    /\bsha256~[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g,
    // AI providers
    /\bsk-(?:ant-|proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/g,
    /\bpplx-[A-Za-z0-9]{48}\b/g,
    // payments and commerce
    /\b[sr]k_(?:live|test|prod)_[A-Za-z0-9]{16,}\b/g,
    /\bshp(?:at|ca|pa|ss)_[a-fA-F0-9]{32}\b/g,
    /\bsq0atp-[A-Za-z0-9_-]{22}/g,
    /\bEAAA[A-Za-z0-9_-]{60}/g,
    /\bFLW(?:SECK|PUBK)(?:_TEST)?-[a-f0-9]{32}-X\b/g,
    /\bshippo_(?:live|test)_[a-f0-9]{40}\b/g,
    /\bEZ[AT]K[0-9a-zA-Z]{54}\b/g,
    // messaging and SaaS
    /\bxox[abeoprs]-[A-Za-z0-9.-]{10,}/g,
    /\bxapp-\d-[A-Z0-9]+-\d+-[a-z0-9]+/g,
    /hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9+/]{20,}/g,
    /webhook\.office\.com\/webhookb2\/[A-Za-z0-9@-]+\/IncomingWebhook\/[A-Za-z0-9]+\/[A-Za-z0-9-]+/g,
    /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g,
    /\bkey-[a-f0-9]{32}\b/g,
    /\bxkeysib-[a-f0-9]{64}-[A-Za-z0-9]{16}\b/g,
    /\bSK[a-f0-9]{32}\b/g,
    /\bntn_[A-Za-z0-9]{40,}/g,
    /\blin_api_[A-Za-z0-9]{40}\b/g,
    /\bATATT3[A-Za-z0-9_=-]{100,}/g,
    /\bpat[A-Za-z0-9]{14}\.[a-f0-9]{64}\b/g,
    /\bsl\.[A-Za-z0-9_-]{100,}/g,
    /\b\d{8,10}:A[A-Za-z0-9_-]{34,35}(?![A-Za-z0-9_-])/g,
    /\bEAA[MC][A-Za-z0-9]{100,}/g,
    /\b[MNO][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,38}(?![A-Za-z0-9_-])/g,
    /\bA3-[A-Z0-9]{6}-(?:[A-Z0-9]{11}|[A-Z0-9]{6}-[A-Z0-9]{5})-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}\b/g,
    // observability and infrastructure
    /\bNRAK-[A-Z0-9]{27}\b/g,
    /\bNRII-[A-Za-z0-9-]{32}\b/g,
    /\bNRJS-[a-f0-9]{19}\b/g,
    /\bdt0c01\.[A-Z0-9]{24}\.[A-Za-z0-9]{64}\b/g,
    /\bdp\.pt\.[A-Za-z0-9]{43}\b/g,
    /\bhv[sb]\.[A-Za-z0-9_-]{24,}/g,
    /\b[A-Za-z0-9]{14}\.atlasv1\.[A-Za-z0-9_=-]{60,70}/g,
    /\bAKCp[A-Za-z0-9]{69}\b/g,
    // key and credential formats
    /\bAGE-SECRET-KEY-1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{58}\b/g,
    /\beyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g,
    /\bZXlK[A-Za-z0-9+/=]{40,}/g,
    // connection strings that embed a password
    /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?|mssql|sqlserver|ftp|sftp|smtp|cloudinary):\/\/[^\s:@\/]+:[^\s@\/]+@[^\s]+/gi,
    // HTTP auth headers and curl credentials
    /\bAuthorization[ \t]*:[ \t]*(?:Bearer|Basic|Token)[ \t]+[A-Za-z0-9._~+\/=-]{8,}/gi,
    /\bcurl\b[^\n]{0,300}?[ \t]-u[ \t]+['"]?[^\s:'"]+:[^\s'"]+/g,
    // Kubernetes Secret manifests: mask the data block
    /kind:[ \t]*Secret\b[\s\S]{0,400}?\n(?:data|stringData):[ \t]*\n(?:[ \t]+[\w.-]+:[ \t]*\S+[ \t]*\n?)+/g,
  ];


  // ---- regional checks ----
  const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function gstinValid(g) {
    let sum = 0, factor = 1;
    for (let i = 0; i < 14; i++) {
      const d = B36.indexOf(g[i]) * factor;
      factor = factor === 2 ? 1 : 2;
      sum += Math.floor(d / 36) + (d % 36);
    }
    return B36[(36 - (sum % 36)) % 36] === g[14];
  }
  const IBAN_LEN = { GB: 22, DE: 22, FR: 27, ES: 24, IT: 27, NL: 18, IE: 22, BE: 16, CH: 21, AT: 20, PT: 25, SE: 24, NO: 15, DK: 18, FI: 18, PL: 28, AE: 23, SA: 24, LU: 20, GR: 27 };
  function ibanValid(raw) {
    const s = raw.replace(/ /g, '');
    if (s.length < 15 || s.length > 34) return false;
    const want = IBAN_LEN[s.slice(0, 2)];
    if (want && s.length !== want) return false;
    const r = s.slice(4) + s.slice(0, 4);
    let rem = 0;
    for (let i = 0; i < r.length; i++) {
      const c = r.charCodeAt(i);
      rem = c >= 65 ? (rem * 100 + (c - 55)) % 97 : (rem * 10 + (c - 48)) % 97;
    }
    return rem === 1;
  }
  const NINO_BAD = { BG: 1, GB: 1, NK: 1, KN: 1, TN: 1, NT: 1, ZZ: 1 };
  const UPI_HANDLES = 'okaxis|oksbi|okhdfcbank|okicici|ybl|ibl|axl|paytm|apl|upi|sbi|icici|hdfcbank|axisbank|kotak|pnb';

  // Each detector: id (settings key), type (label), defaultOn, find(text) -> [{start,end}]
  function regexFinder(re, validate) {
    return function (text) {
      const out = [];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        if (!validate || validate(m[0], m)) out.push({ start: m.index, end: m.index + m[0].length });
      }
      return out;
    };
  }

  const DETECTORS = [
    {
      id: 'apiKey', type: 'API_KEY', label: 'API keys & secrets', defaultOn: true, priority: 0,
      find: function (text) {
        const out = [];
        const res = SECRET_PATTERNS;
        for (const re of res) out.push.apply(out, regexFinder(re)(text));
        // Secrets with no recognisable prefix (e.g. an AWS secret key): a label such as
        // "secret", "token" or "password" followed by : or = and a mixed-character value.
        const ctx = /\b(?:secret|api[_ -]?key|access[_ -]?key|auth[_ -]?token|token|password|passwd|pwd)\w*[ \t]*[:=][ \t]*["']?([^\s"']{16,})/gi;
        let c;
        while ((c = ctx.exec(text)) !== null) {
          const v = c[1];
          const classes = (/[a-z]/.test(v) ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) + (/\d/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
          if (classes < 3) continue;
          const start = c.index + c[0].length - v.length;
          out.push({ start: start, end: start + v.length });
        }
        // PEM private key blocks (an unterminated block runs to the end of the text)
        const begin = /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/g;
        let m;
        while ((m = begin.exec(text)) !== null) {
          const endRe = /-----END [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/g;
          endRe.lastIndex = m.index + m[0].length;
          const e = endRe.exec(text);
          const end = e ? e.index + e[0].length : text.length;
          out.push({ start: m.index, end: end });
          begin.lastIndex = end;
        }
        return out;
      },
    },
    {
      id: 'email', type: 'EMAIL', label: 'Email addresses', defaultOn: true, priority: 1,
      find: regexFinder(/(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g),
    },
    {
      id: 'card', type: 'CARD', label: 'Card numbers', defaultOn: true, priority: 2,
      find: regexFinder(/(?<![\d])\d(?:[ -]?\d){12,18}(?![\d])/g, function (v) {
        const d = digitsOf(v);
        if (d.length < 13 || d.length > 19) return false;
        if (/^(\d)\1+$/.test(d)) return false;
        return luhn(d);
      }),
    },
    {
      id: 'aadhaar', type: 'AADHAAR', label: 'Aadhaar numbers', defaultOn: true, priority: 3,
      // Grouped 4-4-4 (spaces or dashes) is distinctive enough to flag without the checksum;
      // an unseparated 12-digit number must pass Verhoeff. A fourth group of 4 digits means a 16-digit number (a card), not an Aadhaar.
      find: regexFinder(/(?<![\d-])[2-9]\d{3}([ -]?)\d{4}\1\d{4}(?!\d|[ -]\d{4}(?!\d))/g, function (v, m) {
        return m[1] !== '' || verhoeff(digitsOf(v));
      }),
    },
    {
      id: 'pan', type: 'PAN', label: 'PAN numbers', defaultOn: true, priority: 4,
      find: regexFinder(/(?<![A-Za-z0-9])[A-Z]{5}\d{4}[A-Z](?![A-Za-z0-9])/g),
    },
    {
      id: 'ssn', type: 'SSN', label: 'US SSNs', defaultOn: true, priority: 5,
      find: regexFinder(/(?<![\d-])(\d{3})([ -])(\d{2})\2(\d{4})(?![\d-])/g, function (v, m) {
        const area = +m[1], group = +m[3], serial = +m[4];
        if (area === 0 || area === 666 || area >= 900) return false;
        if (group === 0 || serial === 0) return false;
        return true;
      }),
    },

    // ---- regional ----
    {
      // name@handle for known UPI handles. Handles have no dot, so these never look like emails.
      id: 'upi', type: 'UPI', label: 'UPI IDs', defaultOn: true, priority: 1.5, group: 'regional',
      find: regexFinder(new RegExp('(?<![A-Za-z0-9._%+-])[A-Za-z0-9._-]{2,64}@(?:' + UPI_HANDLES + ')(?![A-Za-z0-9-]|\\.[A-Za-z0-9])', 'gi')),
    },
    {
      id: 'ifsc', type: 'IFSC', label: 'IFSC codes', defaultOn: true, priority: 4.5, group: 'regional',
      find: regexFinder(/(?<![A-Za-z0-9])[A-Z]{4}0[A-Z0-9]{6}(?![A-Za-z0-9])/g),
    },
    {
      id: 'gstin', type: 'GSTIN', label: 'GSTIN numbers', defaultOn: true, priority: 4.2, group: 'regional',
      find: regexFinder(/(?<![A-Za-z0-9])(?:0[1-9]|[12]\d|3[0-8]|9[79])[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z](?![A-Za-z0-9])/g, gstinValid),
    },
    {
      // Only when a label such as "account number" or "a/c no" sits right before the digits.
      id: 'bankAcct', type: 'BANK_ACCT', label: 'Bank account numbers (labelled)', defaultOn: true, priority: 2.5, group: 'regional',
      find: function (text) {
        const out = [], re = /(?<![A-Za-z])(?:a\/c|acct|account)(?:[ \t]{0,3}(?:no|number|num|#)\.?)?[ \t]{0,3}[:=-]?[ \t]{0,3}(\d{9,18})(?!\d)/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
          const start = m.index + m[0].length - m[1].length;
          out.push({ start: start, end: start + m[1].length });
        }
        return out;
      },
    },
    {
      id: 'iban', type: 'IBAN', label: 'IBANs', defaultOn: true, priority: 3.5, group: 'regional',
      find: regexFinder(/(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?(?![A-Za-z0-9])/g, ibanValid),
    },
    {
      id: 'nino', type: 'NINO', label: 'UK National Insurance numbers', defaultOn: true, priority: 5.5, group: 'regional',
      find: regexFinder(/(?<![A-Za-z0-9])[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z] ?\d{2} ?\d{2} ?\d{2} ?[A-D](?![A-Za-z0-9])/g, function (v) {
        return !NINO_BAD[v.slice(0, 2)];
      }),
    },
    {
      // International numbers (+91 and any number starting with +)
      id: 'phone', type: 'PHONE', label: 'Phone numbers (+91 / international)', defaultOn: true, priority: 6,
      find: function (text) {
        // Indian mobile written in two groups of five ("98765 43210", optional leading 0)
        const grouped = regexFinder(/(?<![\d+-])0?[6-9]\d{4}[ -]\d{5}(?![\d-])/g)(text);
        const intl = regexFinder(/(?<![\w+])\+\d{1,3}(?:[ .-]?\(?\d{1,5}\)?){2,5}(?!\d)/g, function (v) {
          const n = digitsOf(v).length;
          if (n < 8 || n > 15) return false;
          return /^\+91/.test(v) ? n === 12 : true;
        })(text);
        return grouped.concat(intl);
      },
    },
    {
      // Local formats: 10-digit Indian mobiles and US style numbers. Off by default.
      id: 'phoneLocal', type: 'PHONE', label: 'Phone numbers (local formats)', defaultOn: false, priority: 7,
      find: regexFinder(/(?<![\d+-])(?:0?[6-9]\d{4}[ -]?\d{5}|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4})(?![\d-])/g),
    },
  ];

  function defaultSettings() {
    const detectors = {};
    DETECTORS.forEach(function (d) { detectors[d.id] = d.defaultOn; });
    return { enabled: true, mode: 'ask', detectors: detectors, protectedCount: 0, customWords: [], customRegex: [], restore: true };
  }

  function scanChunk(text, enabled, offset, out) {
    for (const d of DETECTORS) {
      const on = enabled && enabled[d.id] !== undefined ? !!enabled[d.id] : d.defaultOn;
      if (!on) continue;
      const hits = d.find(text);
      for (const h of hits) {
        const value = text.slice(h.start, h.end);
        out.push({
          detector: d.id, type: d.type, priority: d.priority,
          start: h.start + offset, end: h.end + offset,
          preview: preview(value),
        });
      }
    }
  }

  // Keep the longest/highest-priority finding when ranges overlap.
  function resolveOverlaps(list) {
    list.sort(function (a, b) {
      return a.start - b.start || (b.end - b.start) - (a.end - a.start) || a.priority - b.priority;
    });
    const out = [];
    let lastEnd = -1;
    for (const f of list) {
      if (f.start >= lastEnd) {
        out.push(f); lastEnd = f.end;
      } else if (f.end > lastEnd && out.length && out[out.length - 1].start === f.start) {
        continue;
      }
    }
    return out.map(function (f) {
      return { detector: f.detector, type: f.type, start: f.start, end: f.end, preview: f.preview };
    });
  }

  /**
   * scan(text, enabled) -> [{detector, type, start, end, preview}]
   * enabled: map of detector id -> boolean (missing ids use defaults).
   * Large texts are scanned in overlapping chunks. Texts above MAX_SCAN_CHARS
   * return `null` so the caller can decide (the content script lets them through).
   */
  function scan(text, enabled) {
    if (typeof text !== 'string' || text.length === 0) return [];
    if (text.length > MAX_SCAN_CHARS) return null;
    const raw = [];
    if (text.length <= CHUNK_SIZE + CHUNK_OVERLAP) {
      scanChunk(text, enabled, 0, raw);
    } else {
      for (let pos = 0; pos < text.length; pos += CHUNK_SIZE) {
        const from = Math.max(0, pos - CHUNK_OVERLAP);
        const to = Math.min(text.length, pos + CHUNK_SIZE + CHUNK_OVERLAP);
        scanChunk(text.slice(from, to), enabled, from, raw);
      }
      const seen = new Set();
      for (let i = raw.length - 1; i >= 0; i--) {
        const k = raw[i].detector + ':' + raw[i].start + ':' + raw[i].end;
        if (seen.has(k)) raw.splice(i, 1); else seen.add(k);
      }
    }
    return resolveOverlaps(raw);
  }

  // ---- custom rules (Pro, locked for now) ----
  // A user pattern must never be able to freeze a paste. Three layers:
  //   1. validateCustomRegex: patterns are checked when saved (and again before every scan);
  //   2. hard limits on how many rules and words there are and how long they can be;
  //   3. scanCustom runs rules on small chunks under a total time budget and gives up (keeping
  //      the built-in detectors untouched) when the budget is spent.
  const CUSTOM_LIMITS = {
    maxRules: 20, maxWords: 200, maxPatternLength: 200, maxWordLength: 100, maxFindings: 1000,
    // A pattern's "cost" is the product of its repeat counts (* + {n,} count as 1000, ? as 2, {n,m} as m-n+1).
    // One unbounded repeat (1000) is fine; two of them (a*a*b, .*x.*y) are cubic on a chunk and are refused.
    maxCost: 20000,
    // The budget is only checked between chunks, so the chunk size and maxCost together bound how long one
    // chunk can take. A match is found if it starts in a chunk and ends within chunk + overlap characters of
    // that chunk's start (so matches up to 200 characters long are always found).
    budgetMs: 50, chunk: 1000, overlap: 200,
  };

  // Returns { ok: true } or { ok: false, error: 'plain-language reason' }.
  function validateCustomRegex(src) {
    const L = CUSTOM_LIMITS;
    if (typeof src !== 'string' || !src.length) return { ok: false, error: 'is empty' };
    if (src.length > L.maxPatternLength) return { ok: false, error: 'is longer than ' + L.maxPatternLength + ' characters' };
    try { new RegExp(src, 'g'); } catch (e) { return { ok: false, error: 'is not a valid pattern' }; }

    const stack = [];
    let inClass = false, cost = 1, prevQuant = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '\\') {
        const nx = src[i + 1];
        if (!inClass && nx && ((nx >= '1' && nx <= '9') || nx === 'k')) return { ok: false, error: 'uses a back-reference (\\' + nx + '), which can freeze a paste' };
        i++; prevQuant = false; continue;
      }
      if (inClass) { if (ch === ']') inClass = false; continue; }
      if (ch === '[') { inClass = true; prevQuant = false; continue; }
      if (ch === '(') {
        const rest = src.slice(i, i + 4);
        const look = /^\(\?(<?[=!])/.test(rest);
        stack.push({ look: look, hasQuant: false, hasAlt: false });
        if (src[i + 1] === '?') i += look ? (rest[2] === '<' ? 3 : 2) : (src[i + 2] === '<' && src[i + 3] !== '=' && src[i + 3] !== '!' ? src.indexOf('>', i) - i : 2);
        prevQuant = false; continue;
      }
      if (ch === '|') { if (stack.length) stack[stack.length - 1].hasAlt = true; prevQuant = false; continue; }

      // quantifier? (* + ? {n} {n,} {n,m})
      let q = null, qLen = 1, factor = 1;
      if (ch === '*' || ch === '+') { q = ch; factor = 1000; }
      else if (ch === '?') { q = ch; factor = 2; }
      else if (ch === '{') {
        const m = /^\{(\d+)(,(\d*))?\}/.exec(src.slice(i));
        if (m) {
          q = m[0]; qLen = m[0].length;
          if (m[2]) factor = m[3] === '' ? 1000 : Math.min(1000, Math.max(1, +m[3] - +m[1] + 1));
        }
      }
      if (q !== null) {
        if (q === '?' && prevQuant) { prevQuant = false; continue; } // lazy modifier (+?, *?, {n,m}?)
        if (stack.length) stack[stack.length - 1].hasQuant = true;
        cost *= factor;
        if (cost > L.maxCost) return { ok: false, error: 'is too complex: it repeats too many parts, which can be very slow. Use bounded repeats such as \\d{1,10} instead of \\d+, and avoid more than one * or +' };
        i += qLen - 1; prevQuant = true; continue;
      }
      if (ch === ')') {
        const g = stack.pop();
        // what follows the group?
        const after = src.slice(i + 1);
        const nm = /^(\*|\+|\{(\d+)(,(\d*))?\})/.exec(after);
        const followedByRepeat = !!nm && (nm[1] === '*' || nm[1] === '+' || (nm[3] ? (nm[4] === '' || +nm[4] > 1) : +nm[2] > 1));
        const followedByAny = !!nm || /^\?/.test(after);
        if (g) {
          if (g.look && g.hasQuant) return { ok: false, error: 'has a quantifier inside a lookahead or lookbehind' };
          if (g.look && followedByAny) return { ok: false, error: 'repeats a lookahead or lookbehind' };
          if (followedByRepeat && (g.hasQuant || g.hasAlt)) return { ok: false, error: 'has a repeated group that contains a quantifier or alternation, like (a+)+ or (a|aa)+, which can freeze a paste' };
          if (stack.length && (g.hasQuant || followedByAny)) stack[stack.length - 1].hasQuant = true;
        }
        prevQuant = false; continue;
      }
      prevQuant = false;
    }
    return { ok: true };
  }

  // Checks a whole rule set (what the popup saves). errors: [{ kind, index, message }] with 1-based lines.
  function validateCustomRules(words, regexes) {
    const L = CUSTOM_LIMITS, errors = [];
    words = words || []; regexes = regexes || [];
    if (words.length > L.maxWords) errors.push({ kind: 'word', index: 0, message: 'Too many custom words (' + words.length + '). The limit is ' + L.maxWords + '.' });
    if (regexes.length > L.maxRules) errors.push({ kind: 'regex', index: 0, message: 'Too many regex rules (' + regexes.length + '). The limit is ' + L.maxRules + '.' });
    words.forEach(function (w, i) {
      if (typeof w !== 'string' || !w.length) errors.push({ kind: 'word', index: i + 1, message: 'Word ' + (i + 1) + ' is empty.' });
      else if (w.length > L.maxWordLength) errors.push({ kind: 'word', index: i + 1, message: 'Word ' + (i + 1) + ' is longer than ' + L.maxWordLength + ' characters.' });
    });
    regexes.forEach(function (r, i) {
      const v = validateCustomRegex(r);
      if (!v.ok) errors.push({ kind: 'regex', index: i + 1, message: 'Regex line ' + (i + 1) + ' ' + v.error + '.' });
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function nowMs() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }

  // Plain words are matched literally, case-insensitively. Returns an array of findings; the array's
  // (non-enumerable) `skipped` property is true when the time budget ran out or a rule was refused,
  // so the caller knows some custom rules did not run. It never throws and never takes much longer than the budget.
  function scanCustom(text, words, regexes, options) {
    const L = Object.assign({}, CUSTOM_LIMITS, options || {});
    const out = [];
    let skipped = false;
    Object.defineProperty(out, 'skipped', { get: function () { return skipped; }, enumerable: false });
    if (typeof text !== 'string' || !text) return out;
    const t0 = nowMs();
    const over = function () { return nowMs() - t0 > L.budgetMs; };
    const add = function (start, end) {
      if (out.length >= L.maxFindings) { skipped = true; return false; }
      out.push({ detector: 'custom', type: 'CUSTOM', start: start, end: end, preview: preview(text.slice(start, end)) });
      return true;
    };

    try {
      const ws = (words || []).filter(function (w) { return typeof w === 'string' && w.length > 0 && w.length <= L.maxWordLength; }).slice(0, L.maxWords);
      if ((words || []).length > ws.length) skipped = true;
      if (ws.length) {
        const lower = text.toLowerCase();
        for (let k = 0; k < ws.length; k++) {
          if (over()) { skipped = true; break; }
          const needle = ws[k].toLowerCase();
          let i = lower.indexOf(needle);
          while (i !== -1) {
            if (!add(i, i + needle.length)) break;
            i = lower.indexOf(needle, i + needle.length);
          }
        }
      }

      const rules = (regexes || []).slice(0, L.maxRules);
      if ((regexes || []).length > rules.length) skipped = true;
      for (let r = 0; r < rules.length; r++) {
        if (!validateCustomRegex(rules[r]).ok) { skipped = true; continue; } // never run an unsafe pattern
        let re;
        try { re = new RegExp(rules[r], 'g'); } catch (e) { skipped = true; continue; }
        for (let pos = 0; pos < text.length; pos += L.chunk) {
          if (over()) { skipped = true; return out; }
          // each chunk gets a little look-ahead so a match that crosses the boundary is still found once
          const slice = text.slice(pos, pos + L.chunk + L.overlap);
          const last = pos + L.chunk >= text.length;
          re.lastIndex = 0;
          let m, guard = 0;
          while ((m = re.exec(slice)) !== null && guard++ < 1000) {
            if (!last && m.index >= L.chunk) break; // belongs to the next chunk
            if (!m[0]) { re.lastIndex++; continue; }
            if (!add(pos + m.index, pos + m.index + m[0].length)) return out;
          }
        }
      }
    } catch (e) {
      skipped = true; // never let a custom rule break a paste
    }
    return out;
  }

  // ---- personal dictionary (free: up to 10 words, whole words, case-insensitive) ----
  const DICTIONARY_LIMIT = 10, DICTIONARY_WORD_MAX = 100;
  // A word is stored trimmed, on one line, 1 to 100 characters. Returns '' when it cannot be used.
  function cleanDictionaryWord(w) {
    if (typeof w !== 'string') return '';
    const t = w.replace(/\s+/g, ' ').trim();
    return t.length >= 1 && t.length <= DICTIONARY_WORD_MAX ? t : '';
  }
  // Literal match with word boundaries: "Acme" matches "acme" and "ACME corp" but not "Acmeville" or "Pacme".
  // Each word is escaped to a literal pattern, so matching is linear and cannot backtrack badly.
  function scanDictionary(text, words, limit) {
    const out = [];
    if (typeof text !== 'string' || !text || !Array.isArray(words)) return out;
    const seen = new Set();
    words.slice(0, limit || DICTIONARY_LIMIT).forEach(function (w) {
      const word = cleanDictionaryWord(w);
      if (!word || seen.has(word.toLowerCase())) return;
      seen.add(word.toLowerCase());
      const lit = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
      const re = new RegExp('(?<![\\p{L}\\p{N}_])' + lit + '(?![\\p{L}\\p{N}_])', 'giu');
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        out.push({ detector: 'dictionary', type: 'CUSTOM', priority: -1, start: m.index, end: m.index + m[0].length, preview: preview(m[0]) });
        if (out.length >= 500) return;
      }
    });
    return out;
  }

  function mergeFindings(a, b) {
    const all = a.concat(b).map(function (f) { return Object.assign({ priority: f.detector === 'custom' ? -1 : 0 }, f); });
    return resolveOverlaps(all);
  }

  // Same value => same key. Emails and UPI IDs ignore case; everything else keeps it.
  function keyOf(type, value) {
    let v = value.replace(/[\s-]/g, '');
    if (type === 'EMAIL' || type === 'UPI' || type === 'CUSTOM') v = v.toLowerCase();
    return type + ':' + v;
  }

  // One entry per unique value, numbered per type in order of first appearance (restarts every paste).
  function groupFindings(text, findings) {
    const sorted = findings.slice().sort(function (a, b) { return a.start - b.start; });
    const rows = [], byKey = {}, counters = {};
    sorted.forEach(function (f) {
      const key = keyOf(f.type, text.slice(f.start, f.end));
      let row = byKey[key];
      if (!row) {
        counters[f.type] = (counters[f.type] || 0) + 1;
        row = byKey[key] = { key: key, type: f.type, n: counters[f.type], label: f.type + '_' + counters[f.type], count: 0, preview: f.preview, findings: [] };
        rows.push(row);
      }
      row.count++;
      row.findings.push(f);
    });
    return rows;
  }

  // Replace each finding with its numbered label, e.g. [EMAIL_1]. `skip` is an optional set of
  // keys (see keyOf) that are left as they are, used for items the user chose to ignore.
  // `labels` (optional) maps keys to labels, used by restore mode for session-wide numbering; without it the
  // numbering restarts every paste, exactly as in 1.1.0.
  function maskText(text, findings, skip, labels) {
    const labelOf = {};
    groupFindings(text, findings).forEach(function (r) { labelOf[r.key] = labels && labels[r.key] ? labels[r.key] : r.label; });
    let out = '', pos = 0;
    findings.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (f) {
      if (f.start < pos) return;
      const key = keyOf(f.type, text.slice(f.start, f.end));
      if (skip && skip.has(key)) return;
      out += text.slice(pos, f.start) + '[' + labelOf[key] + ']';
      pos = f.end;
    });
    return out + text.slice(pos);
  }

  return {
    DETECTORS: DETECTORS, defaultSettings: defaultSettings, scan: scan, scanCustom: scanCustom,
    validateCustomRegex: validateCustomRegex, validateCustomRules: validateCustomRules, CUSTOM_LIMITS: CUSTOM_LIMITS,
    mergeFindings: mergeFindings, scanDictionary: scanDictionary, cleanDictionaryWord: cleanDictionaryWord, DICTIONARY_LIMIT: DICTIONARY_LIMIT, maskText: maskText, groupFindings: groupFindings, keyOf: keyOf,
    luhn: luhn, verhoeff: verhoeff, preview: preview, MAX_SCAN_CHARS: MAX_SCAN_CHARS,
  };
});
