// 小型 i18n helper：把 HTML 里的 data-i18n / data-i18n-placeholder / data-i18n-title
// 属性替换为当前 locale 的翻译。JS 里用 t() 快捷调用 chrome.i18n.getMessage。

(function (root) {
  function t(key, subs) {
    if (!key) return '';
    return chrome.i18n.getMessage(key, subs) || key;
  }

  function applyI18n(scope) {
    const root = scope || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  root.__LRB = root.__LRB || {};
  root.__LRB.i18n = { t, applyI18n };
})(typeof self !== 'undefined' ? self : this);
