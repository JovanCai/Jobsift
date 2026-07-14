// Job Feed Filter —— 匹配引擎（纯函数，不接触 DOM，可在 Node 里跑测试）

(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else {
    root.__LRB = root.__LRB || {};
    root.__LRB.matcher = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // 全角 → 半角（ASCII 部分 + 全角空格）
  const toHalfWidth = (s) =>
    s
      .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/　/g, ' ');

  // 日文 / 英文法人格式，前缀 + 后缀都要剥
  const LEGAL_FORMS_RE = new RegExp(
    [
      '株式会社',
      '合同会社',
      '有限会社',
      '一般社団法人',
      '\\(\\s*株\\s*\\)',
      '（株）',
      // 英文放最后，用词边界避免误伤（比如 "Incentive" 里的 "Inc"）
      '\\bInc\\.?\\b',
      '\\bK\\.?K\\.?\\b',
      '\\bLtd\\.?\\b',
      '\\bLLC\\b',
      '\\bLLP\\b',
      '\\bCorp\\.?\\b',
      '\\bCorporation\\b',
      '\\bCo\\.,?\\s*Ltd\\.?\\b',
      '\\bGmbH\\b',
      '\\bPte\\.?\\b',
      '\\bPty\\.?\\b',
      '\\bS\\.?A\\.?\\b',
    ].join('|'),
    'gi'
  );

  function normalize(name) {
    if (!name || typeof name !== 'string') return '';
    let s = toHalfWidth(name);
    s = s.toLowerCase();
    s = s.replace(LEGAL_FORMS_RE, ' ');
    s = s.replace(/[.,·・、。]+/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  // needle 归一化后，被 haystack 包含即命中
  function contains(haystack, needle) {
    const h = normalize(haystack);
    const n = normalize(needle);
    if (!h || !n) return false;
    return h.includes(n);
  }

  // config 结构见 storage.js 默认值
  function judge(companyName, config) {
    const empty = { blocked: false, reason: null, matched: null };
    if (!companyName) return empty;
    if (!config) return empty;

    const { blacklist = [], keywords = [], whitelist = [], keywordsEnabled = true } = config;

    // 白名单最优先
    for (const w of whitelist) {
      if (contains(companyName, w)) return { blocked: false, reason: 'whitelist', matched: w };
    }

    for (const b of blacklist) {
      if (contains(companyName, b)) return { blocked: true, reason: 'blacklist', matched: b };
    }

    if (keywordsEnabled) {
      for (const k of keywords) {
        if (contains(companyName, k)) return { blocked: true, reason: 'keyword', matched: k };
      }
    }

    return empty;
  }

  return { normalize, contains, judge };
});
