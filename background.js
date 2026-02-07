// Service Worker for Adaptive Site Blocker
// Handles blocking rules and temporary unblockers

const STORAGE_KEYS = {
    BLOCKED_DOMAINS: 'blockedDomains',
    TEMP_UNBLOCKS: 'tempUnblocks',
    EXEMPTED_DOMAINS: 'exemptedDomains'
};

const BLOCKED_PAGE_URL = chrome.runtime.getURL('blocked.html');

// Helper: check if a host matches any blocked domain
function isBlockedHost(host, blockedDomains) {
    return blockedDomains.some(domain => host === domain || host.endsWith(`.${domain}`));
}

// Generate deterministic rule ID from domain
function getDomainRuleId(domain) {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
        const char = domain.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Get current configuration from storage
async function getConfig() {
    const result = await chrome.storage.local.get([
        STORAGE_KEYS.BLOCKED_DOMAINS,
        STORAGE_KEYS.TEMP_UNBLOCKS,
        STORAGE_KEYS.EXEMPTED_DOMAINS
    ]);

    return {
        blockedDomains: result[STORAGE_KEYS.BLOCKED_DOMAINS] || [],
        tempUnblocks: result[STORAGE_KEYS.TEMP_UNBLOCKS] || {},
        exemptedDomains: result[STORAGE_KEYS.EXEMPTED_DOMAINS] || []
    };
}

// Create redirect rules for blocked domains
function createRedirectRules(domains, exemptedDomains = []) {
    const extensionUrl = chrome.runtime.getURL('blocked.html');

    const rules = domains.map(domainOrPath => {
        // Check if this is a path-based block (contains /)
        const isPathBlock = domainOrPath.includes('/');

        if (isPathBlock) {
            // For path blocks like "amazon.com/gp/video"
            // Extract domain and path
            const parts = domainOrPath.split('/');
            const domain = parts[0];
            const path = parts.slice(1).join('/');

            // Create regex pattern for matching domain and path
            const regexFilter = `^https?://([a-z0-9.-]*\\.)?${domain.replace(/\./g, '\\.')}/${path.replace(/\//g, '\\/')}.*`;
            return {
                id: getDomainRuleId(domainOrPath),
                priority: 2, // Higher priority for specific paths
                action: {
                    type: 'redirect',
                    redirect: {
                        regexSubstitution: `${extensionUrl}?domain=${encodeURIComponent(domainOrPath)}&originalUrl=\\0`
                    }
                },
                condition: {
                    regexFilter: regexFilter,
                    resourceTypes: ['main_frame']
                }
            };
        } else {
            // For domain blocks - check if any exemptions apply to this domain
            const exemptedSubdomains = exemptedDomains.filter(exempted => {
                // Check if the exemption is a subdomain of this blocked domain
                return exempted.endsWith('.' + domainOrPath);
            });

            // Use standard regex pattern
            const regexFilter = `^https?://([a-z0-9.-]*\\.)?${domainOrPath.replace(/\./g, '\\.')}(/.*)?$`;

            const rule = {
                id: getDomainRuleId(domainOrPath),
                priority: 1,
                action: {
                    type: 'redirect',
                    redirect: {
                        regexSubstitution: `${extensionUrl}?domain=${encodeURIComponent(domainOrPath)}&originalUrl=\\0`
                    }
                },
                condition: {
                    regexFilter: regexFilter,
                    resourceTypes: ['main_frame']
                }
            };

            // Add excluded domains if there are exemptions
            if (exemptedSubdomains.length > 0) {
                rule.condition.excludedRequestDomains = exemptedSubdomains;
            }

            return rule;
        }
    });

    return rules;
}

// Update blocking rules based on blocked domains and temp unblocks
async function updateBlockingRules() {
    const config = await getConfig();
    const now = Date.now();

    // Clean up expired temporary unblocks
    const activeTempUnblocks = {};
    for (const [domain, expiry] of Object.entries(config.tempUnblocks)) {
        if (expiry > now) {
            activeTempUnblocks[domain] = expiry;
        }
    }

    // Update storage if temp unblocks changed
    if (Object.keys(activeTempUnblocks).length !== Object.keys(config.tempUnblocks).length) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.TEMP_UNBLOCKS]: activeTempUnblocks
        });
    }

    // Get all blocked domains and filter out temporarily unblocked ones
    const domainsToBlock = config.blockedDomains.filter(domain => !activeTempUnblocks[domain]);

    // Remove all existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map(rule => rule.id);

    // Create new rules with exemptions built-in
    const blockRules = createRedirectRules(domainsToBlock, config.exemptedDomains);

    // Update rules
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: blockRules
    });

    console.log(`Updated rules: ${blockRules.length} blocked, ${config.exemptedDomains.length} exempted`);
}

