// Job Feed Filter —— DOM 定位（基于 v5 探测结论，2026-07-14）
//
// 稳定锚点（不用 class，class 全是编译期哈希）：
//   1. 列表容器 = [data-component-type="LazyColumn"] 中，含 dismiss 按钮的那个
//   2. 卡片锚点 = 每张卡片右上角的 dismiss 按钮（aria-label 前缀国际化）
//   3. 卡片根 = dismiss 按钮向上爬到「刚好包 1 个 dismiss 按钮」的最大祖先
//   4. 卡片信息:
//        - 职位标题:dismiss 按钮的 aria-label "Dismiss <title> job" 里正则提取
//        - 公司名 & 地点:卡片内的 <p> 标签,textContent 顺序为 [公司名, 地点, ...]

(function (root) {
  // Dismiss 按钮 aria-label 前缀,多语言兼容
  // 探测新语言时加进来(英文已确认,日文/中文需实测补充)
  const DISMISS_PATTERNS = [
    { prefix: 'Dismiss ',  suffix: ' job' },
    { prefix: '非表示 ',    suffix: '' },      // 日文,试探
    { prefix: '忽略 ',      suffix: ' 职位' },  // 中文,试探
  ];

  function findListContainer() {
    const cols = [...document.querySelectorAll('[data-component-type="LazyColumn"]')];
    for (const lc of cols) {
      if (findDismissButtons(lc).length > 0) return lc;
    }
    return null;
  }

  function findDismissButtons(root) {
    const all = [...root.querySelectorAll('button[aria-label]')];
    return all.filter((b) => matchDismissLabel(b.getAttribute('aria-label') || ''));
  }

  function matchDismissLabel(label) {
    for (const p of DISMISS_PATTERNS) {
      if (label.startsWith(p.prefix) && (p.suffix === '' || label.endsWith(p.suffix))) {
        return p;
      }
    }
    return null;
  }

  function extractJobTitle(label) {
    const p = matchDismissLabel(label);
    if (!p) return null;
    return label.slice(p.prefix.length, label.length - p.suffix.length).trim();
  }

  function findCardRoot(dismissBtn, listContainer) {
    const byComponentKey = dismissBtn.closest('[componentkey^="job-card-component-ref-"]');
    if (byComponentKey && listContainer.contains(byComponentKey)) return byComponentKey;

    const byRole = dismissBtn.closest('[role="button"]');
    if (byRole && listContainer.contains(byRole) && byRole !== dismissBtn) return byRole;

    let best = dismissBtn;
    let n = dismissBtn;
    while (n.parentElement && n.parentElement !== listContainer) {
      const parent = n.parentElement;
      if (findDismissButtons(parent).length > 1) break;
      best = parent;
      n = parent;
    }
    return best;
  }

  function findVisualCard(anchor, listContainer) {
    let n = anchor;
    let best = anchor;
    while (n && n.parentElement && n !== listContainer) {
      const r = n.getBoundingClientRect();
      if (r.width > 100 && r.height > 40) {
        best = n;
      }
      if (findDismissButtons(n.parentElement).length > 1) break;
      n = n.parentElement;
    }
    return best;
  }

  function extractJobId(cardRoot) {
    const el = cardRoot.hasAttribute('componentkey')
      ? cardRoot
      : cardRoot.querySelector('[componentkey^="job-card-component-ref-"]');
    if (!el) return null;
    const m = (el.getAttribute('componentkey') || '').match(/job-card-component-ref-(\d+)/);
    return m ? m[1] : null;
  }

  function extractCompanyName(cardRoot) {
    const ps = [...cardRoot.querySelectorAll('p')];
    for (const p of ps) {
      if (p.children.length > 0) continue;
      const txt = (p.innerText || p.textContent || '').trim();
      if (!txt || txt === '·') continue;
      return txt;
    }
    return null;
  }

  function scanCards() {
    const listCol = findListContainer();
    if (!listCol) return { listContainer: null, cards: [], selectorFailed: true };

    const btns = findDismissButtons(listCol);
    const cards = [];
    const seen = new WeakSet();

    for (const btn of btns) {
      const card = findCardRoot(btn, listCol);
      if (seen.has(card)) continue;
      seen.add(card);
      const visualCard = findVisualCard(card, listCol);
      cards.push({
        cardRoot: visualCard,
        matchAnchor: card,
        dismissButton: btn,
        jobId: extractJobId(card),
        title: extractJobTitle(btn.getAttribute('aria-label')),
        company: extractCompanyName(card),
      });
    }

    return {
      listContainer: listCol,
      cards,
      selectorFailed: cards.length > 0 && cards.every((c) => !c.company),
    };
  }

  root.__JSF = root.__JSF || {};
  root.__JSF.selectors = {
    findListContainer,
    findDismissButtons,
    extractJobTitle,
    extractJobId,
    extractCompanyName,
    findCardRoot,
    scanCards,
    DISMISS_PATTERNS,
  };
})(typeof self !== 'undefined' ? self : this);
