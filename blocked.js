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

// Reasons persistence and rendering
const DEFAULT_REASONS = [
    { label: 'Eating', emoji: '🍽️' },
    { label: 'Bored', emoji: '🫤' },
    { label: 'Uncomfortable', emoji: '🫨' },
    { label: 'Work & Watch', emoji: '💼' },
    { label: 'Movie time', emoji: '🎬' },
    { label: 'Research', emoji: '🔍' },
    { label: 'Workout', emoji: '🏋️‍♂️' },
    { label: 'Making food', emoji: '🧑‍🍳' },
    { label: 'Horny', emoji: '🍆' },
    { label: 'Surfing', emoji: '🏄' },
];

const REASONS_STORAGE_KEY = 'reasonsList';
let reasons = [];
let editMode = false;

function loadReasonsFromLocal() {
    try {
        const raw = localStorage.getItem(REASONS_STORAGE_KEY);
        if (!raw) {
            reasons = DEFAULT_REASONS.slice();
            saveReasonsToLocal();
            return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            reasons = parsed;
        } else {
            reasons = DEFAULT_REASONS.slice();
        }
    } catch (e) {
        console.error('Failed loading reasons, falling back to defaults', e);
        reasons = DEFAULT_REASONS.slice();
    }
}

function saveReasonsToLocal() {
    try {
        localStorage.setItem(REASONS_STORAGE_KEY, JSON.stringify(reasons));
    } catch (e) {
        console.error('Failed saving reasons to localStorage', e);
    }
}

function toggleEditMode() {
    editMode = !editMode;
    const editBtn = document.getElementById('editReasonsBtn');
    if (editBtn) editBtn.textContent = editMode ? 'Done' : 'Edit reasons';
    renderReasonButtons();
}

function removeReasonAt(index) {
    if (index < 0 || index >= reasons.length) return;
    reasons.splice(index, 1);
    saveReasonsToLocal();
    renderReasonButtons();
}

function addReason(label, emoji) {
    const trimmed = (label || '').trim();
    const em = (emoji || '').trim() || '🔖';
    if (!trimmed) return false;
    reasons.push({ label: trimmed, emoji: em });
    saveReasonsToLocal();
    renderReasonButtons();
    return true;
}

// Render reason buttons from the persisted reasons array
function renderReasonButtons() {
    const container = document.getElementById('reasonButtons') || document.querySelector('.reason-buttons');
    if (!container) return;
    container.innerHTML = '';

    reasons.forEach((r, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'reason-item';
        wrapper.style.position = 'relative';

        const btn = document.createElement('button');
        btn.className = 'btn-reason';
        btn.type = 'button';
        btn.setAttribute('data-reason', r.label);
        btn.setAttribute('aria-label', `Unblock for ${r.label}`);
        btn.textContent = `${r.emoji} ${r.label}`;
        btn.addEventListener('click', () => requestTempUnblock(r.label));

        wrapper.appendChild(btn);

        if (editMode) {
            const del = document.createElement('button');
            del.className = 'delete-dot';
            del.setAttribute('aria-label', `Delete ${r.label}`);
            del.type = 'button';
            del.textContent = '✕';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                removeReasonAt(idx);
            });
            wrapper.appendChild(del);
        }

        container.appendChild(wrapper);
    });

    // Add tile
    const addWrapper = document.createElement('div');
    addWrapper.className = 'reason-item add-reason-wrapper';
    addWrapper.style.position = 'relative';

    const addTile = document.createElement('button');
    addTile.className = 'btn-reason add-reason-tile';
    addTile.type = 'button';
    addTile.innerHTML = '➕';

    let formVisible = false;

    function showAddForm() {
        formVisible = true;
        addTile.classList.add('form-open');
        addTile.innerHTML = '';

        const form = document.createElement('div');
        form.className = 'add-reason-form';

        const labelInput = document.createElement('input');
        labelInput.className = 'input-reason-label';
        labelInput.placeholder = 'Description';
        labelInput.type = 'text';

        const emojiInput = document.createElement('input');
        emojiInput.className = 'input-reason-emoji';
        emojiInput.placeholder = 'Emoji 🛡️';
        emojiInput.type = 'text';

        const btnRow = document.createElement('div');
        btnRow.className = 'add-form-row';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.type = 'button';
        addBtn.textContent = 'Add';
        addBtn.addEventListener('click', () => {
            if (addReason(labelInput.value, emojiInput.value)) {
                formVisible = false;
                // renderReasonButtons() already called by addReason
            } else {
                labelInput.focus();
            }
        });

        btnRow.appendChild(addBtn);

        form.appendChild(labelInput);
        form.appendChild(emojiInput);
        form.appendChild(btnRow);

        // Small cancel text below the Add button
        const cancelText = document.createElement('div');
        cancelText.className = 'add-cancel-text';
        cancelText.textContent = 'Cancel';
        cancelText.tabIndex = 0;
        cancelText.addEventListener('click', () => {
            formVisible = false;
            renderReasonButtons();
        });
        cancelText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                formVisible = false;
                renderReasonButtons();
            }
        });

        form.appendChild(cancelText);

        addTile.appendChild(form);
        labelInput.focus();
    }

    addTile.addEventListener('click', (e) => {
        if (!formVisible) showAddForm();
    });
    addTile.addEventListener('keydown', (e) => {
        // Only handle space key when the add tile itself is focused
        // so space presses inside the input fields are not blocked.
        if (e.key === ' ' && e.target === addTile) {
            e.preventDefault();
            if (!formVisible) showAddForm();
        }
    });

    addWrapper.appendChild(addTile);
    container.appendChild(addWrapper);
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

    // Load persisted reasons and render buttons
    loadReasonsFromLocal();
    renderReasonButtons();

    const editBtn = document.getElementById('editReasonsBtn');
    if (editBtn) {
        editBtn.addEventListener('click', toggleEditMode);
        editBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleEditMode();
            }
        });
    }
});
