// Job Feed Filter —— 页面注入主脚本

(function () {
  const { matcher, storage, selectors, i18n } = self.__JSF;
  const t = i18n.t;

  let currentConfig = null;
  let sessionRevealed = new Set();     // 用户临时点了 "看一眼" 的 jobId
  let showAllOverride = false;         // popup 里的 "暂时全部显示" 开关

  // 每张卡片处理后打的标记（值 = 处理时用的公司名，公司名变了要重新处理）
  const MARK_ATTR = 'data-jsf-processed';
  const HIDE_ATTR = 'data-jsf-hidden';
  const CARD_ID_ATTR = 'data-jsf-card-id';

  // 从卡片提取一个稳定的 id：优先用 jobId，退回到 title|company
  const cardId = (info) => info.jobId || `${info.title || ''}|${info.company || ''}`;

  function applyCardDecision(cardRoot, info) {
    const id = cardId(info);
    cardRoot.setAttribute(CARD_ID_ATTR, id);

    const marked = cardRoot.getAttribute(MARK_ATTR);
    if (marked === info.company) {
      // 已按当前公司名处理过，且状态未变 → 跳过
      return;
    }
    cardRoot.setAttribute(MARK_ATTR, info.company || '');

    // 先清理上次可能加的注入元素（虚拟滚动可能复用同一 DOM 节点承担不同 jobId）
    cardRoot.querySelectorAll('.jsf-overlay').forEach((n) => n.remove());
    cardRoot.querySelectorAll('.jsf-quick-block').forEach((n) => n.remove());
    cardRoot.classList.remove('jsf-blocked', 'jsf-revealed');

    if (!info.company) return; // 没提取到公司名 → 不动它

    const verdict = matcher.judge(info.company, currentConfig);

    if (!verdict.blocked || showAllOverride || sessionRevealed.has(id)) {
      injectQuickBlockButton(cardRoot, info);
      if (verdict.blocked) cardRoot.classList.add('jsf-revealed');
      return;
    }

    // 屏蔽：折叠为一行灰条
    cardRoot.classList.add('jsf-blocked');
    const overlay = document.createElement('div');
    overlay.className = 'jsf-overlay';
    overlay.innerHTML = `
      <span class="jsf-overlay-label">
        <span class="jsf-overlay-icon">⊘</span>
        <span class="jsf-overlay-blocked-text"></span>
        <strong></strong>
        <span class="jsf-overlay-reason"></span>
      </span>
      <span class="jsf-overlay-actions">
        <button type="button" class="jsf-btn jsf-peek"></button>
        <button type="button" class="jsf-btn jsf-whitelist"></button>
      </span>
    `;
    overlay.querySelector('.jsf-overlay-blocked-text').textContent = t('overlay_blocked');
    overlay.querySelector('strong').textContent = info.company;
    overlay.querySelector('.jsf-overlay-reason').textContent =
      verdict.reason === 'blacklist'
        ? `· ${t('overlay_reason_blacklist')}`
        : verdict.reason === 'keyword'
        ? `· ${t('overlay_reason_keyword', [verdict.matched])}`
        : '';
    overlay.querySelector('.jsf-peek').textContent = t('overlay_peek');
    overlay.querySelector('.jsf-whitelist').textContent = t('overlay_whitelist');
    overlay.querySelector('.jsf-peek').addEventListener('click', (e) => {
      e.stopPropagation();
      sessionRevealed.add(id);
      applyCardDecision(cardRoot, info);
    });
    overlay.querySelector('.jsf-whitelist').addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await storage.addTo('whitelist', info.company); }
      catch (err) { markContextDead(); }
    });
    cardRoot.prepend(overlay);
  }

  function injectQuickBlockButton(cardRoot, info) {
    // 不做「已存在则跳过」检查 —— 每次都重建，确保 click handler 里的 info 是最新的
    cardRoot.querySelectorAll('.jsf-quick-block').forEach((n) => n.remove());
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jsf-quick-block';
    btn.title = t('quick_block_title', [info.company]);
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
      + '<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/>'
      + '<line x1="3.5" y1="12.5" x2="12.5" y2="3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
      + '</svg>';
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      try { await storage.addTo('blacklist', info.company); }
      catch (err) { markContextDead(); }
    });
    cardRoot.appendChild(btn);
  }

  let _contextDead = false;
  let _observer = null;

  function isContextAlive() {
    try { return !!chrome.runtime && !!chrome.runtime.id; }
    catch (_) { return false; }
  }

  function markContextDead() {
    if (_contextDead) return;
    _contextDead = true;
    if (_observer) { _observer.disconnect(); _observer = null; }
  }

  const safeSendMessage = (msg) => {
    if (_contextDead) return;
    if (!isContextAlive()) { markContextDead(); return; }
    try {
      chrome.runtime.sendMessage(msg).catch(() => { markContextDead(); });
    } catch (_) { markContextDead(); }
  };

  window.addEventListener('pagehide', markContextDead, { once: true });

  function isOnJobsPage() {
    return /^\/jobs(\/|$)/.test(location.pathname);
  }

  let _lastStatsKey = '';
  let _selectorFailedLoggedFor = '';
  function scanAndApply() {
    if (_contextDead) return;
    if (!currentConfig) return;
    if (!isOnJobsPage()) return;

    const { cards, selectorFailed, listContainer } = selectors.scanCards();

    if (selectorFailed) {
      if (_selectorFailedLoggedFor !== location.pathname) {
        _selectorFailedLoggedFor = location.pathname;
        console.log('[JSF] 找到了卡片但公司名一个都取不到 —— 首张卡片诊断:');
        const first = cards[0];
        if (first && first.matchAnchor) {
          const el = first.matchAnchor;
          console.log({
            tagName: el.tagName,
            componentkey: el.getAttribute('componentkey'),
            allP: [...el.querySelectorAll('p')].map((p) => p.innerText.trim().slice(0, 80)),
            innerTextHead: (el.innerText || '').trim().slice(0, 300),
          });
        }
      }
      safeSendMessage({ type: 'jsf:selectorFailed' });
    }
    let blockedCount = 0;
    for (const info of cards) {
      applyCardDecision(info.cardRoot, info);
      if (info.cardRoot.classList.contains('jsf-blocked')) blockedCount++;
    }

    const statsKey = `${cards.length}|${blockedCount}`;
    if (statsKey !== _lastStatsKey) {
      _lastStatsKey = statsKey;
      const summary = cards.map((c) => {
        const v = matcher.judge(c.company, currentConfig);
        return `${v.blocked ? '[X]' : '[ ]'} ${c.company || '(no-company)'}${v.matched ? ` <-${v.matched}` : ''}`;
      });
      console.log(`[JSF] scan: ${cards.length} cards, ${blockedCount} blocked, listContainer=${!!listContainer}`);
      console.log('[JSF] cards:', summary);
    }

    safeSendMessage({ type: 'jsf:stats', blockedCount, totalCards: cards.length });
  }

  let rafPending = false;
  function scheduleScan() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      scanAndApply();
    });
  }

  function startObserver() {
    _observer = new MutationObserver(scheduleScan);
    _observer.observe(document.body, { childList: true, subtree: true });
    scheduleScan();
    const wrap = (name) => {
      const orig = history[name];
      history[name] = function () {
        const r = orig.apply(this, arguments);
        setTimeout(scheduleScan, 100);
        return r;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => setTimeout(scheduleScan, 100));
  }

  function purgeAllJsfState() {
    document.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => el.removeAttribute(MARK_ATTR));
    document.querySelectorAll('.jsf-blocked').forEach((el) => el.classList.remove('jsf-blocked'));
    document.querySelectorAll('.jsf-revealed').forEach((el) => el.classList.remove('jsf-revealed'));
    document.querySelectorAll('.jsf-overlay').forEach((el) => el.remove());
    document.querySelectorAll('.jsf-quick-block').forEach((el) => el.remove());
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'jsf:setShowAll') {
      showAllOverride = !!msg.value;
      console.log('[JSF] setShowAll =', showAllOverride);
      purgeAllJsfState();
      scheduleScan();
      sendResponse({ ok: true });
      return true;
    }
    if (msg && msg.type === 'jsf:ping') {
      let matchedCount = 0;
      let selectorFailed = false;
      if (isOnJobsPage() && currentConfig) {
        const r = selectors.scanCards();
        selectorFailed = r.selectorFailed;
        for (const c of r.cards) {
          if (matcher.judge(c.company, currentConfig).blocked) matchedCount++;
        }
      }
      sendResponse({ ok: true, showAllOverride, matchedCount, selectorFailed });
      return true;
    }
  });

  (async () => {
    console.log('[JSF] content script loaded on', location.href);
    currentConfig = await storage.load();
    console.log('[JSF] config loaded, blacklist:', currentConfig.blacklist, 'keywordsEnabled:', currentConfig.keywordsEnabled);
    storage.onChange((newCfg) => {
      currentConfig = newCfg;
      purgeAllJsfState();
      scheduleScan();
    });
    startObserver();
  })();
})();
