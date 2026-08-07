// Job Feed Filter —— Service Worker
// 负责：
//   1. 图标 badge（本页屏蔽数 / 选择器失效告警）
//   2. 首次安装 / 版本更新时，主动往已经打开的 LinkedIn Jobs tab 注入 content script
//      —— 避免用户装完还得手动刷新页面才能用

const perTabStats = new Map(); // tabId -> { blockedCount }

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab && sender.tab.id;
  if (!tabId) return;

  if (msg.type === 'jsf:stats') {
    perTabStats.set(tabId, { blockedCount: msg.blockedCount });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#a33' });
    chrome.action.setBadgeText({
      tabId,
      text: msg.blockedCount > 0 ? String(msg.blockedCount) : '',
    });
  } else if (msg.type === 'jsf:selectorFailed') {
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#e0a800' });
    chrome.action.setBadgeText({ tabId, text: '!' });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => perTabStats.delete(tabId));

// ---- 首次安装 / 更新时，回填已经打开的 tab ----
const CONTENT_JS = [
  'src/i18n.js',
  'src/matcher.js',
  'src/storage.js',
  'src/selectors.js',
  'src/content.js',
];
const CONTENT_CSS = ['src/content.css'];

async function isAlreadyInjected(tabId) {
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: 'jsf:ping' });
    return !!resp;
  } catch (_) {
    return false;
  }
}

async function injectIntoOpenTabs() {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: '*://*.linkedin.com/jobs/*' });
  } catch (_) {
    return;
  }
  for (const tab of tabs) {
    if (!tab.id) continue;
    if (await isAlreadyInjected(tab.id)) continue;
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: CONTENT_CSS });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_JS });
    } catch (e) {
      // 某个 tab 注入失败不影响其他 tab（可能是 tab 已跳走等）
      console.warn('[JSF] inject failed for tab', tab.id, e && e.message);
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install' && details.reason !== 'update') return;
  injectIntoOpenTabs();
});
