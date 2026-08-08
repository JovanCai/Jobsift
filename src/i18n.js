// 小型 i18n helper
//
// 默认走 chrome.i18n.getMessage()（跟随 Chrome UI 语言）。
// 用户在设置里手动选择语言后，会 fetch _locales/{lang}/messages.json 到内存做覆盖，
// 命中就用覆盖版，命不中 fallback 回 chrome.i18n。

(function (root) {
  let _override = null;  // { key: { message, placeholders } } | null

  async function loadOverride(lang) {
    if (!lang || lang === 'auto') {
      _override = null;
      return;
    }
    try {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const resp = await fetch(url);
      _override = await resp.json();
    } catch (e) {
      console.warn('[JSF] failed to load locale override:', lang, e && e.message);
      _override = null;
    }
  }

  // 用 chrome.i18n 的替换规则处理自定义 override 消息
  // 参考：https://developer.chrome.com/docs/extensions/how-to/ui/localization-message-formats
  function formatOverrideMessage(entry, subs) {
    let msg = entry.message || '';
    if (entry.placeholders && subs) {
      const arr = Array.isArray(subs) ? subs : [subs];
      for (const [name, def] of Object.entries(entry.placeholders)) {
        const content = def.content || '';
        const m = content.match(/^\$(\d+)$/);
        const val = m ? arr[parseInt(m[1], 10) - 1] : content;
        msg = msg.replace(new RegExp(`\\$${name}\\$`, 'gi'), val == null ? '' : String(val));
      }
    }
    return msg;
  }

  function t(key, subs) {
    if (!key) return '';
    if (_override && _override[key]) {
      return formatOverrideMessage(_override[key], subs);
    }
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

  root.__JSF = root.__JSF || {};
  root.__JSF.i18n = { t, applyI18n, loadOverride };
})(typeof self !== 'undefined' ? self : this);
