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

// Request temporary unblock
async function requestTempUnblock() {
    const domain = getBlockedDomain();
    const tempUnblockBtn = document.getElementById('tempUnblockBtn');

    try {
        tempUnblockBtn.disabled = true;
        tempUnblockBtn.textContent = 'Processing...';

        const response = await chrome.runtime.sendMessage({
            action: 'temporaryUnblock',
            domain: domain
        });

        if (response.success) {
            showStatus(`${domain} unblocked until you leave or 2 hours pass`, 'success');

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
            tempUnblockBtn.disabled = false;
            tempUnblockBtn.textContent = '⏱️ Allow Until I Leave (2hr max)';
        }
    } catch (error) {
        console.error('Error requesting temp unblock:', error);
        showStatus('An error occurred. Please try again.', 'error');
        tempUnblockBtn.disabled = false;
        tempUnblockBtn.textContent = '⏱️ Allow Until I Leave (2hr max)';
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
    document.getElementById('tempUnblockBtn').addEventListener('click', requestTempUnblock);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
});
