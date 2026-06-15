# Site Blocker

A privacy-first browser extension that blocks selected websites and redirects users to a full-page block screen.

**Supports**: Chrome, Edge, and Firefox

## Features

- **Full-Page Blocking**: Redirects blocked sites to a custom HTML page instead of using popups
- **Domain & Path Blocking**: Block entire domains (`facebook.com`) or specific paths (`amazon.com/gp/video`)
- **Temporary Unblock**: Allow access to blocked sites for 2 hours or until you leave the site
- **Smart URL Preservation**: Temp unblock redirects to the exact page you tried to visit (with query parameters)
- **Privacy-First**: No backend, no analytics, all data stored locally
- **Analytics**: Tracks your unblock patterns and reasons

## Installation

### Chrome/Edge

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right corner)
3. Click "Load unpacked" and select the `chrome` folder
4. Done! The extension is ready to use

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on" and select `firefox/manifest.json`
3. Done! The extension is ready to use

*Note: Firefox temporary add-ons are uninstalled on browser restart*

## Getting Started

1. Click the extension icon to open Settings
2. Add domains to block (e.g., `facebook.com` or `amazon.com/gp/video`)
3. Visit a blocked site to see the block screen
4. Click "Allow Until I Leave" to temporarily unblock for up to 2 hours

## How It Works

The extension uses your browser's native blocking APIs:

- **Chrome/Edge**: `declarativeNetRequest` API (Manifest V3)
- **Firefox**: `webRequest` API (Manifest V2)

When you block a domain, the extension intercepts requests and redirects you to a block screen. All configuration is stored locally on your device—nothing is sent to external servers.

## Settings

### Add Blocked Sites

Enter a domain like `facebook.com` to block the entire site, or a path like `amazon.com/gp/video` to block only specific sections.

### Temporary Unblock

When you hit a blocked site, you can:

- **Go Back**: Return to the previous page
- **Allow Until I Leave**: Temporarily unblock for 2 hours or until you close the tab
- **Open Settings**: Manage your blocked sites

### Exemptions

Allow specific subdomains even when the parent domain is blocked (e.g., allow `music.youtube.com` while blocking `youtube.com`).

### Analytics

Track your unblock patterns by reason and site. Export or import your data anytime.

## Privacy

- ✅ All data stored locally on your device
- ✅ No external network requests
- ✅ No analytics or telemetry
- ✅ No content scripts injected into webpages
- ✅ Open source—inspect the code anytime
