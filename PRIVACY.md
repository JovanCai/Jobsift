# Privacy Policy — Job Feed Filter

_Last updated: 2026-07-27_

Job Feed Filter is a Chrome extension that hides companies from LinkedIn Jobs search results.

## Data collected

**None.** The extension does not collect, transmit, or share any personal or usage data.

## Data stored

Your hide list, keyword rules, and whitelist are stored using Chrome's built-in `chrome.storage.sync` API. This data:

- Remains on your device
- Syncs across your own Chrome installations via your Google account, if Chrome sync is enabled
- Is never sent to the extension author or any third party

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Persist your hide list / keyword rules / whitelist across sessions and devices |
| Host `*://*.linkedin.com/jobs/*` | Read and modify the display of LinkedIn Jobs search result pages (hide job cards from companies you listed). Restricted to `/jobs/*`; no other pages are touched. |

## Remote code

None. All code runs locally from the extension package. No dynamic code loading.

## Third-party services

None.

## Analytics / tracking

None.

## Contact

File an issue at <https://github.com/JovanCai/jobsift/issues>
