// Options page script
// Handles settings and domain management

let currentConfig = null;

// Get current configuration
async function loadConfig() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
        if (response.success) {
            currentConfig = response.data;
            updateUI();
        } else {
            showStatus('Failed to load configuration', 'error');
        }
    } catch (error) {
        console.error('Error loading config:', error);
        showStatus('Error loading configuration', 'error');
    }
}

// Update UI based on current configuration
function updateUI() {
    if (!currentConfig) return;

    // Update domain list
    updateDomainList();

    // Update temp unblocks
    updateTempUnblocks();
}

// Update domain list
function updateDomainList() {
    const domainList = document.getElementById('domainList');
    const domains = currentConfig.blockedDomains || [];

    if (domains.length === 0) {
        domainList.innerHTML = '<p class="empty-state">No blocked sites configured</p>';
        return;
    }

    domainList.innerHTML = domains
        .sort()
        .map(domain => `
      <div class="domain-item">
        <span class="domain-name">${escapeHtml(domain)}</span>
        <button class="btn-remove" data-domain="${escapeHtml(domain)}">
          Remove
        </button>
      </div>
    `)
        .join('');

    // Add event listeners to remove buttons
    domainList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeDomain(btn.dataset.domain);
        });
    });
}

// Update temporary unblocks display
function updateTempUnblocks() {
    const tempList = document.getElementById('tempUnblockList');
    const tempUnblocks = currentConfig.tempUnblocks || {};
    const entries = Object.entries(tempUnblocks);

    if (entries.length === 0) {
        tempList.innerHTML = '<p class="empty-state">No sites are temporarily unblocked</p>';
        return;
    }

    const now = Date.now();
    const activeUnblocks = entries.filter(([_, expiry]) => expiry > now);

    if (activeUnblocks.length === 0) {
        tempList.innerHTML = '<p class="empty-state">No sites are temporarily unblocked</p>';
        return;
    }

    tempList.innerHTML = activeUnblocks
        .map(([domain, expiry]) => {
            const remainingMs = expiry - now;
            const remainingMin = Math.ceil(remainingMs / (60 * 1000));
            return `
        <div class="temp-item">
          <span class="domain-name">${escapeHtml(domain)}</span>
          <div class="temp-actions">
            <span class="temp-time">${remainingMin} min remaining</span>
            <button class="btn-remove" data-domain="${escapeHtml(domain)}">
              Remove
            </button>
          </div>
        </div>
      `;
        })
        .join('');

    // Add event listeners to remove buttons
    tempList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeTemporaryUnblock(btn.dataset.domain);
        });
    });
}

// Add domain
async function addDomain() {
    const input = document.getElementById('domainInput');
    const domain = input.value.trim().toLowerCase();

    if (!domain) {
        showStatus('Please enter a domain', 'error');
        return;
    }

    // Basic validation
    if (!isValidDomain(domain)) {
        showStatus('Please enter a valid domain (e.g., example.com)', 'error');
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'addDomain',
            domain: domain
        });

        if (response.success) {
            input.value = '';
            showStatus(`Added ${domain} to blocked sites`, 'success');
            await loadConfig(); // Reload to update UI
        } else {
            showStatus('Failed to add domain', 'error');
        }
    } catch (error) {
        console.error('Error adding domain:', error);
        showStatus('Error adding domain', 'error');
    }
}

// Remove domain
async function removeDomain(domain) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'removeDomain',
            domain: domain
        });

        if (response.success) {
            showStatus(`Removed ${domain} from blocked sites`, 'success');
            await loadConfig(); // Reload to update UI
        } else {
            showStatus('Failed to remove domain', 'error');
        }
    } catch (error) {
        console.error('Error removing domain:', error);
        showStatus('Error removing domain', 'error');
    }
}

// Remove temporary unblock
async function removeTemporaryUnblock(domain) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'removeTemporaryUnblock',
            domain: domain
        });

        if (response.success) {
            showStatus(`Re-blocked ${domain}`, 'success');
            await loadConfig(); // Reload to update UI
        } else {
            showStatus('Failed to remove temporary unblock', 'error');
        }
    } catch (error) {
        console.error('Error removing temporary unblock:', error);
        showStatus('Error removing temporary unblock', 'error');
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';

    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 4000);
}

// Validate domain format
function isValidDomain(domain) {
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '');

    // Support both domains and paths like "amazon.com/gp/video"
    const domainPart = domain.split('/')[0];

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domainPart);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Load initial configuration
    await loadConfig();

    // Set up add domain button
    document.getElementById('addDomainBtn').addEventListener('click', addDomain);

    // Allow Enter key to add domain
    document.getElementById('domainInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addDomain();
        }
    });

    // Refresh temp unblocks every 30 seconds
    setInterval(() => {
        if (currentConfig) {
            updateTempUnblocks();
        }
    }, 30000);
});
