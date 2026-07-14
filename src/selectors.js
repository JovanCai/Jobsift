// Job Feed Filter —— DOM 定位（基于 v5 探测结论，2026-07-14）
//
// 稳定锚点（不用 class，class 全是编译期哈希）：
//   1. 列表容器 = [data-component-type="LazyColumn"] 中，含 dismiss 按钮的那个
//   2. 卡片锚点 = 每张卡片右上角的 dismiss 按钮（aria-label 前缀国际化）
//   3. 卡片根 = dismiss 按钮向上爬到「刚好包 1 个 dismiss 按钮」的最大祖先
//   4. 卡片信息：
//        - 职位标题：dismiss 按钮的 aria-label "Dismiss <title> job" 里正则提取
//        - 公司名 & 地点：卡片内的 <p> 标签，textContent 顺序为 [公司名, 地点, ...]

(function (root) {
  // Dismiss 按钮 aria-label 前缀，多语言兼容
  // 探测新语言时加进来（英文已确认，日文/中文需实测补充）
  const DISMISS_PATTERNS = [
    { prefix: 'Dismiss ',  suffix: ' job' },
    { prefix: '非表示 ',    suffix: '' },      // 日文，试探
    { prefix: '忽略 ',      suffix: ' 职位' },  // 中文，试探
  ];

  function findListContainer() {
    const cols = [...document.querySelectorAll('[data-component-type="LazyColumn"]')];
    // 挑：含 dismiss 按钮 + 可滚动
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

  // 卡片根定位。优先用 componentkey（LinkedIn 语义化属性，jobId 就在里面），
  // 兜底再用「刚好包 1 个 dismiss 按钮的最大祖先」逻辑。
  function findCardRoot(dismissBtn, listContainer) {
    // 首选：最近的 componentkey 祖先（componentkey="job-card-component-ref-{jobId}"）
    const byComponentKey = dismissBtn.closest('[componentkey^="job-card-component-ref-"]');
    if (byComponentKey && listContainer.contains(byComponentKey)) return byComponentKey;

    // 次选：最近的 role="button" 祖先（每张卡片本身是 role="button"）
    const byRole = dismissBtn.closest('[role="button"]');
    if (byRole && listContainer.contains(byRole) && byRole !== dismissBtn) return byRole;

    // 兜底：向上爬到「刚好包 1 个 dismiss 按钮的最大祖先」
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

  // 从「匹配锚点」向上找「视觉卡片外框」：LinkedIn 卡片外层有多层 display:contents
  // 的包装（尺寸为 0），我们要找那个真正带 border/background 的可视容器
  function findVisualCard(anchor, listContainer) {
    let n = anchor;
    let best = anchor;
    while (n && n.parentElement && n !== listContainer) {
      const r = n.getBoundingClientRect();
      // 有实际尺寸 = 不是 display:contents，且高度 > 一个按钮的高度
      if (r.width > 100 && r.height > 40) {
        best = n;
      }
      // 一旦父元素包含 > 1 张卡片（多个 dismiss 按钮），停止
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

  // 卡片内提取公司名。
  // 结构约定（真实 LinkedIn 卡片验证）：
  //   标题 P            → 内含 <span>，跳过
  //   公司名 P          → 纯文本 P，是我们要的第一个
  //   地点 P            → 纯文本 P，公司名之后
  //   "Actively..." P   → 内含 <span>
  //   时间戳 P          → 内含 <span>
  //   Easy Apply P      → 内含 <span> + <svg>
  //   "·" 分隔 P        → 纯文本 "·"
  function extractCompanyName(cardRoot) {
    const ps = [...cardRoot.querySelectorAll('p')];
    for (const p of ps) {
      // 跳过含子元素的 P（标题 / Actively / 时间戳 / Easy Apply 都有 span）
      if (p.children.length > 0) continue;
      const txt = (p.innerText || p.textContent || '').trim();
      if (!txt || txt === '·') continue;
      return txt;
    }
    return null;
  }

  // 提取所有可见卡片信息
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
        cardRoot: visualCard,       // 用于加 class / 加 overlay 的视觉容器
        matchAnchor: card,          // 用于提取信息的匹配锚点
        dismissButton: btn,
        jobId: extractJobId(card),
        title: extractJobTitle(btn.getAttribute('aria-label')),
        company: extractCompanyName(card),
      });
    }

    return {
      listContainer: listCol,
      cards,
      // 自检：找到卡片但一个公司名都取不到 → 选择器可能已失效
      selectorFailed: cards.length > 0 && cards.every((c) => !c.company),
    };
  }

  root.__LRB = root.__LRB || {};
  root.__LRB.selectors = {
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
