/**
 * LinkedIn Jobs DOM 结构探测脚本 v5
 *
 * 已确认（截图观察 + v1-v4 数据）：
 *   - class 全是编译期哈希
 *   - 卡片不是 <a>，标题是纯 div/span + 点击改 URL query string（currentJobId）
 *   - 每张卡片右上角有 ✕ dismiss 按钮 —— 这是 LinkedIn 自带屏蔽，且每张卡片必有一个
 *   - 卡片文本行：标题 / 公司名 / 地点 / 状态 / 时间戳 / 应聘标签
 *   - 公司名与地点是分开两行，不是 v2 那个 "公司 • 地点" 格式
 *
 * v5 用 ✕ dismiss 按钮作卡片锚点。这个按钮：
 *   - 每张列表卡片必有
 *   - 详情面板没有（详情面板另有一个 dismiss，但形态不同）
 *   - aria-label 是国际化的，需要探测实际值
 *
 * 用法：
 *   1. LinkedIn 搜 backend engineer + 东京
 *   2. F12 → Console → 粘贴 → 回车
 *   3. 立刻按 F12 关掉 DevTools
 *   4. 什么都别动，等 6 秒
 */
(() => {
  console.log('⏳ 6 秒后开始采集 —— 请立刻按 F12 关掉 DevTools');

  setTimeout(() => {
    const dataAttrsOf = (el) =>
      Object.fromEntries(
        [...el.attributes]
          .filter((a) => a.name.startsWith('data-'))
          .map((a) => [a.name, a.value])
      );

    // ---- 1. 所有 button 的 aria-label 分布：找到 dismiss 按钮 ----
    const buttons = [...document.querySelectorAll('button')];
    const buttonLabels = {};
    for (const b of buttons) {
      const label = b.getAttribute('aria-label') || '(none)';
      if (!buttonLabels[label]) buttonLabels[label] = { count: 0, samples: [] };
      buttonLabels[label].count++;
      if (buttonLabels[label].samples.length < 2) {
        buttonLabels[label].samples.push({
          text: b.innerText.trim().slice(0, 40),
          bbox: (() => {
            const r = b.getBoundingClientRect();
            return { w: Math.round(r.width), h: Math.round(r.height) };
          })(),
        });
      }
    }
    const buttonLabelStats = Object.entries(buttonLabels)
      .map(([label, s]) => ({ label, count: s.count, samples: s.samples }))
      .sort((a, b) => b.count - a.count);

    // ---- 2. 定位 LazyColumn，遍历它里面的所有 button ----
    // LazyColumn 有多个（3 个），列表那一个的特征：内部按钮最多、高度可滚动
    const lazyColumns = [...document.querySelectorAll('[data-component-type="LazyColumn"]')];
    const lazyColStats = lazyColumns.map((lc, i) => {
      const rect = lc.getBoundingClientRect();
      return {
        index: i,
        bbox: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        clientHeight: lc.clientHeight,
        scrollHeight: lc.scrollHeight,
        scrollable: lc.scrollHeight > lc.clientHeight + 10,
        buttonCount: lc.querySelectorAll('button').length,
        // 内部 aria-label 分布
        buttonLabels: (() => {
          const map = {};
          for (const b of lc.querySelectorAll('button')) {
            const l = b.getAttribute('aria-label') || '(none)';
            map[l] = (map[l] || 0) + 1;
          }
          return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([l, n]) => ({ label: l, n }));
        })(),
      };
    });

    // 选择"列表 LazyColumn"：可滚动 + 按钮最多的那个
    const listLazyCol = lazyColumns
      .filter((lc) => lc.scrollHeight > lc.clientHeight + 10)
      .sort((a, b) => b.querySelectorAll('button').length - a.querySelectorAll('button').length)[0]
      || lazyColumns[0];

    // ---- 3. 在列表 LazyColumn 里，找重复出现最多的 aria-label ----
    // 卡片级操作按钮（dismiss / save）必然每张卡片都有一个，count 会等于可见卡片数
    let cardRoots = [];
    let cardSamples = [];
    if (listLazyCol) {
      const inListButtons = [...listLazyCol.querySelectorAll('button')];
      const labelCounts = {};
      for (const b of inListButtons) {
        const l = b.getAttribute('aria-label') || '';
        if (!l) continue;
        labelCounts[l] = (labelCounts[l] || 0) + 1;
      }
      // 按 count 分组，重复次数最多的多个 label 都可能是卡片级按钮
      const topLabels = Object.entries(labelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // 选取尺寸最小（≈ 20-40px 的图标按钮，多半是 ✕ dismiss）且 count ≥ 2 的 label
      let anchorLabel = null;
      for (const [label, count] of topLabels) {
        if (count < 2) continue;
        const btn = inListButtons.find((b) => b.getAttribute('aria-label') === label);
        if (!btn) continue;
        const r = btn.getBoundingClientRect();
        if (r.width > 0 && r.width < 50 && r.height > 0 && r.height < 50) {
          anchorLabel = label;
          break;
        }
      }

      // 找到锚点按钮后，每个按钮向上爬到「其祖先内的锚点按钮数从 1 变为 2」的那一层的上一层
      // 也就是找到「刚好包住 1 个锚点按钮」的最大祖先
      if (anchorLabel) {
        const anchorBtns = inListButtons.filter(
          (b) => b.getAttribute('aria-label') === anchorLabel
        );
        for (const btn of anchorBtns) {
          let n = btn;
          let best = btn;
          while (n && n.parentElement && n !== listLazyCol) {
            const parent = n.parentElement;
            const cntSafe = [...parent.querySelectorAll('button')].filter(
              (b) => b.getAttribute('aria-label') === anchorLabel
            ).length;
            if (cntSafe > 1) break;
            best = parent;
            n = parent;
          }
          cardRoots.push(best);
        }

        cardSamples = cardRoots.slice(0, 5).map((card, i) => {
          const textLines = (card.innerText || '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          const rect = card.getBoundingClientRect();
          return {
            index: i,
            tagName: card.tagName,
            dataAttrs: dataAttrsOf(card),
            childCount: card.children.length,
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            textLines,
            leafNodes: [...card.querySelectorAll('*')]
              .filter((el) => {
                if (el.children.length > 0) return false;
                const t = (el.innerText || el.textContent || '').trim();
                return t.length > 0 && t.length < 200;
              })
              .map((el) => {
                const path = [];
                let n = el;
                while (n && n !== card) {
                  const idx = n.parentElement
                    ? [...n.parentElement.children].indexOf(n) + 1
                    : 0;
                  path.unshift(`${n.tagName.toLowerCase()}:nth-child(${idx})`);
                  n = n.parentElement;
                }
                return {
                  text: (el.innerText || el.textContent).trim().slice(0, 100),
                  tagName: el.tagName,
                  path: path.join(' > '),
                  dataAttrs: dataAttrsOf(el),
                  ariaLabel: el.getAttribute && el.getAttribute('aria-label'),
                  href: el.getAttribute && el.getAttribute('href'),
                  role: el.getAttribute && el.getAttribute('role'),
                };
              }),
            outerHTML: i < 2 ? card.outerHTML : undefined,
          };
        });
      }
    }

    // ---- 4. 详情面板 ----
    const detailScreen = document.querySelector('[data-sdui-screen]');
    const detailInfo = detailScreen
      ? {
          screen: detailScreen.getAttribute('data-sdui-screen'),
          textLines: (detailScreen.innerText || '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 25),
          companyLinks: [...detailScreen.querySelectorAll('a[href*="/company/"]')].map((a) => ({
            href: a.getAttribute('href'),
            text: a.innerText.trim().slice(0, 60),
          })),
        }
      : null;

    const dump = {
      version: 5,
      capturedAt: new Date().toISOString(),
      url: location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      counts: {
        totalElements: document.querySelectorAll('*').length,
        totalButtons: buttons.length,
        totalLazyColumns: lazyColumns.length,
      },
      buttonLabelStats: buttonLabelStats.slice(0, 30),
      lazyColStats,
      cardRoots: cardRoots.length,
      cardSamples,
      detailInfo,
    };

    console.log('=== LRB DOM DUMP v5 ===');
    console.log('viewport:', window.innerWidth, 'x', window.innerHeight);
    console.log('识别到的卡片数:', cardRoots.length);
    if (cardSamples.length) {
      console.log('首张卡片文本:', cardSamples[0].textLines);
    }
    console.log(dump);

    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lrb-dom-dump.json';
    a.click();
    URL.revokeObjectURL(a.href);

    console.log('✅ 已下载 lrb-dom-dump.json');
  }, 6000);
})();
