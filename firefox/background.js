// Service Worker for Site Blocker (Firefox MV2)
// Handles blocking rules and temporary unblockers using webRequest API

const STORAGE_KEYS = {
    BLOCKED_DOMAINS: 'blockedDomains',
    TEMP_UNBLOCKS: 'tempUnblocks',
    EXEMPTED_DOMAINS: 'exemptedDomains'
};

// Helper: check if a host matches any blocked domain
function isBlockedHost(host, blockedDomains) {
    return blockedDomains.some(domain => host === domain || host.endsWith(`.${domain}`));
}

// Helper: check if a path matches any blocked path
function isBlockedPath(path, blockedDomains) {
    return blockedDomains.some(domainOrPath => {
        if (!domainOrPath.includes('/')) return false;
        const [domain, blockedPath] = domainOrPath.split('/', 1)[0];
        return path.startsWith('/' + blockedPath);
    });
}

// Get current configuration from storage
function getConfig() {
    return new Promise((resolve) => {
        browser.storage.local.get([
            STORAGE_KEYS.BLOCKED_DOMAINS,
            STORAGE_KEYS.TEMP_UNBLOCKS,
            STORAGE_KEYS.EXEMPTED_DOMAINS
        ], (result) => {
            resolve({
                blockedDomains: result[STORAGE_KEYS.BLOCKED_DOMAINS] || [],
                tempUnblocks: result[STORAGE_KEYS.TEMP_UNBLOCKS] || {},
                exemptedDomains: result[STORAGE_KEYS.EXEMPTED_DOMAINS] || []
            });
        });
    });
}

// Check if a URL should be blocked
async function shouldBlockUrl(url) {
    try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.replace(/^www\./, '');
        const config = await getConfig();

        // Check temp unblocks first
        const now = Date.now();
        if (config.tempUnblocks[host] && config.tempUnblocks[host] > now) {
            return false;
        }

        // Check if domain is blocked
        if (!isBlockedHost(host, config.blockedDomains)) {
            return false;
        }

        // Check exemptions
        const isExempted = config.exemptedDomains.some(exempted =>
            host === exempted || host.endsWith(`.${exempted}`)
        );
        if (isExempted) {
            return false;
        }

        // Check path-based blocks
        for (const domainOrPath of config.blockedDomains) {
            if (domainOrPath.includes('/')) {
                const [blockedDomain, blockedPath] = domainOrPath.split('/');
                if (host === blockedDomain || host.endsWith(`.${blockedDomain}`)) {
                    if (urlObj.pathname.startsWith('/' + blockedPath)) {
                        return true;
                    }
                }
            } else if (host === domainOrPath || host.endsWith(`.${domainOrPath}`)) {
                return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}

// Intercept requests and block them
browser.webRequest.onBeforeRequest.addListener(
    async (details) => {
        if (details.type !== 'main_frame') {
            return;
        }

        const shouldBlock = await shouldBlockUrl(details.url);

        if (shouldBlock) {
            try {
                const urlObj = new URL(details.url);
                const domain = urlObj.hostname.replace(/^www\./, '');
                const blockedPageUrl = browser.extension.getURL('blocked.html') +
                    `?domain=${encodeURIComponent(domain)}&originalUrl=${encodeURIComponent(details.url)}`;

                return { redirectUrl: blockedPageUrl };
            } catch (e) {
                console.error('Error blocking URL:', e);
            }
        }
    },
    { urls: ['<all_urls>'], types: ['main_frame'] },
    ['blocking']
);

// Add domain to block list
async function addBlockedDomain(domain) {
    return new Promise((resolve) => {
        browser.storage.local.get([STORAGE_KEYS.BLOCKED_DOMAINS], (result) => {
            const domains = result[STORAGE_KEYS.BLOCKED_DOMAINS] || [];
            if (!domains.includes(domain)) {
                domains.push(domain);
                browser.storage.local.set({
                    [STORAGE_KEYS.BLOCKED_DOMAINS]: domains
                });
            }
            resolve();
        });
    });
}

// Remove domain from block list
async function removeBlockedDomain(domain) {
    return new Promise((resolve) => {
        browser.storage.local.get([STORAGE_KEYS.BLOCKED_DOMAINS], (result) => {
            const domains = result[STORAGE_KEYS.BLOCKED_DOMAINS] || [];
            const updated = domains.filter(d => d !== domain);
            browser.storage.local.set({
                [STORAGE_KEYS.BLOCKED_DOMAINS]: updated
            });
            resolve();
        });
    });
}

// Add exempted domain
async function addExemptedDomain(domain) {
    return new Promise((resolve) => {
        browser.storage.local.get([STORAGE_KEYS.EXEMPTED_DOMAINS], (result) => {
            const exemptions = result[STORAGE_KEYS.EXEMPTED_DOMAINS] || [];
            if (!exemptions.includes(domain)) {
                exemptions.push(domain);
                browser.storage.local.set({
                    [STORAGE_KEYS.EXEMPTED_DOMAINS]: exemptions
                });
            }
            resolve();
        });
    });
}

// Remove exempted domain
async function removeExemptedDomain(domain) {
    return new Promise((resolve) => {
        browser.storage.local.get([STORAGE_KEYS.EXEMPTED_DOMAINS], (result) => {
            const exemptions = result[STORAGE_KEYS.EXEMPTED_DOMAINS] || [];
            const updated = exemptions.filter(d => d !== domain);
            browser.storage.local.set({
                [STORAGE_KEYS.EXEMPTED_DOMAINS]: updated
            });
            resolve();
        });
    });
}

// Temporarily unblock a domain
async function temporarilyUnblock(domain, durationMinutes = 120) {
    return new Promise((resolve) => {
        browser.storage.local.get([STORAGE_KEYS.TEMP_UNBLOCKS], (result) => {
            const tempUnblocks = result[STORAGE_KEYS.TEMP_UNBLOCKS] || {};
            const durationMs = durationMinutes * 60 * 1000;
            const expiry = Date.now() + durationMs;

            tempUnblocks[domain] = expiry;

            browser.storage.local.set({
                [STORAGE_KEYS.TEMP_UNBLOCKS]: tempUnblocks
            });

            // Set alarm to reinstate block
            browser.alarms.create(`reinstate-${domain}`, { when: expiry });

            console.log(`Temporarily unblocked ${domain} until ${new Date(expiry)}`);
            resolve();
        });
    });
}

// Remove temporary unblock
async function removeTemporaryUnblock(domain) {
    return new Promise((resolve) => {
        browser.storage.local.get([STORAGE_KEYS.TEMP_UNBLOCKS], (result) => {
            const tempUnblocks = result[STORAGE_KEYS.TEMP_UNBLOCKS] || {};

            if (tempUnblocks[domain]) {
                delete tempUnblocks[domain];
                browser.storage.local.set({
                    [STORAGE_KEYS.TEMP_UNBLOCKS]: tempUnblocks
                });
                browser.alarms.clear(`reinstate-${domain}`);
                console.log(`Removed temporary unblock for ${domain}`);
            }
            resolve();
        });
    });
}

// Handle alarm events
browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('reinstate-')) {
        console.log('Alarm triggered:', alarm.name);
    }
});