// Add domain to block list
async function addBlockedDomain(domain) {
    const config = await getConfig();

    if (!config.blockedDomains.includes(domain)) {
        config.blockedDomains.push(domain);
        await chrome.storage.local.set({
            [STORAGE_KEYS.BLOCKED_DOMAINS]: config.blockedDomains
        });
        await updateBlockingRules();
    }
}

// Remove domain from block list
async function removeBlockedDomain(domain) {
    const config = await getConfig();

    const updatedDomains = config.blockedDomains.filter(d => d !== domain);
    await chrome.storage.local.set({
        [STORAGE_KEYS.BLOCKED_DOMAINS]: updatedDomains
    });
    await updateBlockingRules();
}

// Add exempted domain
async function addExemptedDomain(domain) {
    const config = await getConfig();

    if (!config.exemptedDomains.includes(domain)) {
        config.exemptedDomains.push(domain);
        await chrome.storage.local.set({
            [STORAGE_KEYS.EXEMPTED_DOMAINS]: config.exemptedDomains
        });
        await updateBlockingRules();
    }
}

// Remove exempted domain
async function removeExemptedDomain(domain) {
    const config = await getConfig();

    const updatedExemptions = config.exemptedDomains.filter(d => d !== domain);
    await chrome.storage.local.set({
        [STORAGE_KEYS.EXEMPTED_DOMAINS]: updatedExemptions
    });
    await updateBlockingRules();
}

// Temporarily unblock a domain (configurable duration or until user leaves)
async function temporarilyUnblock(domain, durationMinutes = 120) {
    const config = await getConfig();
    const durationMs = durationMinutes * 60 * 1000;
    const expiry = Date.now() + durationMs;

    config.tempUnblocks[domain] = expiry;

    await chrome.storage.local.set({
        [STORAGE_KEYS.TEMP_UNBLOCKS]: config.tempUnblocks
    });

    // Set alarm to reinstate block after specified duration
    await chrome.alarms.create(`reinstate-${domain}`, {
        when: expiry
    });

    await updateBlockingRules();
    console.log(`Temporarily unblocked ${domain} until ${new Date(expiry)} or until you leave the site`);
}

// Remove temporary unblock for a domain
async function removeTemporaryUnblock(domain) {
    const config = await getConfig();

    if (config.tempUnblocks[domain]) {
        delete config.tempUnblocks[domain];

        await chrome.storage.local.set({
            [STORAGE_KEYS.TEMP_UNBLOCKS]: config.tempUnblocks
        });

        // Cancel the alarm
        await chrome.alarms.clear(`reinstate-${domain}`);

        await updateBlockingRules();
        // Immediately enforce across any open tabs
        await enforceBlockingAcrossTabs();
        console.log(`Removed temporary unblock for ${domain}`);
    }
}

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith('reinstate-')) {
        console.log('Alarm triggered:', alarm.name);
        await updateBlockingRules();
    }
});

// Open options page when the action icon is clicked
chrome.action.onClicked.addListener(async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
});

// Handle messages from UI pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

                case 'updateRules':
                    await updateBlockingRules();
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

    return true; // Keep message channel open for async response
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed');

    // Ensure storage is initialized but do not preload any blocked sites
    const config = await getConfig();

    if (!Array.isArray(config.blockedDomains)) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.BLOCKED_DOMAINS]: []
        });
    }

    await updateBlockingRules();
});

// Update rules on startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('Extension started');
    await updateBlockingRules();
});

// Periodic check for expired temp unblocks (backup to alarms)
chrome.alarms.create('cleanup', { periodInMinutes: 5 });

// Helper: determine if a temp-unblocked domain still has an open tab
async function cleanupTempUnblocksByOpenTabs() {
    const config = await getConfig();
    const tempUnblockedDomains = Object.keys(config.tempUnblocks);
    if (tempUnblockedDomains.length === 0) return;

    const tabs = await chrome.tabs.query({});

    // Build a list of hostnames for all open tabs
    const openHosts = new Set();
    for (const t of tabs) {
        if (!t.url) continue;
        try {
            const host = new URL(t.url).hostname.replace(/^www\./, '');
            openHosts.add(host);
        } catch (e) {
            continue;
        }
    }

    // For each temporarily unblocked domain, if no open tab matches, re-block it
    for (const domainOrPath of tempUnblockedDomains) {
        let stillOpen = false;
        for (const host of openHosts) {
            const isPathBlock = domainOrPath.includes('/');
            if (isPathBlock) {
                const parts = domainOrPath.split('/');
                const domain = parts[0];
                if (host === domain || host.endsWith(`.${domain}`)) {
                    stillOpen = true;
                    break;
                }
            } else {
                if (host === domainOrPath || host.endsWith(`.${domainOrPath}`)) {
                    stillOpen = true;
                    break;
                }
            }
        }

        if (!stillOpen) {
            await removeTemporaryUnblock(domainOrPath);
        }
    }
}

