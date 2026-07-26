(async () => {
  self.__JSF.i18n.applyI18n();
  const $ = (s) => document.querySelector(s);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab && tab.id;

  // Ping content script 拿真实状态（showAllOverride + 识别出的 blocked 总数）
  // 不再依赖 badge —— badge 只在实际折叠时更新，被 revealed 的不算
  if (tabId) {
    try {
      const resp = await chrome.tabs.sendMessage(tabId, { type: 'jsf:ping' });
      if (resp) {
        if (typeof resp.showAllOverride === 'boolean') {
          $('#show-all').checked = resp.showAllOverride;
        }
        if (typeof resp.matchedCount === 'number') {
          $('#count').textContent = String(resp.matchedCount);
        }
        if (resp.selectorFailed) {
          $('#warn').hidden = false;
          $('#count').textContent = '?';
        }
      }
    } catch (_) {
      // content script 不在这个页面（非 LinkedIn 页 / 页面刚加载 / 扩展未 reload）
      $('#count').textContent = '–';
    }
  }

  $('#show-all').addEventListener('change', async (e) => {
    if (!tabId) return;
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'jsf:setShowAll', value: e.target.checked });
    } catch (_) {}
  });

  $('#open-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
})();
