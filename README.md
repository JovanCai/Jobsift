# Job Feed Filter

A Chrome extension that lets you hide companies you don't want to see from your job search results.

Works on LinkedIn Jobs. Runs entirely in your browser — no data leaves your machine.

<p align="center">
  <img src="icons/icon128.png" width="96" alt="Job Feed Filter icon">
</p>

## Features

- **Hide list** — add company names you don't want to see. Matching is case-insensitive and ignores legal-form suffixes (`Inc.`, `Ltd.`, `株式会社`, etc.).
- **Keyword rules** (opt-in) — hide any company whose name contains a keyword. Off by default; enable it from the settings page.
- **Always-show list** — whitelist takes priority over everything, so companies caught by a keyword by mistake can be rescued in one click.
- **One-click hide** on any job card. The full card collapses to a slim gray bar so you can undo or peek if the extension over-matched.
- **Temporary reveal** per tab, from the toolbar popup.
- **Local only** — settings are stored via `chrome.storage.sync` and travel with your Chrome profile. Nothing is sent to any server.

## Install (development)

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this repo's root directory
4. Open LinkedIn Jobs, refresh, and you're ready

## How it works

The extension is Manifest V3, plain JavaScript, no build step, no dependencies.

- `src/matcher.js` — pure judgment function (`company name → { blocked, reason, matched }`). Fully unit-testable, runs in Node.
- `src/selectors.js` — locates job cards in the Jobs list. Uses structural anchors (`data-component-type="LazyColumn"`, `aria-label` prefixes, `componentkey` attributes) rather than obfuscated class names, so it survives most cosmetic redesigns.
- `src/content.js` — page injector. `MutationObserver` + `requestAnimationFrame` throttle; handles virtual-scrolled cards (LinkedIn Jobs reuses DOM nodes across different postings).
- `src/storage.js` — `chrome.storage.sync` wrapper with a default config and a small change API.
- `src/i18n.js` — tiny helper that reads `_locales/{lang}/messages.json` and swaps text on `data-i18n` attributes.

## Localization

Ships with English, Simplified Chinese, and Japanese. Chrome picks the locale from the browser UI language automatically.

To add a language, copy `_locales/en/messages.json` to `_locales/<lang>/messages.json` and translate the `message` values.

## Testing

Matcher tests use Node's built-in test runner — no dependencies:

```bash
node --test test/
```

## Rebuilding icons

```bash
python3 tools/make-icons.py
```

Requires Pillow (`pip install pillow`).

## DOM structure recon

When the underlying page structure changes, the fastest way to update `selectors.js` is to run `tools/dump-dom.js` in the DevTools console on the target page. It downloads a JSON summary of the current DOM (which anchors exist, where the LazyColumn is, what buttons and `aria-label`s are present).

## License

MIT. See `LICENSE`.

## Not affiliated

This extension is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation. LinkedIn is a registered trademark of LinkedIn Corporation.
