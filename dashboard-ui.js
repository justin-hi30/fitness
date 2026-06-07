document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT = {
        caloriesConsumed: 1680,
        calorieTarget: 2200,
        water: 6,
        waterTarget: 8
    };

    const stateKey = 'fit_dashboard_state_v1';

    const selectors = {
        sidebarCalories: '#sidebar-calories',
        sidebarCaloriesFill: '#sidebar-calories-fill',
        sidebarWater: '#sidebar-water',
        sidebarWaterFill: '#sidebar-water-fill',
        dashboardCalories: '#dashboard-calories',
        caloriesRemaining: '#calories-remaining',
        goalCompletion: '#goal-completion',
        goalProgressFill: '#goal-progress-fill',
        waterStatus: '#water-status',
        waterGlasses: '#water-glasses',
        addWaterButton: '#add-water-button',
        navItems: '.nav-item',
        toggleTheme: '#toggle-theme',
        globalSearch: '#global-search'
    };

    let state = loadState() || DEFAULT;

    function saveState() {
        try { localStorage.setItem(stateKey, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(stateKey);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function updateUI() {
        const caloriesPercent = clamp(Math.round((state.caloriesConsumed / state.calorieTarget) * 100), 0, 100);
        const waterPercent = clamp(Math.round((state.water / state.waterTarget) * 100), 0, 100);

        const sidebarCaloriesEl = qs(selectors.sidebarCalories);
        const dashboardCaloriesEl = qs(selectors.dashboardCalories);
        const caloriesRemainingEl = qs(selectors.caloriesRemaining);
        const goalCompletionEl = qs(selectors.goalCompletion);
        const goalProgressFillEl = qs(selectors.goalProgressFill);
        const sidebarCaloriesFillEl = qs(selectors.sidebarCaloriesFill);
        const sidebarWaterEl = qs(selectors.sidebarWater);
        const sidebarWaterFillEl = qs(selectors.sidebarWaterFill);
        const waterStatusEl = qs(selectors.waterStatus);

        if (sidebarCaloriesEl) sidebarCaloriesEl.textContent = `${state.caloriesConsumed.toLocaleString()} / ${state.calorieTarget}`;
        if (dashboardCaloriesEl) dashboardCaloriesEl.textContent = `${state.caloriesConsumed.toLocaleString()} / ${state.calorieTarget} kcal`;

        const remaining = state.calorieTarget - state.caloriesConsumed;
        if (caloriesRemainingEl) caloriesRemainingEl.textContent = `${remaining} kcal`;

        if (goalCompletionEl) goalCompletionEl.textContent = `${caloriesPercent}%`;
        if (goalProgressFillEl) goalProgressFillEl.style.width = `${caloriesPercent}%`;
        if (sidebarCaloriesFillEl) sidebarCaloriesFillEl.style.width = `${caloriesPercent}%`;

        if (sidebarWaterEl) sidebarWaterEl.textContent = `${state.water} / ${state.waterTarget} glasses`;
        if (waterStatusEl) waterStatusEl.textContent = `${state.water} / ${state.waterTarget} glasses`;
        if (sidebarWaterFillEl) sidebarWaterFillEl.style.width = `${waterPercent}%`;

        renderWaterGlasses();
        saveState();
    }

    function renderWaterGlasses() {
        const container = qs(selectors.waterGlasses);
        if (!container) return;
        container.innerHTML = '';
        for (let i = 1; i <= state.waterTarget; i++) {
            const glass = document.createElement('button');
            glass.type = 'button';
            glass.className = 'glass' + (i <= state.water ? ' filled' : '');
            glass.dataset.index = String(i);
            glass.setAttribute('aria-pressed', String(i <= state.water));
            glass.title = `${i} glass${i > 1 ? 'es' : ''}`;
            glass.innerHTML = `<span class="glass-label">${i}</span>`;
            glass.addEventListener('click', (ev) => {
                const idx = Number(ev.currentTarget.dataset.index || '0');
                if (Number.isNaN(idx)) return;
                // If clicking the currently last filled glass, toggle it off; else fill up to clicked index
                if (state.water === idx) state.water = idx - 1;
                else state.water = idx;
                state.water = clamp(state.water, 0, state.waterTarget);
                updateUI();
            });
            container.appendChild(glass);
        }
    }

    // +1 Glass button
    const addWaterBtn = qs(selectors.addWaterButton);
    if (addWaterBtn) {
        addWaterBtn.addEventListener('click', () => {
            state.water = clamp(state.water + 1, 0, state.waterTarget);
            updateUI();
        });
    }

    // Allow updating calories by clicking the calories readout (dashboard or sidebar)
    const dashboardCaloriesClickable = qs(selectors.dashboardCalories);
    const sidebarCaloriesClickable = qs(selectors.sidebarCalories);
    [dashboardCaloriesClickable, sidebarCaloriesClickable].forEach((el) => {
        if (!el) return;
        el.style.cursor = 'pointer';
        el.title = 'Click to update consumed calories';
        el.addEventListener('click', () => {
            const input = prompt('Enter calories consumed (number)', String(state.caloriesConsumed));
            if (input == null) return;
            const n = parseInt(input.replace(/[^0-9-]/g, ''), 10);
            if (!Number.isFinite(n)) return;
            state.caloriesConsumed = n;
            updateUI();
        });
    });

    // Navigation: toggle active class
    qsa(selectors.navItems).forEach(btn => {
        btn.addEventListener('click', (ev) => {
            qsa(selectors.navItems).forEach(b => b.classList.remove('active'));
            ev.currentTarget.classList.add('active');
        });
    });

    // Theme toggle: add/remove dark-theme on body
    const themeToggle = qs(selectors.toggleTheme);
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    }

    // Global search logging
    const globalSearch = qs(selectors.globalSearch);
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
            console.log('Global search:', e.target.value);
        });
    }

    // Initial render
    updateUI();
});