// Helper: check if a host matches any blocked domain
function isBlockedHost(host, blockedDomains) {
    return blockedDomains.some(domain => host === domain || host.endsWith(`.${domain}`));
}

// Helper: check if a URL matches any blocked domain or path
function isBlockedUrl(url, blockedDomains) {
    const host = url.hostname.replace(/^www\./, '');
    return blockedDomains.some(domainOrPath => {
        const isPathBlock = domainOrPath.includes('/');
        if (isPathBlock) {
            // For path blocks like "amazon.com/gp/video"
            const parts = domainOrPath.split('/');
            const domain = parts[0];
            const path = parts.slice(1).join('/');

            return (host === domain || host.endsWith(`.${domain}`)) && url.pathname.startsWith(`/${path}`);
        } else {
            // For domain blocks
            return host === domainOrPath || host.endsWith(`.${domainOrPath}`);
        }
    });
}

// Helper: find matching temp-unblock item for a host and URL
function getTempUnblockItem(urlString, tempUnblocks) {
    try {
        const url = new URL(urlString);
        const host = url.hostname.replace(/^www\./, '');

        return Object.keys(tempUnblocks).find(domainOrPath => {
            const isPathBlock = domainOrPath.includes('/');
            if (isPathBlock) {
                // For path blocks like "amazon.com/gp/video"
                const parts = domainOrPath.split('/');
                const domain = parts[0];
                const path = parts.slice(1).join('/');

                return (host === domain || host.endsWith(`.${domain}`)) && url.pathname.startsWith(`/${path}`);
            } else {
                // For domain blocks
                return host === domainOrPath || host.endsWith(`.${domainOrPath}`);
            }
        });
    } catch (e) {
        return null;
    }
}

// Enforce blocking for a single tab (handles SPA/history changes)
async function enforceBlockingForTab(tabId, urlString) {
    try {
        const url = new URL(urlString);
        const host = url.hostname.replace(/^www\./, '');

        // Ignore if it's our own blocked page or non-http(s)
        if (urlString.startsWith(BLOCKED_PAGE_URL) || (url.protocol !== 'http:' && url.protocol !== 'https:')) return;

        const config = await getConfig();

        // If temp-unblocked, allow
        if (getTempUnblockItem(urlString, config.tempUnblocks)) return;

        // Check if this domain/subdomain is exempted
        const isExempted = config.exemptedDomains.some(exempted => {
            return host === exempted || host.endsWith(`.${exempted}`);
        });

        if (isExempted) return;

        // Check if the full URL matches any blocked domain or path
        if (isBlockedUrl(url, config.blockedDomains)) {
            const blockedItem = config.blockedDomains.find(domainOrPath => {
                const isPathBlock = domainOrPath.includes('/');
                if (isPathBlock) {
                    const parts = domainOrPath.split('/');
                    const domain = parts[0];
                    const path = parts.slice(1).join('/');
                    return (host === domain || host.endsWith(`.${domain}`)) && url.pathname.startsWith(`/${path}`);
                } else {
                    return host === domainOrPath || host.endsWith(`.${domainOrPath}`);
                }
            });

            if (blockedItem) {
                await chrome.tabs.update(tabId, {
                    url: `${BLOCKED_PAGE_URL}?domain=${encodeURIComponent(blockedItem)}`
                });
            }
        }
    } catch (e) {
        // Ignore invalid URLs
    }
}

// Enforce blocking across all tabs (used after temp unblock removal)
async function enforceBlockingAcrossTabs() {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
        if (t.url) {
            await enforceBlockingForTab(t.id, t.url);
        }
    }
}

// Track when user leaves temporarily unblocked sites: on URL changes and tab closes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (!changeInfo.url) return;

    // First, clean up temp unblocks if their tabs are gone
    await cleanupTempUnblocksByOpenTabs();

    // Enforce blocking on SPA-like URL changes after temp unblock expires
    await enforceBlockingForTab(tabId, changeInfo.url);
});

chrome.tabs.onRemoved.addListener(async () => {
    await cleanupTempUnblocksByOpenTabs();
});

// Also handle history API / SPA changes
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
    await enforceBlockingForTab(details.tabId, details.url);
});

// When switching tabs, ensure a blocked site is not left visible after temp-unblock removal
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
        await enforceBlockingForTab(tab.id, tab.url);
    }
});
