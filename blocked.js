// Script for blocked page
// Handles user interactions when a site is blocked

// Get blocked domain from URL parameter
function getBlockedDomain() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('domain') || 'unknown';
}

// Get the original requested URL from the referrer
function getOriginalUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const originalUrl = urlParams.get('originalUrl');
    if (originalUrl) {
        try {
            return decodeURIComponent(originalUrl);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Display blocked domain
function displayBlockedDomain() {
    const domain = getBlockedDomain();
    const domainElement = document.getElementById('domainName');
    domainElement.textContent = domain;
}

// Show status message
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Go back to previous page
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // If no history, go to a safe page
        window.location.href = 'about:blank';
    }
}

// Save unblock analytics to chrome.storage.local
async function saveUnblockAnalytics(reason, domain, durationMinutes) {
    // Validate inputs
    if (!reason || !domain || !durationMinutes) {
        console.warn('Invalid analytics data:', { reason, domain, durationMinutes });
        return;
    }

    const analyticsEntry = {
        timestamp: Date.now(),
        reason: reason,
        site: domain,
        timeAmountMinutes: durationMinutes  // Always stored in minutes
    };

    try {
        // Get existing analytics data
        const result = await chrome.storage.local.get(['unblockAnalytics']);
        const analytics = result.unblockAnalytics || [];

        // Add new entry
        analytics.push(analyticsEntry);

        // Save back to storage
        await chrome.storage.local.set({ unblockAnalytics: analytics });

        console.log('Analytics saved:', analyticsEntry);
    } catch (error) {
        console.error('Error saving analytics:', error);
        // Don't throw - analytics shouldn't block the unblock action
    }
}

// Request temporary unblock with reason
async function requestTempUnblock(reason) {
    const domain = getBlockedDomain();
    const durationSelect = document.getElementById('durationSelect');
    const durationMinutes = parseInt(durationSelect.value);
    const reasonButtons = document.querySelectorAll('.btn-reason');

    try {
        // Disable all reason buttons and duration select
        reasonButtons.forEach(btn => btn.disabled = true);
        durationSelect.disabled = true;

        // Save analytics before unblocking
        await saveUnblockAnalytics(reason, domain, durationMinutes);

        const response = await chrome.runtime.sendMessage({
            action: 'temporaryUnblock',
            domain: domain,
            durationMinutes: durationMinutes
        });

        if (response.success) {
            const durationText = durationMinutes >= 60
                ? `${durationMinutes / 60} hr`
                : `${durationMinutes} min`;
            showStatus(`${domain} unblocked until you leave or ${durationText} pass`, 'success');

            // Redirect to the originally requested site
            setTimeout(() => {
                const originalUrl = getOriginalUrl();
                if (originalUrl) {
                    window.location.href = originalUrl;
                } else {
                    window.location.href = `https://${domain}`;
                }
            }, 1500);
        } else {
            showStatus('Failed to unblock site: ' + response.error, 'error');
            reasonButtons.forEach(btn => btn.disabled = false);
            durationSelect.disabled = false;
        }
    } catch (error) {
        console.error('Error requesting temp unblock:', error);
        showStatus('An error occurred. Please try again.', 'error');
        reasonButtons.forEach(btn => btn.disabled = false);
        durationSelect.disabled = false;
    }
}

// Open settings page
function openSettings() {
    chrome.runtime.openOptionsPage();
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    displayBlockedDomain();

    // Set up event listeners
    document.getElementById('goBackBtn').addEventListener('click', goBack);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);

    // Add click handlers for all reason buttons
    const reasonButtons = document.querySelectorAll('.btn-reason');
    reasonButtons.forEach(button => {
        button.addEventListener('click', () => {
            const reason = button.getAttribute('data-reason');
            requestTempUnblock(reason);
        });
    });
});
