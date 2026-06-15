// Analytics page script

// Load and display analytics data
async function loadAnalytics() {
    try {
        const result = await browser.storage.local.get(['unblockAnalytics']);
        const data = result.unblockAnalytics || [];

        if (data.length === 0) {
            return;
        }

        displaySummaryStats(data);
        displayReasonChart(data);
        displaySiteChart(data);
        displayDailyChart(data);
        displayDayOfWeekChart(data);
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
        '#e63946', '#4cc9f0', '#06ffa5', '#f77f00', '#9d4edd',
        '#ffea00', '#06d6a0', '#ff006e', '#a29bfe', '#95d600'
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

    // Assign colors to unique sites
    const uniqueSites = [...new Set(data.map(item => item.site))];
    const siteColors = {};
    const colors = [
        '#e63946', '#4cc9f0', '#06ffa5', '#f77f00', '#9d4edd',
        '#ffea00', '#06d6a0', '#ff006e', '#a29bfe', '#95d600'
    ];
    uniqueSites.forEach((site, index) => {
        siteColors[site] = colors[index % colors.length];
    });

    // Count unblocks by site, broken down by reason
    const siteData = {};
    data.forEach(item => {
        if (!siteData[item.site]) {
            siteData[item.site] = { total: 0, reasons: {} };
        }
        siteData[item.site].total++;
        siteData[item.site].reasons[item.reason] = (siteData[item.site].reasons[item.reason] || 0) + 1;
    });

    const container = document.getElementById('siteChart');
    container.innerHTML = '';

    const sortedSites = Object.entries(siteData).sort((a, b) => b[1].total - a[1].total).slice(0, 10);

    if (sortedSites.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    const maxCount = sortedSites[0][1].total;

    // Compute total distinct days across all records for avg/day
    const allDays = new Set();
    data.forEach(item => {
        const d = new Date(item.timestamp);
        allDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    const totalDays = allDays.size;

    sortedSites.forEach(([site, { total, reasons }]) => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';

        const label = document.createElement('div');
        label.className = 'chart-label';

        const siteName = document.createElement('div');
        siteName.textContent = site;
        siteName.style.fontSize = '0.9rem';
        siteName.style.fontWeight = '600';

        const avgPerDay = total / totalDays;
        const avgLabel = document.createElement('div');
        avgLabel.textContent = `${Number.isInteger(avgPerDay) ? avgPerDay : avgPerDay.toFixed(2)} visits/day`;
        avgLabel.style.fontSize = '0.75rem';
        avgLabel.style.color = 'var(--text-secondary)';
        avgLabel.style.fontWeight = '400';
        avgLabel.style.marginTop = '2px';

        label.appendChild(siteName);
        label.appendChild(avgLabel);

        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';
        barContainer.style.height = '44px';

        const barFill = document.createElement('div');
        barFill.className = 'bar-fill';
        barFill.style.width = `${(total / maxCount) * 100}%`;
        barFill.style.display = 'flex';
        barFill.style.overflow = 'hidden';

        // Create a segment for each reason, all using the site's color
        const sortedReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
        sortedReasons.forEach(([reason, count], idx) => {
            // Resolve emoji from data, localStorage, or fallback map
            const entryWithEmoji = data.slice().reverse().find(item =>
                item.reason === reason && item.emoji && item.emoji.trim() !== ''
            );
            const localReason = localStorageReasons.find(r => r.label === reason);
            const emoji = entryWithEmoji?.emoji || localReason?.emoji || reasonEmojiMap[reason] || '';

            const segment = document.createElement('div');
            segment.style.width = `${(count / total) * 100}%`;
            segment.style.height = '100%';
            segment.style.backgroundColor = siteColors[site];
            segment.style.position = 'relative';
            segment.style.display = 'flex';
            segment.style.alignItems = 'center';
            segment.style.justifyContent = 'center';
            segment.style.boxSizing = 'border-box';
            // Add a left divider line between segments (not on the first)
            if (idx > 0) {
                segment.style.borderLeft = '2px solid rgba(0,0,0,0.35)';
            }
            segment.title = `${emoji ? emoji + ' ' : ''}${reason}: ${count}`;

            const segmentText = document.createElement('span');
            segmentText.textContent = emoji || reason.charAt(0);
            segmentText.style.fontSize = '13px';
            segmentText.style.lineHeight = 'normal';
            segmentText.style.color = 'white';
            segmentText.style.textShadow = '0 1px 2px rgba(0,0,0,0.6)';
            segmentText.style.fontWeight = '500';
            segmentText.style.whiteSpace = 'nowrap';
            segmentText.style.overflow = 'hidden';
            segmentText.style.padding = '0 3px';
            segment.appendChild(segmentText);

            barFill.appendChild(segment);
        });

        const barValue = document.createElement('div');
        barValue.className = 'bar-value';
        barValue.textContent = total;
        barValue.style.textShadow = '0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)';

        barContainer.appendChild(barFill);
        barContainer.appendChild(barValue);

        bar.appendChild(label);
        bar.appendChild(barContainer);

        container.appendChild(bar);
    });
}

// Display unblocks-per-day vertical bar chart
function displayDailyChart(data) {
    const container = document.getElementById('dailyChart');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    // Assign consistent colors to unique sites (same palette as other charts)
    const uniqueSites = [...new Set(data.map(item => item.site))];
    const siteColors = {};
    const colors = [
        '#e63946', '#4cc9f0', '#06ffa5', '#f77f00', '#9d4edd',
        '#ffea00', '#06d6a0', '#ff006e', '#a29bfe', '#95d600'
    ];
    uniqueSites.forEach((site, index) => {
        siteColors[site] = colors[index % colors.length];
    });

    // Aggregate unblocks per calendar day
    const dailyCounts = {};
    data.forEach(item => {
        const d = new Date(item.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!dailyCounts[key]) dailyCounts[key] = { total: 0, sites: {} };
        dailyCounts[key].total++;
        dailyCounts[key].sites[item.site] = (dailyCounts[key].sites[item.site] || 0) + 1;
    });

    // Build array of every day from the first recorded entry through today
    const sortedKeys = Object.keys(dailyCounts).sort();
    const firstDate = new Date(sortedKeys[0] + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allDays = [];
    const cursor = new Date(firstDate);
    while (cursor <= today) {
        allDays.push(
            `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
        );
        cursor.setDate(cursor.getDate() + 1);
    }

    const yMax = Math.max(...Object.values(dailyCounts).map(d => d.total), 1);
    const CHART_HEIGHT = 200; // px
    const BAR_WIDTH = 20;     // px per bar
    const BAR_GAP = 3;        // px between bars

    // Compute ~5 nicely-rounded y-axis tick values
    function computeYTicks(max) {
        if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i);
        const roughStep = max / 4;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const step = Math.ceil(roughStep / magnitude) * magnitude;
        const ticks = [];
        for (let v = 0; v <= max; v += step) ticks.push(v);
        if (ticks[ticks.length - 1] < max) ticks.push(max);
        return ticks;
    }
    const yTicks = computeYTicks(yMax);

    // Show an x-axis label every N days to prevent crowding
    const labelEvery = allDays.length <= 14 ? 1 : allDays.length <= 31 ? 3 : allDays.length <= 90 ? 7 : 14;

    // ---- Build DOM ----

    const scroll = document.createElement('div');
    scroll.className = 'daily-chart-scroll';

    // Grid: y-axis column | bars+x-axis column
    const inner = document.createElement('div');
    inner.className = 'daily-chart-inner';

    // --- Y-axis ---
    const yAxisCol = document.createElement('div');
    yAxisCol.className = 'daily-y-axis';
    yAxisCol.style.height = `${CHART_HEIGHT}px`;

    yTicks.forEach(tick => {
        const lbl = document.createElement('div');
        lbl.className = 'daily-y-label';
        lbl.textContent = tick;
        // bottom: X% centers the label at the tick height; translateY(50%) corrects for label height
        lbl.style.bottom = `${(tick / yMax) * 100}%`;
        yAxisCol.appendChild(lbl);
    });

    // --- Right column: bars area + x-axis ---
    const rightCol = document.createElement('div');
    rightCol.className = 'daily-chart-right';

    const barsArea = document.createElement('div');
    barsArea.className = 'daily-bars-area';
    barsArea.style.height = `${CHART_HEIGHT}px`;

    // Horizontal gridlines at each y tick
    yTicks.forEach(tick => {
        const gl = document.createElement('div');
        gl.className = 'daily-y-gridline';
        gl.style.bottom = `${(tick / yMax) * 100}%`;
        barsArea.appendChild(gl);
    });

    // Shared tooltip — attached to body with position:fixed so it's never clipped
    // by the overflow scroll container.
    const existingDailyTooltip = document.getElementById('dailyChartTooltip');
    if (existingDailyTooltip) existingDailyTooltip.remove();
    const tooltipEl = document.createElement('div');
    tooltipEl.id = 'dailyChartTooltip';
    tooltipEl.className = 'dot-tooltip';
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.display = 'none';
    tooltipEl.style.zIndex = '9999';
    document.body.appendChild(tooltipEl);

    function positionTooltip(e) {
        const tipW = tooltipEl.offsetWidth || 220;
        const tipH = tooltipEl.offsetHeight || 28;
        let left = e.clientX + 14;
        let top = e.clientY - 36;
        // Flip left if tooltip would overflow the right edge of the viewport
        if (left + tipW > window.innerWidth - 8) left = e.clientX - tipW - 8;
        // Keep within top of viewport
        if (top < 8) top = e.clientY + 14;
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    }

    const barsContainer = document.createElement('div');
    barsContainer.className = 'daily-bars';
    barsArea.appendChild(barsContainer);

    const xAxis = document.createElement('div');
    xAxis.className = 'daily-x-axis';

    allDays.forEach((dayKey, index) => {
        const colWidth = BAR_WIDTH + BAR_GAP;

        // Bar column
        const col = document.createElement('div');
        col.className = 'daily-bar-col';
        col.style.width = `${BAR_WIDTH}px`;
        col.style.marginRight = `${BAR_GAP}px`;

        const dayData = dailyCounts[dayKey];
        if (dayData && dayData.total > 0) {
            const barHeightPx = Math.max(2, (dayData.total / yMax) * CHART_HEIGHT);
            const stack = document.createElement('div');
            stack.className = 'daily-bar-stack';
            stack.style.height = `${barHeightPx}px`;

            const sortedSites = Object.entries(dayData.sites).sort((a, b) => b[1] - a[1]);
            sortedSites.forEach(([site, count]) => {
                const seg = document.createElement('div');
                seg.className = 'daily-bar-segment';
                seg.style.height = `${(count / dayData.total) * 100}%`;
                seg.style.backgroundColor = siteColors[site];

                const d = new Date(dayKey + 'T00:00:00');
                const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const tooltipText = `${dateStr} \u2014 ${site}: ${count} unblock${count !== 1 ? 's' : ''} (${dayData.total} total)`;

                seg.addEventListener('mouseenter', (e) => {
                    tooltipEl.textContent = tooltipText;
                    tooltipEl.style.display = 'block';
                    tooltipEl.style.opacity = '1';
                    positionTooltip(e);
                });
                seg.addEventListener('mousemove', positionTooltip);
                seg.addEventListener('mouseleave', () => {
                    tooltipEl.style.opacity = '0';
                    tooltipEl.style.display = 'none';
                });

                stack.appendChild(seg);
            });

            col.appendChild(stack);
        }

        barsContainer.appendChild(col);

        // X-axis label — only on interval days to avoid crowding
        const xLabel = document.createElement('div');
        xLabel.className = 'daily-x-label';
        xLabel.style.width = `${colWidth}px`;
        if (index % labelEvery === 0) {
            const d = new Date(dayKey + 'T00:00:00');
            xLabel.textContent = `${d.getMonth() + 1}/${d.getDate()}`;
        }
        xAxis.appendChild(xLabel);
    });

    rightCol.appendChild(barsArea);
    rightCol.appendChild(xAxis);

    inner.appendChild(yAxisCol);
    inner.appendChild(rightCol);
    scroll.appendChild(inner);
    container.appendChild(scroll);

    // Scroll to the right so the newest entries are visible first
    requestAnimationFrame(() => { scroll.scrollLeft = scroll.scrollWidth; });

    // Legend (reuses scatter-legend style)
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

    container.appendChild(legend);
}

// Display unblocks by day of week vertical bar chart
// Y-axis: average unblocks per occurrence of that weekday, segmented by site
function displayDayOfWeekChart(data) {
    const container = document.getElementById('dowChart');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Assign consistent colors to all sites across the full dataset so colors
    // don't shift when the range is narrowed to a subset of sites.
    const uniqueSites = [...new Set(data.map(item => item.site))];
    const siteColors = {};
    const colors = [
        '#e63946', '#4cc9f0', '#06ffa5', '#f77f00', '#9d4edd',
        '#ffea00', '#06d6a0', '#ff006e', '#a29bfe', '#95d600'
    ];
    uniqueSites.forEach((site, index) => {
        siteColors[site] = colors[index % colors.length];
    });

    // Determine the full extent of the data for input min/max
    const firstTimestamp = Math.min(...data.map(item => item.timestamp));
    const globalFirstDate = new Date(firstTimestamp);
    globalFirstDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function toInputValue(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // ── Date range controls ──────────────────────────────────────────────────
    const controls = document.createElement('div');
    controls.className = 'dow-range-controls';

    function makeControl(labelText, value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'dow-range-field';
        const lbl = document.createElement('label');
        lbl.className = 'dow-range-label';
        lbl.textContent = labelText;
        const input = document.createElement('input');
        input.type = 'date';
        input.className = 'dow-range-input';
        input.min = toInputValue(globalFirstDate);
        input.max = toInputValue(today);
        input.value = value;
        wrapper.appendChild(lbl);
        wrapper.appendChild(input);
        controls.appendChild(wrapper);
        return input;
    }

    const fromInput = makeControl('From', toInputValue(globalFirstDate));
    const toInput = makeControl('To', toInputValue(today));
    container.appendChild(controls);

    // ── Shared fixed-position tooltip (created once, reused across re-renders) ─
    const existingTooltip = document.getElementById('dowChartTooltip');
    if (existingTooltip) existingTooltip.remove();
    const tooltipEl = document.createElement('div');
    tooltipEl.id = 'dowChartTooltip';
    tooltipEl.className = 'dot-tooltip';
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.display = 'none';
    tooltipEl.style.zIndex = '9999';
    document.body.appendChild(tooltipEl);

    function positionTooltip(e) {
        const tipW = tooltipEl.offsetWidth || 220;
        let left = e.clientX + 14;
        let top = e.clientY - 36;
        if (left + tipW > window.innerWidth - 8) left = e.clientX - tipW - 8;
        if (top < 8) top = e.clientY + 14;
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    }

    // ── Chart body (rebuilt on every range change) ───────────────────────────
    const chartBody = document.createElement('div');
    container.appendChild(chartBody);

    function renderChart() {
        chartBody.innerHTML = '';
        tooltipEl.style.display = 'none';

        const fromDate = new Date(fromInput.value + 'T00:00:00');
        const toDate = new Date(toInput.value + 'T00:00:00');

        if (isNaN(fromDate) || isNaN(toDate) || fromDate > toDate) {
            chartBody.innerHTML = '<p class="empty-state">Invalid date range</p>';
            return;
        }

        // Filter events to the selected range
        const filtered = data.filter(item => {
            const d = new Date(item.timestamp);
            d.setHours(0, 0, 0, 0);
            return d >= fromDate && d <= toDate;
        });

        if (filtered.length === 0) {
            chartBody.innerHTML = '<p class="empty-state">No data in this range</p>';
            return;
        }

        // Sites present in this range (preserves global color assignments)
        const rangeSites = [...new Set(filtered.map(item => item.site))];

        // Count how many times each weekday occurs within the selected range
        const dayOccurrences = [0, 0, 0, 0, 0, 0, 0];
        const cursor = new Date(fromDate);
        while (cursor <= toDate) {
            dayOccurrences[cursor.getDay()]++;
            cursor.setDate(cursor.getDate() + 1);
        }

        // Count raw unblocks by DOW and site
        const dowSiteCounts = Array.from({ length: 7 }, () => ({}));
        filtered.forEach(item => {
            const dow = new Date(item.timestamp).getDay();
            dowSiteCounts[dow][item.site] = (dowSiteCounts[dow][item.site] || 0) + 1;
        });

        // Average per site per occurrence (zeros included)
        const numRangeSites = rangeSites.length || 1;
        const dowAvgs = dowSiteCounts.map((siteCounts, dow) => {
            const denom = (dayOccurrences[dow] || 1) * numRangeSites;
            const avgs = {};
            Object.entries(siteCounts).forEach(([site, count]) => {
                avgs[site] = count / denom;
            });
            return avgs;
        });

        const dowTotals = dowAvgs.map(avgs => Object.values(avgs).reduce((s, v) => s + v, 0));
        const yMax = Math.max(...dowTotals, 1);

        const CHART_HEIGHT = 200;

        function computeYTicks(max) {
            if (max <= 1) return [0, 0.25, 0.5, 0.75, 1];
            if (max <= 4) {
                const step = max <= 2 ? 0.5 : 1;
                const ticks = [];
                for (let v = 0; v <= max + step * 0.5; v += step) ticks.push(Math.round(v * 100) / 100);
                return ticks;
            }
            const roughStep = max / 4;
            const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
            const step = Math.ceil(roughStep / magnitude) * magnitude;
            const ticks = [];
            for (let v = 0; v <= max; v += step) ticks.push(v);
            if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
            return ticks;
        }

        const yTicks = computeYTicks(yMax);
        const yAxisMax = yTicks[yTicks.length - 1] || yMax;

        // Wrapper grid
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'dow-chart-wrapper';

        // Y-axis
        const yAxisCol = document.createElement('div');
        yAxisCol.className = 'daily-y-axis';
        yAxisCol.style.height = `${CHART_HEIGHT}px`;
        yTicks.forEach(tick => {
            const lbl = document.createElement('div');
            lbl.className = 'daily-y-label';
            lbl.textContent = Number.isInteger(tick) ? tick : tick.toFixed(2);
            lbl.style.bottom = `${(tick / yAxisMax) * 100}%`;
            yAxisCol.appendChild(lbl);
        });

        // Right column
        const rightCol = document.createElement('div');
        rightCol.className = 'daily-chart-right';
        rightCol.style.flex = '1';

        const barsArea = document.createElement('div');
        barsArea.className = 'daily-bars-area';
        barsArea.style.height = `${CHART_HEIGHT}px`;

        yTicks.forEach(tick => {
            const gl = document.createElement('div');
            gl.className = 'daily-y-gridline';
            gl.style.bottom = `${(tick / yAxisMax) * 100}%`;
            barsArea.appendChild(gl);
        });

        const barsContainer = document.createElement('div');
        barsContainer.className = 'daily-bars dow-bars';
        barsArea.appendChild(barsContainer);

        const xAxis = document.createElement('div');
        xAxis.className = 'daily-x-axis dow-x-axis';

        DAY_NAMES.forEach((dayName, dow) => {
            const avgsBySite = dowAvgs[dow];
            const total = dowTotals[dow];

            const col = document.createElement('div');
            col.className = 'dow-bar-col';

            if (total > 0) {
                const barHeightPx = Math.max(2, (total / yAxisMax) * CHART_HEIGHT);
                const stack = document.createElement('div');
                stack.className = 'dow-bar-stack';
                stack.style.height = `${barHeightPx}px`;

                Object.entries(avgsBySite).sort((a, b) => b[1] - a[1]).forEach(([site, avg]) => {
                    const seg = document.createElement('div');
                    seg.className = 'daily-bar-segment';
                    seg.style.height = `${(avg / total) * 100}%`;
                    seg.style.backgroundColor = siteColors[site];

                    const avgStr = Number.isInteger(avg) ? avg : avg.toFixed(2);
                    const tipText = `${dayName} \u2014 ${site}: ${avgStr} avg unblock${avg !== 1 ? 's' : ''}`;

                    seg.addEventListener('mouseenter', (e) => {
                        tooltipEl.textContent = tipText;
                        tooltipEl.style.display = 'block';
                        tooltipEl.style.opacity = '1';
                        positionTooltip(e);
                    });
                    seg.addEventListener('mousemove', positionTooltip);
                    seg.addEventListener('mouseleave', () => {
                        tooltipEl.style.opacity = '0';
                        tooltipEl.style.display = 'none';
                    });

                    stack.appendChild(seg);
                });

                col.appendChild(stack);
            }

            barsContainer.appendChild(col);

            const xLabel = document.createElement('div');
            xLabel.className = 'dow-x-label';
            xLabel.textContent = DAY_SHORT[dow];
            xAxis.appendChild(xLabel);
        });

        rightCol.appendChild(barsArea);
        rightCol.appendChild(xAxis);
        chartWrapper.appendChild(yAxisCol);
        chartWrapper.appendChild(rightCol);
        chartBody.appendChild(chartWrapper);

        // Legend — only sites present in the selected range
        const legend = document.createElement('div');
        legend.className = 'scatter-legend';
        const legendTitle = document.createElement('div');
        legendTitle.className = 'legend-title';
        legendTitle.textContent = 'Sites:';
        legend.appendChild(legendTitle);

        rangeSites.forEach(site => {
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

        chartBody.appendChild(legend);
    }

    const resetBtn = document.createElement('button');
    resetBtn.className = 'dow-range-reset';
    resetBtn.textContent = 'Reset';
    controls.appendChild(resetBtn);

    fromInput.addEventListener('change', () => {
        // Clamp: "from" must not exceed "to"
        if (fromInput.value > toInput.value) toInput.value = fromInput.value;
        renderChart();
    });
    toInput.addEventListener('change', () => {
        // Clamp: "to" must not be before "from"
        if (toInput.value < fromInput.value) fromInput.value = toInput.value;
        renderChart();
    });
    resetBtn.addEventListener('click', () => {
        fromInput.value = toInputValue(globalFirstDate);
        toInput.value = toInputValue(today);
        renderChart();
    });

    renderChart();
}

// Sort reasons by site-profile similarity so rows with similar site distributions are adjacent.
// Algorithm: build a normalized site-frequency vector per reason, then do a greedy
// nearest-neighbor traversal using cosine similarity, starting from the most-active reason.
function sortReasonsBySiteProfile(reasons, data, uniqueSites) {
    if (reasons.length <= 2) return reasons;

    // Build a normalized site-frequency vector for each reason
    const profiles = {};
    reasons.forEach(reason => {
        const vec = {};
        uniqueSites.forEach(site => vec[site] = 0);
        const events = data.filter(d => d.reason === reason);
        events.forEach(d => vec[d.site]++);
        const total = events.length;
        // Normalize so each vector sums to 1 (pure proportion)
        uniqueSites.forEach(site => vec[site] /= (total || 1));
        profiles[reason] = vec;
    });

    // Cosine similarity between two profile vectors
    function cosineSim(a, b) {
        let dot = 0, magA = 0, magB = 0;
        uniqueSites.forEach(site => {
            dot += a[site] * b[site];
            magA += a[site] * a[site];
            magB += b[site] * b[site];
        });
        if (magA === 0 || magB === 0) return 0;
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }

    // Start from the reason with the most events (most representative anchor)
    const counts = {};
    reasons.forEach(r => counts[r] = data.filter(d => d.reason === r).length);
    const start = reasons.reduce((a, b) => counts[a] >= counts[b] ? a : b);

    // Greedy nearest-neighbor chain: always append the most similar unvisited reason
    const visited = new Set([start]);
    const ordered = [start];
    while (ordered.length < reasons.length) {
        const current = ordered[ordered.length - 1];
        let bestSim = -Infinity, bestNext = null;
        reasons.forEach(r => {
            if (!visited.has(r)) {
                const sim = cosineSim(profiles[current], profiles[r]);
                if (sim > bestSim) {
                    bestSim = sim;
                    bestNext = r;
                }
            }
        });
        ordered.push(bestNext);
        visited.add(bestNext);
    }

    return ordered;
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
        '#4cc9f0', // Sky blue
        '#06ffa5', // Bright cyan
        '#f77f00', // Vivid orange
        '#9d4edd', // Purple
        '#ffea00', // Yellow
        '#06d6a0', // Teal
        '#ff006e', // Hot pink
        '#a29bfe', // Lavender
        '#95d600'  // Lime green
    ];
    uniqueSites.forEach((site, index) => {
        siteColors[site] = colors[index % colors.length];
    });

    // Get unique reasons for Y-axis, sorted by site-profile similarity for better insight
    const rawUniqueReasons = [...new Set(data.map(item => item.reason))];
    const uniqueReasons = sortReasonsBySiteProfile(rawUniqueReasons, data, uniqueSites);

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
        const result = await browser.storage.local.get(['unblockAnalytics']);
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

// Import and merge analytics data from a JSON file
function importData() {
    document.getElementById('importFileInput').click();
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset so the same file can be re-imported if needed
    event.target.value = '';

    try {
        const text = await file.text();
        let imported;
        try {
            imported = JSON.parse(text);
        } catch {
            showStatus('Invalid JSON file', 'error');
            return;
        }

        if (!Array.isArray(imported)) {
            showStatus('File does not contain an analytics array', 'error');
            return;
        }

        // Validate entries have the expected shape
        const valid = imported.filter(entry =>
            entry && typeof entry.timestamp === 'number' &&
            typeof entry.site === 'string' &&
            typeof entry.reason === 'string'
        );

        if (valid.length === 0) {
            showStatus('No valid analytics entries found in file', 'error');
            return;
        }

        // Merge with existing data, deduplicating by timestamp across both sources
        const result = await browser.storage.local.get(['unblockAnalytics']);
        const existing = result.unblockAnalytics || [];

        const seenTimestamps = new Set(existing.map(e => e.timestamp));
        const newEntries = valid.filter(e => {
            if (seenTimestamps.has(e.timestamp)) return false;
            seenTimestamps.add(e.timestamp); // also dedupe within the imported file
            return true;
        });

        if (newEntries.length === 0) {
            showStatus('No new entries to import (all already exist)', 'info');
            return;
        }

        const merged = [...existing, ...newEntries].sort((a, b) => a.timestamp - b.timestamp);
        await browser.storage.local.set({ unblockAnalytics: merged });

        showStatus(`Imported ${newEntries.length} new entr${newEntries.length === 1 ? 'y' : 'ies'}`, 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        console.error('Error importing data:', error);
        showStatus('Failed to import data', 'error');
    }
}

// Clear all analytics data
async function clearData() {
    if (!confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
        return;
    }

    try {
        await browser.storage.local.remove('unblockAnalytics');
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
    browser.runtime.openOptionsPage();
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadAnalytics();

    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', importData);
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    document.getElementById('clearBtn').addEventListener('click', clearData);
});
