// Job Feed Filter —— 页面注入主脚本

(function () {
  const { matcher, storage, selectors, i18n } = self.__LRB;
  const t = i18n.t;

  let currentConfig = null;
  let sessionRevealed = new Set();     // 用户临时点了 "看一眼" 的 jobId
  let showAllOverride = false;         // popup 里的 "暂时全部显示" 开关

  // 每张卡片处理后打的标记（值 = 处理时用的公司名，公司名变了要重新处理）
  const MARK_ATTR = 'data-lrb-processed';
  const HIDE_ATTR = 'data-lrb-hidden';
  const CARD_ID_ATTR = 'data-lrb-card-id';

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
    cardRoot.querySelectorAll('.lrb-overlay').forEach((n) => n.remove());
    cardRoot.querySelectorAll('.lrb-quick-block').forEach((n) => n.remove());
    cardRoot.classList.remove('lrb-blocked', 'lrb-revealed');

    if (!info.company) return; // 没提取到公司名 → 不动它

    const verdict = matcher.judge(info.company, currentConfig);

    if (!verdict.blocked || showAllOverride || sessionRevealed.has(id)) {
      injectQuickBlockButton(cardRoot, info);
      if (verdict.blocked) cardRoot.classList.add('lrb-revealed');
      return;
    }

    // 屏蔽：折叠为一行灰条
    cardRoot.classList.add('lrb-blocked');
    const overlay = document.createElement('div');
    overlay.className = 'lrb-overlay';
    overlay.innerHTML = `
      <span class="lrb-overlay-label">
        <span class="lrb-overlay-icon">⊘</span>
        <span class="lrb-overlay-blocked-text"></span>
        <strong></strong>
        <span class="lrb-overlay-reason"></span>
      </span>
      <span class="lrb-overlay-actions">
        <button type="button" class="lrb-btn lrb-peek"></button>
        <button type="button" class="lrb-btn lrb-whitelist"></button>
      </span>
    `;
    overlay.querySelector('.lrb-overlay-blocked-text').textContent = t('overlay_blocked');
    overlay.querySelector('strong').textContent = info.company;
    overlay.querySelector('.lrb-overlay-reason').textContent =
      verdict.reason === 'blacklist'
        ? `· ${t('overlay_reason_blacklist')}`
        : verdict.reason === 'keyword'
        ? `· ${t('overlay_reason_keyword', [verdict.matched])}`
        : '';
    overlay.querySelector('.lrb-peek').textContent = t('overlay_peek');
    overlay.querySelector('.lrb-whitelist').textContent = t('overlay_whitelist');
    overlay.querySelector('.lrb-peek').addEventListener('click', (e) => {
      e.stopPropagation();
      sessionRevealed.add(id);
      applyCardDecision(cardRoot, info);
    });
    overlay.querySelector('.lrb-whitelist').addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await storage.addTo('whitelist', info.company); }
      catch (err) { markContextDead(); }
    });
    cardRoot.prepend(overlay);
  }

  function injectQuickBlockButton(cardRoot, info) {
    // 不做「已存在则跳过」检查 —— 每次都重建，确保 click handler 里的 info 是最新的
    cardRoot.querySelectorAll('.lrb-quick-block').forEach((n) => n.remove());
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lrb-quick-block';
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

  // context 是否还活着：chrome.runtime.id 在 context 失效后是 undefined，
  // 提前用它探测，避免等 sendMessage 抛异常（异常会被 Chrome 记录到扩展错误页）
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
      // .catch(() => {}) 静默吞掉 rejection，避免任何 warn/error 传播
      chrome.runtime.sendMessage(msg).catch(() => { markContextDead(); });
    } catch (_) { markContextDead(); }
  };

  // 页面卸载时主动清理（浏览器刷新 / 关闭 tab / SPA 硬跳转）
  window.addEventListener('pagehide', markContextDead, { once: true });

  // LinkedIn 是 SPA：一次注入后，用户 SPA 导航到 /mynetwork/、/feed/ 等页面时
  // content script 还在跑，别的页面也有 LazyColumn 但不是求人卡片。
  // 仅在求人页面处理，其他页面完全跳过。
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
      // 同一个 URL 只打一次诊断，避免 MutationObserver 循环刷屏
      if (_selectorFailedLoggedFor !== location.pathname) {
        _selectorFailedLoggedFor = location.pathname;
        // 用 log（非 warn / error），Chrome 扩展错误页不会收集
        console.log('[LRB] 找到了卡片但公司名一个都取不到 —— 首张卡片诊断:');
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
      safeSendMessage({ type: 'lrb:selectorFailed' });
    }
    let blockedCount = 0;
    for (const info of cards) {
      applyCardDecision(info.cardRoot, info);
      if (info.cardRoot.classList.contains('lrb-blocked')) blockedCount++;
    }

    // 状态变化时打印一次简短日志
    const statsKey = `${cards.length}|${blockedCount}`;
    if (statsKey !== _lastStatsKey) {
      _lastStatsKey = statsKey;
      const summary = cards.map((c) => {
        const v = matcher.judge(c.company, currentConfig);
        return `${v.blocked ? '[X]' : '[ ]'} ${c.company || '(no-company)'}${v.matched ? ` <-${v.matched}` : ''}`;
      });
      console.log(`[LRB] scan: ${cards.length} cards, ${blockedCount} blocked, listContainer=${!!listContainer}`);
      console.log('[LRB] cards:', summary);
    }

    safeSendMessage({ type: 'lrb:stats', blockedCount, totalCards: cards.length });
  }

  // ---- MutationObserver + rAF 节流 ----
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
    // 首次扫描
    scheduleScan();
    // URL 变化（SPA 换搜索词 / 翻页）
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

  // ---- popup 通信 ----
  function purgeAllLrbState() {
    document.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => el.removeAttribute(MARK_ATTR));
    document.querySelectorAll('.lrb-blocked').forEach((el) => el.classList.remove('lrb-blocked'));
    document.querySelectorAll('.lrb-revealed').forEach((el) => el.classList.remove('lrb-revealed'));
    document.querySelectorAll('.lrb-overlay').forEach((el) => el.remove());
    document.querySelectorAll('.lrb-quick-block').forEach((el) => el.remove());
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'lrb:setShowAll') {
      showAllOverride = !!msg.value;
      console.log('[LRB] setShowAll =', showAllOverride);
      purgeAllLrbState();
      scheduleScan();
      sendResponse({ ok: true });
      return true;
    }
    if (msg && msg.type === 'lrb:ping') {
      // 实时扫一次，返回真实统计（不依赖上一次 badge，避免切 tab 后不同步）
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

  // ---- 启动 ----
  (async () => {
    console.log('[LRB] content script loaded on', location.href);
    currentConfig = await storage.load();
    console.log('[LRB] config loaded, blacklist:', currentConfig.blacklist, 'keywordsEnabled:', currentConfig.keywordsEnabled);
    storage.onChange((newCfg) => {
      currentConfig = newCfg;
      purgeAllLrbState();
      scheduleScan();
    });
    startObserver();
  })();
})();