// Handle browser action click - open options page
browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({ url: browser.extension.getURL('options.html') });
});

// Handle messages from UI pages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            switch (message.action) {
                case 'getConfig':
                    const config = await getConfig();
                    sendResponse({ success: true, data: config });
                    break;

                case 'addDomain':
                    await addBlockedDomain(message.domain);
                    sendResponse({ success: true });
                    break;

                case 'removeDomain':
                    await removeBlockedDomain(message.domain);
                    sendResponse({ success: true });
                    break;

                case 'temporaryUnblock':
                    const durationMinutes = message.durationMinutes || 120;
                    await temporarilyUnblock(message.domain, durationMinutes);
                    sendResponse({ success: true });
                    break;

                case 'removeTemporaryUnblock':
                    await removeTemporaryUnblock(message.domain);
                    sendResponse({ success: true });
                    break;

                case 'addExemption':
                    await addExemptedDomain(message.domain);
                    sendResponse({ success: true });
                    break;

                case 'removeExemption':
                    await removeExemptedDomain(message.domain);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();

    return true;
});

// Initialize on install
browser.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed');
    const config = await getConfig();

    if (!Array.isArray(config.blockedDomains)) {
        browser.storage.local.set({
            [STORAGE_KEYS.BLOCKED_DOMAINS]: []
        });
    }
});

// Cleanup expired temp unblocks periodically
browser.alarms.create('cleanup', { periodInMinutes: 5 });

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
        browser.storage.local.get([STORAGE_KEYS.TEMP_UNBLOCKS], (result) => {
            const tempUnblocks = result[STORAGE_KEYS.TEMP_UNBLOCKS] || {};
            const now = Date.now();
            let changed = false;

            for (const [domain, expiry] of Object.entries(tempUnblocks)) {
                if (expiry <= now) {
                    delete tempUnblocks[domain];
                    changed = true;
                }
            }

            if (changed) {
                browser.storage.local.set({
                    [STORAGE_KEYS.TEMP_UNBLOCKS]: tempUnblocks
                });
            }
        });
    }
});
