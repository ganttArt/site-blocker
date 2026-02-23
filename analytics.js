// Analytics page script

// Load and display analytics data
async function loadAnalytics() {
    try {
        const result = await chrome.storage.local.get(['unblockAnalytics']);
        const data = result.unblockAnalytics || [];

        if (data.length === 0) {
            return;
        }

        displaySummaryStats(data);
        displayReasonChart(data);
        displaySiteChart(data);
        displayTimeScatterPlot(data);
        displayRecentActivity(data);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Display summary statistics
function displaySummaryStats(data) {
    // Total unblocks
    document.getElementById('totalUnblocks').textContent = data.length;

    // Average duration - handle both old and new field names
    const totalDuration = data.reduce((sum, item) => {
        const duration = item.timeAmountMinutes || item.timeAmount || 0;
        return sum + duration;
    }, 0);
    const avgDuration = data.length > 0 ? totalDuration / data.length : 0;
    document.getElementById('avgDuration').textContent = Math.round(avgDuration);

    // Most common reason
    const reasonCounts = {};
    data.forEach(item => {
        reasonCounts[item.reason] = (reasonCounts[item.reason] || 0) + 1;
    });
    const topReason = Object.keys(reasonCounts).reduce((a, b) =>
        reasonCounts[a] > reasonCounts[b] ? a : b, '—'
    );
    document.getElementById('topReason').textContent = topReason;

    // Most unblocked site
    const siteCounts = {};
    data.forEach(item => {
        siteCounts[item.site] = (siteCounts[item.site] || 0) + 1;
    });
    const topSite = Object.keys(siteCounts).reduce((a, b) =>
        siteCounts[a] > siteCounts[b] ? a : b, '—'
    );
    document.getElementById('topSite').textContent = topSite;
}

// Display reason chart
function displayReasonChart(data) {
    // Emoji fallback mapping
    const reasonEmojiMap = {
        'Eating': '🍽️',
        'Bored': '🫤',
        'Uncomfortable': '🫨',
        'Work & Watch': '💼',
        'Movie time': '🎬',
        'Research': '🔍',
        'Workout': '🏋️‍♂️',
        'Making food': '🧑‍🍳',
        'Horny': '🍆',
        'Surfing': '🏄'
    };

    // Load reasons from localStorage for user-created reasons
    let localStorageReasons = [];
    try {
        const raw = localStorage.getItem('reasonsList');
        if (raw) {
            localStorageReasons = JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load reasons from localStorage', e);
    }

    // Get site colors (same as scatter plot)
    const uniqueSites = [...new Set(data.map(item => item.site))];
    const siteColors = {};
    const colors = [
        '#e63946', '#1d3557', '#06ffa5', '#f77f00', '#9d4edd',
        '#ffea00', '#06d6a0', '#ff006e', '#457b9d', '#95d600'
    ];
    uniqueSites.forEach((site, index) => {
        siteColors[site] = colors[index % colors.length];
    });

    // Count unblocks by reason and site
    const reasonData = {};
    data.forEach(item => {
        if (!reasonData[item.reason]) {
            reasonData[item.reason] = { total: 0, sites: {} };
        }
        reasonData[item.reason].total++;
        reasonData[item.reason].sites[item.site] = (reasonData[item.reason].sites[item.site] || 0) + 1;
    });

    const container = document.getElementById('reasonChart');
    container.innerHTML = '';

    const sortedReasons = Object.entries(reasonData).sort((a, b) => b[1].total - a[1].total);

    if (sortedReasons.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    const maxCount = sortedReasons[0][1].total;

    sortedReasons.forEach(([reason, { total, sites }]) => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';

        const label = document.createElement('div');
        label.className = 'chart-label';

        // Find emoji from data, localStorage, or fallback map
        const entryWithEmoji = data.slice().reverse().find(item =>
            item.reason === reason && item.emoji && item.emoji.trim() !== ''
        );
        const localReason = localStorageReasons.find(r => r.label === reason);
        const emoji = entryWithEmoji?.emoji || localReason?.emoji || reasonEmojiMap[reason] || '';
        label.textContent = emoji ? `${emoji} ${reason}` : reason;

        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';

        const barFill = document.createElement('div');
        barFill.className = 'bar-fill';
        barFill.style.width = `${(total / maxCount) * 100}%`;
        barFill.style.display = 'flex';
        barFill.style.overflow = 'hidden';

        // Create segments for each site
        const sortedSites = Object.entries(sites).sort((a, b) => b[1] - a[1]);
        sortedSites.forEach(([site, count]) => {
            const segment = document.createElement('div');
            segment.style.width = `${(count / total) * 100}%`;
            segment.style.height = '100%';
            segment.style.backgroundColor = siteColors[site];
            segment.style.position = 'relative';
            segment.style.display = 'flex';
            segment.style.alignItems = 'center';
            segment.style.justifyContent = 'center';
            segment.title = `${site}: ${count}`;

            const segmentText = document.createElement('span');
            segmentText.textContent = site.replace(/\.(com|org|net|edu|gov|io|co|dev)$/i, '');
            segmentText.style.fontSize = '11px';
            segmentText.style.color = 'white';
            segmentText.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            segmentText.style.fontWeight = '500';
            segmentText.style.whiteSpace = 'nowrap';
            segmentText.style.overflow = 'hidden';
            segmentText.style.textOverflow = 'ellipsis';
            segmentText.style.padding = '0 4px';
            segment.appendChild(segmentText);

            barFill.appendChild(segment);
        });

        const barValue = document.createElement('div');
        barValue.className = 'bar-value';
        barValue.textContent = total;

        barContainer.appendChild(barFill);
        barContainer.appendChild(barValue);

        bar.appendChild(label);
        bar.appendChild(barContainer);

        container.appendChild(bar);
    });
}

// Display site chart
function displaySiteChart(data) {
    // Get site colors (same as scatter plot)
    const uniqueSites = [...new Set(data.map(item => item.site))];
    const siteColors = {};
    const colors = [
        '#e63946', '#1d3557', '#06ffa5', '#f77f00', '#9d4edd',
        '#ffea00', '#06d6a0', '#ff006e', '#457b9d', '#95d600'
    ];
    uniqueSites.forEach((site, index) => {
        siteColors[site] = colors[index % colors.length];
    });

    const siteCounts = {};
    data.forEach(item => {
        siteCounts[item.site] = (siteCounts[item.site] || 0) + 1;
    });

    const container = document.getElementById('siteChart');
    container.innerHTML = '';

    const sortedSites = Object.entries(siteCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (sortedSites.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    const maxCount = sortedSites[0][1];

    sortedSites.forEach(([site, count]) => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';

        const label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = site;

        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';

        const barFill = document.createElement('div');
        barFill.className = 'bar-fill';
        barFill.style.width = `${(count / maxCount) * 100}%`;
        barFill.style.background = siteColors[site];

        const barValue = document.createElement('div');
        barValue.className = 'bar-value';
        barValue.textContent = count;

        barContainer.appendChild(barFill);
        barContainer.appendChild(barValue);

        bar.appendChild(label);
        bar.appendChild(barContainer);

        container.appendChild(bar);
    });
}

// Display time of day scatter plot
function displayTimeScatterPlot(data) {
    const container = document.getElementById('timeScatterPlot');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    // Get unique sites and assign colors
    const uniqueSites = [...new Set(data.map(item => item.site))];
    const siteColors = {};
    const colors = [
        '#e63946', // Bright red
        '#1d3557', // Dark blue
        '#06ffa5', // Bright cyan
        '#f77f00', // Vivid orange
        '#9d4edd', // Purple
        '#ffea00', // Yellow
        '#06d6a0', // Teal
        '#ff006e', // Hot pink
        '#457b9d', // Steel blue
        '#95d600'  // Lime green
    ];
    uniqueSites.forEach((site, index) => {
        siteColors[site] = colors[index % colors.length];
    });

    // Get unique reasons for Y-axis
    const uniqueReasons = [...new Set(data.map(item => item.reason))];

    // Emoji fallback mapping for older analytics data that doesn't have emoji stored
    const reasonEmojiMap = {
        'Eating': '🍽️',
        'Bored': '🫤',
        'Uncomfortable': '🫨',
        'Work & Watch': '💼',
        'Movie time': '🎬',
        'Research': '🔍',
        'Workout': '🏋️‍♂️',
        'Making food': '🧑‍🍳',
        'Horny': '🍆',
        'Surfing': '🏄'
    };

    // Also check localStorage for current reasons (includes user-created ones)
    let localStorageReasons = [];
    try {
        const raw = localStorage.getItem('reasonsList');
        if (raw) {
            localStorageReasons = JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load reasons from localStorage', e);
    }

    // Create the scatter plot structure
    const plotArea = document.createElement('div');
    plotArea.className = 'scatter-plot';

    // Calculate dynamic height: 30px per category, minimum 200px
    const categoryHeight = 30;
    const plotHeight = Math.max(200, uniqueReasons.length * categoryHeight);

    // Create Y-axis labels (reasons)
    const yAxis = document.createElement('div');
    yAxis.className = 'scatter-y-axis';
    yAxis.style.height = `${plotHeight}px`;
    uniqueReasons.forEach((reason, index) => {
        const label = document.createElement('div');
        label.className = 'y-axis-label';
        // Find the most recent entry with this reason that has an emoji (check newest first)
        const entryWithEmoji = data.slice().reverse().find(item =>
            item.reason === reason && item.emoji && item.emoji.trim() !== ''
        );
        // Try multiple sources for emoji: 1) analytics data, 2) localStorage reasons, 3) fallback map
        const localReason = localStorageReasons.find(r => r.label === reason);
        const emoji = entryWithEmoji?.emoji || localReason?.emoji || reasonEmojiMap[reason] || '';
        label.textContent = emoji ? `${emoji} ${reason}` : reason;
        // Position label at the same percentage as the gridline
        const yPercent = ((index + 0.5) / uniqueReasons.length) * 100;
        label.style.top = `${yPercent}%`;
        yAxis.appendChild(label);
    });

    // Create the plot grid
    const grid = document.createElement('div');
    grid.className = 'scatter-grid';
    grid.style.height = `${plotHeight}px`;

    // Add horizontal gridlines for each category
    uniqueReasons.forEach((reason, index) => {
        const yPercent = ((index + 0.5) / uniqueReasons.length) * 100;
        const line = document.createElement('div');
        line.className = 'y-grid-line';
        line.style.top = `${yPercent}%`;
        grid.appendChild(line);
    });

    // Create a single tooltip element for instant hover info (prevents native title delay)
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'dot-tooltip';
    tooltipEl.style.display = 'none';
    grid.appendChild(tooltipEl);

    function positionTooltip(e) {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Keep tooltip within grid bounds with small margins
        const left = Math.min(rect.width - 10, Math.max(10, x + 12));
        const top = Math.max(10, y - 28);
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    }

    // Compute min/max time across data (as decimal hours), add small padding
    // Times before 4am are treated as late-night of the previous day (hour + 24)
    const timeDecimals = data.map(item => {
        const d = new Date(item.timestamp);
        const h = d.getHours();
        const adjustedH = h < 4 ? h + 24 : h;
        return adjustedH + (d.getMinutes() / 60) + (d.getSeconds() / 3600);
    });

    let minTime = Math.min(...timeDecimals);
    let maxTime = Math.max(...timeDecimals);

    // Handle single-point or very narrow ranges by giving at least 1 hour span
    let range = maxTime - minTime;
    if (range <= 0) {
        minTime = Math.max(4, minTime - 0.5);
        maxTime = Math.min(28, maxTime + 0.5);
        range = maxTime - minTime;
    }

    // Add small padding (5% of range) but at least 0.25 hours
    const padding = Math.max(0.25, range * 0.05);
    // Chart must start no earlier than 4am; times before 4am are shifted to 24+ so allow up to 28
    let minPad = Math.max(4, minTime - padding);
    let maxPad = Math.min(28, maxTime + padding);

    // Recompute range after padding
    range = maxPad - minPad;
    if (range <= 0) {
        minPad = Math.max(4, minPad - 0.5);
        maxPad = Math.min(28, maxPad + 0.5);
        range = maxPad - minPad;
    }

    // Add grid dots mapped into the padded range
    data.forEach(item => {
        const date = new Date(item.timestamp);
        const hour = date.getHours();
        const minute = date.getMinutes();
        // Treat times before 4am as late-night of the previous day
        const timeDecimal = (hour < 4 ? hour + 24 : hour) + (minute / 60);

        const reasonIndex = uniqueReasons.indexOf(item.reason);

        // Map time into padded range (0-100%)
        const xPercent = ((timeDecimal - minPad) / range) * 100;
        const yPercent = ((reasonIndex + 0.5) / uniqueReasons.length) * 100;

        const dot = document.createElement('div');
        dot.className = 'scatter-dot';
        dot.style.left = `${Math.max(0, Math.min(100, xPercent))}%`;
        dot.style.top = `${yPercent}%`;
        dot.style.backgroundColor = siteColors[item.site];

        // Use a data attribute for tooltip text and remove native title (native tooltips have a delay)
        const tooltipText = `${item.site} at ${hour}:${minute.toString().padStart(2, '0')} - ${item.reason}`;
        dot.dataset.tooltip = tooltipText;
        dot.removeAttribute('title');

        // Show custom tooltip immediately on hover
        dot.addEventListener('mouseenter', (e) => {
            tooltipEl.textContent = dot.dataset.tooltip;
            tooltipEl.style.display = 'block';
            tooltipEl.style.opacity = '1';
            positionTooltip(e);
        });
        dot.addEventListener('mousemove', (e) => {
            positionTooltip(e);
        });
        dot.addEventListener('mouseleave', () => {
            tooltipEl.style.opacity = '0';
            tooltipEl.style.display = 'none';
        });

        grid.appendChild(dot);
    });

    // Create X-axis (time of day) constrained to data range
    const xAxis = document.createElement('div');
    xAxis.className = 'scatter-x-axis';

    // Start at floored hour of minPad and show each hour with a grid line and label
    const startHour = Math.floor(minPad);
    const endHour = Math.ceil(maxPad);

    // Helper to format hour labels as 12-hour time with AM/PM
    function formatHourLabel(hour24) {
        const suffix = hour24 >= 12 ? 'pm' : 'am';
        let hour12 = hour24 % 12;
        if (hour12 === 0) hour12 = 12;
        return `${hour12} ${suffix}`;
    }

    for (let t = startHour; t <= endHour; t++) {
        const posPercent = ((t - minPad) / range) * 100;

        // Create vertical grid line in the plot grid (always shown)
        const line = document.createElement('div');
        line.className = 'x-grid-line';
        line.style.left = `${Math.max(0, Math.min(100, posPercent))}%`;
        grid.appendChild(line);

        // Create hour label, but skip the first and last hour to avoid edge clipping
        if (t !== startHour && t !== endHour) {
            const label = document.createElement('div');
            label.className = 'x-axis-label';
            label.style.left = `${Math.max(0, Math.min(100, posPercent))}%`;
            // Format hour in 12-hour format with AM/PM
            const displayHour24 = ((t % 24) + 24) % 24;
            label.textContent = formatHourLabel(displayHour24);
            xAxis.appendChild(label);
        }
    }

    // Assemble the plot
    const plotWrapper = document.createElement('div');
    plotWrapper.className = 'scatter-plot-wrapper';
    plotWrapper.appendChild(yAxis);
    plotWrapper.appendChild(grid);

    plotArea.appendChild(plotWrapper);
    plotArea.appendChild(xAxis);

    // Create legend
    const legend = document.createElement('div');
    legend.className = 'scatter-legend';
    const legendTitle = document.createElement('div');
    legendTitle.className = 'legend-title';
    legendTitle.textContent = 'Sites:';
    legend.appendChild(legendTitle);

    uniqueSites.forEach(site => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const dot = document.createElement('div');
        dot.className = 'legend-dot';
        dot.style.backgroundColor = siteColors[site];

        const text = document.createElement('span');
        text.textContent = site;

        item.appendChild(dot);
        item.appendChild(text);
        legend.appendChild(item);
    });

    container.appendChild(plotArea);
    container.appendChild(legend);
}

// Display recent activity
function displayRecentActivity(data) {
    const container = document.getElementById('recentActivity');
    container.innerHTML = '';

    const recentData = [...data].reverse().slice(0, 20);

    recentData.forEach(item => {
        const activity = document.createElement('div');
        activity.className = 'activity-item';

        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString();

        // Handle both old and new field names
        const duration = item.timeAmountMinutes || item.timeAmount || 0;

        // Create elements safely to prevent XSS
        const timeDiv = document.createElement('div');
        timeDiv.className = 'activity-time';
        timeDiv.textContent = timeStr;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'activity-details';

        const siteStrong = document.createElement('strong');
        siteStrong.textContent = item.site;

        detailsDiv.appendChild(siteStrong);
        detailsDiv.appendChild(document.createTextNode(` • ${item.reason} • ${duration} min`));

        activity.appendChild(timeDiv);
        activity.appendChild(detailsDiv);

        container.appendChild(activity);
    });
}

// Export data to JSON
async function exportData() {
    try {
        const result = await chrome.storage.local.get(['unblockAnalytics']);
        const data = result.unblockAnalytics || [];

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `unblock-analytics-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);

        showStatus('Analytics data exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showStatus('Failed to export data', 'error');
    }
}

// Clear all analytics data
async function clearData() {
    if (!confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
        return;
    }

    try {
        await chrome.storage.local.remove('unblockAnalytics');
        showStatus('All analytics data cleared', 'success');

        // Reset the display
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (error) {
        console.error('Error clearing data:', error);
        showStatus('Failed to clear data', 'error');
    }
}

// Show status message
function showStatus(message, type = 'info') {
    // Create a status message element if it doesn't exist
    let statusElement = document.getElementById('statusMessage');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'statusMessage';
        statusElement.className = 'status-message';
        document.querySelector('.container').appendChild(statusElement);
    }

    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';

    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Go back to settings
function goBack() {
    chrome.runtime.openOptionsPage();
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadAnalytics();

    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('clearBtn').addEventListener('click', clearData);
});
