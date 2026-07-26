// Job Feed Filter —— Service Worker
// 负责：图标 badge（本页屏蔽数 / 选择器失效告警）

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
