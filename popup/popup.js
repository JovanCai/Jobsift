(async () => {
  self.__JSF.i18n.applyI18n();
  const $ = (s) => document.querySelector(s);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab && tab.id;

  const showLoginPrompt = () => {
    $('#login-required').hidden = false;
    $('#status').hidden = true;
    $('#show-all-row').hidden = true;
  };

  $('#open-linkedin').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://www.linkedin.com/login' });
  });

  // Ping content script 拿真实状态
  if (tabId) {
    try {
      const resp = await chrome.tabs.sendMessage(tabId, { type: 'jsf:ping' });
      if (resp) {
        if (resp.loggedOut) {
          showLoginPrompt();
        } else {
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
      }
    } catch (_) {
      // content script 不在这个页面
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
