# Job Feed Filter

[简体中文](README.zh-CN.md)

A Chrome extension that hides companies from your LinkedIn Jobs search results.

Manifest V3. No build step. No dependencies. Local only — settings sync via `chrome.storage.sync`, nothing else leaves the browser.

<p align="center">
  <img src="icons/icon128.png" width="96" alt="icon">
</p>

## Install

```
git clone https://github.com/JovanCai/jobsift.git
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
