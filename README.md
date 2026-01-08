# Download-Name Fixer for Sanity

Automatically rename new downloads using the source domain, page title, and date:
`{domain}_{title}_{YYYY-MM-DD}.{ext}`.

## Install

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open **Details** for the extension and click **Extension options**.

## Permissions

- `downloads`: rename downloads with `chrome.downloads.setFilename`.
- `storage`: persist settings in `chrome.storage`.
- `tabs`: read tab URL/title for download context.

## Notes

- No file contents are modified. Only filenames are changed.
- Settings are stored locally in the browser.

## Testing Plan (Manual)

- Download a PDF from a normal web page.
- Download an image by direct link.
- Download from a site with a long title.
- Trigger multiple downloads on the same day to verify uniquify behavior.
- Toggle the extension off and confirm downloads are not renamed.
