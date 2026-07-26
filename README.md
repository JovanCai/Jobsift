# Job Feed Filter

A Chrome extension that hides companies from your LinkedIn Jobs search results.

Manifest V3. No build step. No dependencies. Local only — settings sync via `chrome.storage.sync`, nothing else leaves the browser.

<p align="center">
  <img src="icons/icon128.png" width="96" alt="icon">
</p>

## Install

```
git clone https://github.com/JovanCai/job-feed-filter.git
```

In Chrome:

1. `chrome://extensions/`
2. Enable **Developer mode**
3. **Load unpacked** → pick the cloned directory

Open LinkedIn Jobs and refresh.

## Usage

- **Hide list** — company names. Case-insensitive, ignores legal-form suffixes (`Inc.`, `Ltd.`, `株式会社`, …).
- **Keywords** (opt-in, off by default) — hides any company whose name contains a keyword.
- **Always show** — whitelist. Highest priority; overrides both above.

Hover a job card → click ⊘ to hide that company. Blocked cards collapse to a slim gray bar with **Show** and **Always show this** shortcuts. Toolbar popup has a per-tab **Show all** toggle for temporary reveal.

## How it works

- `src/matcher.js` — pure judgment. `name → { blocked, reason, matched }`. Runs in Node: `node --test test/`.
- `src/selectors.js` — DOM anchors. LinkedIn's class names are minified per build, so instead: `data-component-type="LazyColumn"`, the dismiss button's `aria-label` prefix, and `componentkey^="job-card-component-ref-"` (jobId is in the value).
- `src/content.js` — `MutationObserver` + `requestAnimationFrame` throttle. Handles virtual-scrolled cards (LinkedIn reuses the same DOM node across different postings).
- `src/storage.js` — `chrome.storage.sync` wrapper.
- `src/i18n.js` — reads `_locales/{lang}/messages.json`; swaps text on `data-i18n` attributes.

Localized in English, Simplified Chinese, and Japanese. Chrome picks locale from the browser UI language.

## Development

```
node --test test/                # matcher tests
python3 tools/make-icons.py      # regen PNGs (needs Pillow)
```

`tools/dump-dom.js` — paste in the LinkedIn Jobs DevTools console when selectors break. Prints a structural summary and downloads a JSON dump for offline analysis.

## License

MIT. See `LICENSE`.

Not affiliated with LinkedIn Corporation. LinkedIn is a trademark of LinkedIn Corporation.

---

# Job Feed Filter · 简体中文

一个 Chrome 扩展，在 LinkedIn 求人搜索结果里屏蔽你不想看的公司。

Manifest V3，无构建、无依赖。全程本地，配置通过 `chrome.storage.sync` 跨设备同步，不上传任何数据。

## 安装

```
git clone https://github.com/JovanCai/job-feed-filter.git
```

Chrome 里：

1. `chrome://extensions/`
2. 打开**开发者模式**
3. **加载已解压的扩展程序** → 选刚 clone 的目录

打开 LinkedIn Jobs 刷新即可。

## 用法

- **隐藏名单** — 公司名。大小写不敏感，忽略法人格式（`Inc.`、`Ltd.`、`株式会社` 等）。
- **关键词**（默认关闭） — 公司名含任一关键词即隐藏。
- **总是显示** — 白名单，最高优先级，压过前两项。

hover 求人卡片 → 点右上角的 ⊘ 即屏蔽这家公司。被屏蔽的卡片折叠成一行灰条，附带**显示**和**总是显示这家**两个按钮。工具栏 popup 里的**暂时全部显示**开关按 tab 生效，用来临时展开所有被屏的卡片。

## 原理

- `src/matcher.js` — 纯判定函数。`名字 → { blocked, reason, matched }`。Node 里就能跑：`node --test test/`。
- `src/selectors.js` — DOM 锚点。LinkedIn 的 class 名每次构建都变（编译期哈希），所以改用：`data-component-type="LazyColumn"`、dismiss 按钮的 `aria-label` 前缀、`componentkey^="job-card-component-ref-"`（jobId 就在值里）。
- `src/content.js` — `MutationObserver` + `requestAnimationFrame` 节流。处理虚拟滚动的 DOM 节点复用（同一个节点会承担不同职位）。
- `src/storage.js` — `chrome.storage.sync` 封装。
- `src/i18n.js` — 读 `_locales/{lang}/messages.json`，替换 `data-i18n` 属性上的文本。

已本地化英文、简体中文、日文。Chrome 按浏览器 UI 语言自动选。

## 开发

```
node --test test/                # matcher 单元测试
python3 tools/make-icons.py      # 重新生成图标（需要 Pillow）
```

`tools/dump-dom.js` — LinkedIn 改版把选择器搞坏时，在 Jobs 页 DevTools console 粘贴运行。会打印结构摘要，同时下载一份 JSON dump 供离线分析。

## 协议

MIT，见 `LICENSE`。

本项目与 LinkedIn Corporation 无关联。LinkedIn 是 LinkedIn Corporation 的商标。
