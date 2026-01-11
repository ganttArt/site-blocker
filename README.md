# Site Blocker

A privacy-first browser extension that blocks selected websites and redirects users to a full-page block screen. Built with Manifest V3 for modern browsers.

## Features

- **Full-Page Blocking**: Redirects blocked sites to a custom HTML page instead of using popups
- **Domain & Path Blocking**: Block entire domains (`facebook.com`) or specific paths (`amazon.com/gp/video`)
- **Temporary Unblock**: Allow access to blocked sites for 2 hours or until you leave the site
- **Smart URL Preservation**: Temp unblock redirects to the exact page you tried to visit (with all query parameters)
- **SPA Detection**: Automatically re-blocks when navigating within single-page apps after temp unblock expires
- **Tab Enforcement**: Immediately re-blocks across all tabs when temp unblock is removed
- **Privacy-First**: No backend, no analytics, all data stored locally
- **Browser-Enforced**: Uses native `declarativeNetRequest` API for efficient blocking

## Installation

### Chrome/Edge

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select the `site-blocker` directory
5. The extension is now installed!

### Testing

1. Click the extension icon to open settings in a new tab
2. Add domains to block (e.g., `facebook.com`, `twitter.com`, `amazon.com/gp/video`)
3. Try visiting a blocked site to see the block page
4. Test temporary unblock by clicking "Allow Until I Leave (2hr max)"

## Project Structure

```text
site-blocker/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (handles blocking logic)
├── blocked.html          # Block page UI
├── blocked.js            # Block page interactions
├── options.html          # Settings page UI
├── options.js            # Settings page logic
├── styles.css            # Shared styles
├── icons/                # Extension icons
│   ├── shield-16.png
│   ├── shield-48.png
│   └── shield-128.png
└── README.md            # This file
```

## How It Works

1. **Blocking Mechanism**: Uses `declarativeNetRequest` API with regex filters to redirect blocked URLs
2. **Rule-Based**: Each blocked domain/path gets a redirect rule that sends users to `blocked.html`
3. **URL Capture**: Uses `regexSubstitution` to preserve the original URL you tried to visit
4. **Temporary Unblock**: Removes rules temporarily and reinstates them after 2 hours OR when you leave the site
5. **Tab Monitoring**: Listens for URL changes, tab switches, and SPA navigation to enforce blocks
6. **Local Storage**: All configuration stored in `chrome.storage.local`

## Configuration

### Adding Blocked Sites

1. Open the Options page (click the extension icon)
2. Enter a domain or path:
   - **Domain blocking**: `facebook.com` (blocks all of Facebook)
   - **Path blocking**: `amazon.com/gp/video` (blocks only Prime Video)
3. Click "Add Domain"

### Block Page Actions

When you hit a blocked site, you have three options:

1. **Go Back**: Returns to previous page or about:blank
2. **Allow Until I Leave (2hr max)**: Temporarily unblocks the site and redirects to your original URL
3. **Open Settings**: Opens the options page to manage blocked sites

### Managing Temporary Unblocks

- View active temp unblocks in the options page
- See time remaining for each
- Click "Remove" to immediately re-block across all tabs

## Privacy Guarantees

- ✅ No content scripts injected into pages
- ✅ No browsing history access
- ✅ No external network requests
- ✅ No analytics or telemetry
- ✅ All data stored locally on your device
- ✅ Blocking enforced by browser engine (not JavaScript timers)

## Limitations

- Only blocks main frame navigation (not iframes or embedded content)
- Path blocking requires exact path prefix match (e.g., `amazon.com/gp/video` blocks `/gp/video/*`)
- Temporary unblocks persist in storage until browser clears them or 2 hours expire

## Technical Details

### Enforcement Layers

The extension uses three layers to ensure reliable blocking:

1. **Network Layer**: `declarativeNetRequest` rules intercept requests at the browser level
2. **Tab Layer**: Event listeners detect URL changes, tab switches, and SPA navigation
3. **Post-Removal Layer**: When temp unblock is removed, all tabs are immediately checked

### Supported URL Patterns

- `facebook.com` → Blocks `www.facebook.com`, `m.facebook.com`, etc.
- `amazon.com/gp/video` → Blocks Prime Video but allows other Amazon pages
- Paths are matched with prefix logic (blocks `/gp/video/*` and all subpaths)

## Development

### Adding Features

- **background.js**: Add message handlers for new functionality
- **options.js**: Add UI controls and storage management
- **blocked.js**: Customize block page behavior

### Testing Changes

1. Make your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## License

This project is provided as-is for personal use.

## Version

1.0.0 - Initial Release
