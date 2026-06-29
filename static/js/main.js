document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------
    let allReleases = [];
    let activeFilters = new Set();
    let searchQuery = '';
    let isFetching = false;

    // -------------------------------------------------------------
    // DOM ELEMENTS
    // -------------------------------------------------------------
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const tagFilterList = document.getElementById('tag-filter-list');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const activeFiltersRow = document.getElementById('active-filters-row');
    const activeFiltersContainer = document.getElementById('active-filters-container');
    const releasesList = document.getElementById('releases-list');
    const noResults = document.getElementById('no-results');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const statusAlert = document.getElementById('status-alert');

    // Stats elements
    const totalCountVal = document.getElementById('total-count');
    const latestDateVal = document.getElementById('latest-date');
    const syncStatusVal = document.getElementById('sync-status');
    const cacheTimeVal = document.getElementById('cache-time');

    // -------------------------------------------------------------
    // THEME HANDLING (Light / Dark Mode)
    // -------------------------------------------------------------
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            updateThemeIcon('light');
        } else {
            body.classList.add('dark-theme');
            body.classList.remove('light-theme');
            updateThemeIcon('dark');
        }
    };

    const toggleTheme = () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            updateThemeIcon('light');
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            updateThemeIcon('dark');
        }
    };

    const updateThemeIcon = (theme) => {
        const iconSpan = themeToggleBtn.querySelector('.theme-icon');
        if (theme === 'light') {
            iconSpan.textContent = 'dark_mode';
            themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
        } else {
            iconSpan.textContent = 'light_mode';
            themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
        }
    };

    themeToggleBtn.addEventListener('click', toggleTheme);

    // -------------------------------------------------------------
    // DATA FETCHING & PARSING
    // -------------------------------------------------------------
    const fetchReleases = async (force = false) => {
        if (isFetching) return;
        setLoadingState(true);
        hideAlert();

        try {
            const url = `/api/releases${force ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.error) {
                showAlert(data.error, 'error');
            }

            allReleases = data.releases || [];
            
            // Format time and sync status
            updateStats(data);
            
            // Re-render
            renderTagFilters();
            filterAndRenderReleases();
        } catch (error) {
            console.error('Fetch error:', error);
            showAlert(`Failed to fetch release notes: ${error.message}`, 'error');
            setEmptyState();
        } finally {
            setLoadingState(false);
        }
    };

    const setLoadingState = (loading) => {
        isFetching = loading;
        if (loading) {
            refreshBtn.disabled = true;
            refreshIcon.classList.add('spinning');
            // Render skeleton loader cards
            releasesList.innerHTML = Array(3).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-body"></div>
                    <div class="skeleton-body short"></div>
                </div>
            `).join('');
            noResults.classList.add('hidden');
        } else {
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('spinning');
        }
    };

    const setEmptyState = () => {
        releasesList.innerHTML = '';
        totalCountVal.textContent = '0';
        latestDateVal.textContent = 'N/A';
        syncStatusVal.textContent = 'Failed';
        cacheTimeVal.textContent = 'Check connection';
    };

    const updateStats = (data) => {
        totalCountVal.textContent = allReleases.length;
        if (allReleases.length > 0) {
            // Find latest title (which is formatted as date, e.g., "June 29, 2026")
            latestDateVal.textContent = allReleases[0].title;
        } else {
            latestDateVal.textContent = 'N/A';
        }

        // Sync status formatting
        if (data.source === 'cache') {
            syncStatusVal.textContent = 'Cached';
            syncStatusVal.className = 'stat-value text-blue';
        } else if (data.source === 'network') {
            syncStatusVal.textContent = 'Live';
            syncStatusVal.className = 'stat-value text-green';
        } else if (data.source === 'fallback_cache') {
            syncStatusVal.textContent = 'Fallback Cache';
            syncStatusVal.className = 'stat-value text-purple';
        }

        if (data.last_fetched) {
            const date = new Date(data.last_fetched * 1000);
            cacheTimeVal.textContent = `Synced at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    };

    // -------------------------------------------------------------
    // FILTER & SEARCH LOGIC
    // -------------------------------------------------------------
    const countTags = () => {
        const counts = {};
        allReleases.forEach(release => {
            if (release.tags) {
                release.tags.forEach(tag => {
                    counts[tag] = (counts[tag] || 0) + 1;
                });
            }
        });
        return counts;
    };

    const renderTagFilters = () => {
        const tagCounts = countTags();
        // Sort tags alphabetically but put common ones first
        const sortedTags = Object.keys(tagCounts).sort((a, b) => {
            const priority = ['Feature', 'Change', 'Announcement', 'Issue', 'Deprecation'];
            const aIdx = priority.indexOf(a);
            const bIdx = priority.indexOf(b);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.localeCompare(b);
        });

        if (sortedTags.length === 0) {
            tagFilterList.innerHTML = '<p class="text-muted">No categories available</p>';
            return;
        }

        tagFilterList.innerHTML = sortedTags.map(tag => {
            const activeClass = activeFilters.has(tag) ? 'active' : '';
            const tagLower = tag.toLowerCase();
            return `
                <button class="filter-tag-btn ${activeClass} tag-${tagLower}" data-tag="${tag}">
                    <span>${tag}</span>
                    <span class="tag-count">${tagCounts[tag]}</span>
                </button>
            `;
        }).join('');

        // Re-bind tag click listeners
        document.querySelectorAll('.filter-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.getAttribute('data-tag');
                toggleTagFilter(tag);
            });
        });
    };

    const toggleTagFilter = (tag) => {
        if (activeFilters.has(tag)) {
            activeFilters.delete(tag);
        } else {
            activeFilters.add(tag);
        }
        renderTagFilters();
        renderActiveFilterBadges();
        filterAndRenderReleases();
    };

    const removeTagFilter = (tag) => {
        activeFilters.delete(tag);
        renderTagFilters();
        renderActiveFilterBadges();
        filterAndRenderReleases();
    };

    const renderActiveFilterBadges = () => {
        if (activeFilters.size === 0) {
            activeFiltersRow.classList.add('hidden');
            return;
        }
        
        activeFiltersRow.classList.remove('hidden');
        activeFiltersContainer.innerHTML = Array.from(activeFilters).map(tag => {
            const tagLower = tag.toLowerCase();
            return `
                <span class="active-badge tag-${tagLower}">
                    ${tag}
                    <span class="material-symbols-outlined" onclick="window.removeFilter('${tag}')">close</span>
                </span>
            `;
        }).join('');
    };

    // Expose remove filter globally for onclick handler
    window.removeFilter = removeTagFilter;

    const clearAllFilters = () => {
        activeFilters.clear();
        renderTagFilters();
        renderActiveFilterBadges();
        filterAndRenderReleases();
    };

    clearFiltersBtn.addEventListener('click', clearAllFilters);

    // Search Box Bindings
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        filterAndRenderReleases();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        filterAndRenderReleases();
    });

    resetAllBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        clearAllFilters();
    });

    // -------------------------------------------------------------
    // RENDER RELEASES FEED
    // -------------------------------------------------------------
    const filterAndRenderReleases = () => {
        let filtered = [...allReleases];

        // 1. Tag Filtering: if activeFilters is not empty, entry must match ALL selected filters (or ANY based on choice, let's do ANY for broader scoping, or ALL for strict. Let's match ANY active filter to be helpful, or ALL to be precise. Actually, matching ANY is standard. If they click Feature & Issue, they see both Features and Issues)
        if (activeFilters.size > 0) {
            filtered = filtered.filter(release => {
                if (!release.tags) return false;
                return release.tags.some(tag => activeFilters.has(tag));
            });
        }

        // 2. Search Query Filtering
        if (searchQuery) {
            filtered = filtered.filter(release => {
                const titleMatch = release.title.toLowerCase().includes(searchQuery);
                const contentMatch = release.content.toLowerCase().includes(searchQuery);
                const tagMatch = release.tags && release.tags.some(tag => tag.toLowerCase().includes(searchQuery));
                return titleMatch || contentMatch || tagMatch;
            });
        }

        // Render to DOM
        if (filtered.length === 0) {
            releasesList.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }

        noResults.classList.add('hidden');
        releasesList.classList.remove('hidden');

        releasesList.innerHTML = filtered.map(release => {
            const cardClasses = ['release-card'];
            // Determine primary classes for card styling accent color
            if (release.tags) {
                if (release.tags.includes('Feature')) cardClasses.push('has-feature');
                else if (release.tags.includes('Change')) cardClasses.push('has-change');
                else if (release.tags.includes('Announcement')) cardClasses.push('has-announcement');
                else if (release.tags.includes('Issue')) cardClasses.push('has-issue');
                else if (release.tags.includes('Deprecation')) cardClasses.push('has-deprecation');
            }

            const badgesHtml = (release.tags || []).map(tag => {
                const tagLower = tag.toLowerCase();
                return `<span class="release-badge tag-${tagLower}">${tag}</span>`;
            }).join('');

            // Format date nicely from updated field if available (e.g. 2026-06-29T00:00:00-07:00)
            let dateSub = '';
            if (release.updated) {
                try {
                    const dateObj = new Date(release.updated);
                    dateSub = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                } catch (e) {
                    dateSub = release.updated;
                }
            }

            return `
                <article class="${cardClasses.join(' ')}">
                    <header class="release-header">
                        <div class="release-meta">
                            <h2 class="release-title">${release.title}</h2>
                            ${dateSub ? `<span class="release-date-sub">${dateSub}</span>` : ''}
                        </div>
                        <div class="release-badges-container">
                            ${badgesHtml}
                        </div>
                    </header>
                    
                    <div class="release-content">
                        ${processReleaseContent(release.content)}
                    </div>
                    
                    ${release.link ? `
                    <div class="release-actions">
                        <a href="${release.link}" target="_blank" rel="noopener noreferrer" class="release-link-btn">
                            <span>Open in Google Cloud Docs</span>
                            <span class="material-symbols-outlined">open_in_new</span>
                        </a>
                    </div>
                    ` : ''}
                </article>
            `;
        }).join('');
    };

    /**
     * Process inner HTML of Google Cloud Release notes to add styling
     * classes on standard sub-tags like <h3> tags.
     */
    const processReleaseContent = (htmlContent) => {
        if (!htmlContent) return '';
        
        // We can parse the string or use regex. Since we render this directly,
        // let's add custom style tags dynamically if needed, or rely on CSS.
        // We will parse titles and inject custom tags as well.
        // For example, if we want to replace <h3>Feature</h3> with styled ones,
        // we can do it via CSS selection (.release-content h3).
        // Let's also ensure target="_blank" is added to any links inside the content.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Add target="_blank" and rel="noopener" to external links inside the content
        tempDiv.querySelectorAll('a').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });

        // Add class styling on inner headings based on header text
        tempDiv.querySelectorAll('h3').forEach(h3 => {
            const txt = h3.textContent.trim().toLowerCase();
            h3.classList.add(`tag-${txt}`);
            h3.classList.add('release-badge');
        });
        
        return tempDiv.innerHTML;
    };

    // -------------------------------------------------------------
    // ALERT SYSTEM
    // -------------------------------------------------------------
    const showAlert = (message, type = 'info') => {
        statusAlert.classList.remove('hidden');
        statusAlert.className = `alert ${type}`;
        statusAlert.querySelector('.alert-message').textContent = message;
        
        const iconSpan = statusAlert.querySelector('.alert-icon');
        iconSpan.textContent = type === 'error' ? 'error' : 'info';

        // Auto-dismiss errors after 8 seconds, info after 4 seconds
        setTimeout(() => {
            hideAlert();
        }, type === 'error' ? 8000 : 4000);
    };

    const hideAlert = () => {
        statusAlert.classList.add('hidden');
    };

    // -------------------------------------------------------------
    // INITIALIZATION & EVENT BINDINGS
    // -------------------------------------------------------------
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    initTheme();
    fetchReleases();
});
