const STORAGE_KEY = 'fitTrackStateV2';

class Storage {
    async load() {
        const payload = localStorage.getItem(STORAGE_KEY);
        if (!payload) return null;
        try {
            return JSON.parse(payload);
        } catch {
            console.warn('FitTrack storage contained invalid JSON and was reset.');
            return null;
        }
    }

    async save(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    async clear() {
        localStorage.removeItem(STORAGE_KEY);
    }
}

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

class Meal {
    constructor({ id, name, category, time, calories, protein, carbs, fats, isPerServing, servingsEaten, notes }) {
        this.id = id || `meal-${Date.now()}`;
        this.name = String(name || 'Untitled meal').trim();
        this.category = String(category || 'meal').trim();
        this.time = String(time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })).trim();

        // Backward compatible: older meals don't have these fields.
        this.isPerServing = Boolean(isPerServing);
        this.servingsEaten = Number(servingsEaten) || 1;
        if (!Number.isFinite(this.servingsEaten) || this.servingsEaten <= 0) this.servingsEaten = 1;
        this.notes = notes == null ? '' : String(notes);

        this.calories = Number(calories) || 0;
        this.protein = Number(protein) || 0;
        this.carbs = Number(carbs) || 0;
        this.fats = Number(fats) || 0;
    }
}


class Workout {
    constructor({ id, title, sets, reps, duration, calories, date }) {
        this.id = id || `workout-${Date.now()}`;
        this.title = String(title || 'Workout session').trim();
        this.sets = Number(sets) || 0;
        this.reps = Number(reps) || 0;
        this.duration = Number(duration) || 0;
        this.calories = Number(calories) || 0;
        this.date = String(date || new Date().toLocaleDateString()).trim();
    }
}

class WeightEntry {
    constructor({ date, weight }) {
        this.date = String(date || new Date().toLocaleDateString()).trim();
        this.weight = Number(weight) || 0;
    }
}

const defaultState = {
    settings: {
        theme: 'dark',
        units: 'metric'
    },
    profile: {
        name: 'FitTrack user',
        age: 28,
        gender: 'prefer not to say',
        unitSystem: 'metric',
        height: 170,
        weight: 71.5,
        activityLevel: 'moderate',
        goalType: 'maintain',
        weeklyWeightChangeGoal: 0,
        targetWeight: 68
    },
    goals: {
        calorieGoal: 2200,
        proteinGoal: 150,
        carbsGoal: 275,
        fatsGoal: 73,
        waterGoal: 8,
        workoutGoal: 4,
        targetWeight: 68
    },
    meals: [],
    workouts: [
        { id: 'w1', title: 'Upper body strength', sets: 4, reps: 10, duration: 45, calories: 320, date: 'Monday' },
        { id: 'w2', title: 'Cardio HIIT', sets: 5, reps: 12, duration: 30, calories: 280, date: 'Wednesday' },
        { id: 'w3', title: 'Lower body strength', sets: 4, reps: 10, duration: 50, calories: 360, date: 'Friday' }
    ],
    weightEntries: [
        { date: 'May 18', weight: 72.8 },
        { date: 'May 21', weight: 72.2 },
        { date: 'May 24', weight: 71.7 },
        { date: 'May 28', weight: 71.2 },
        { date: 'May 31', weight: 71.5 }
    ],
    measurements: [
        { label: 'Chest', value: '98 cm' },
        { label: 'Waist', value: '80 cm' },
        { label: 'Hips', value: '96 cm' }
    ],
    waterIntake: 0,
    currentSection: 'dashboard',
    foodDatabase: [
        { id: 'f1', name: 'Chicken breast', category: 'protein', calories: 165, protein: 31, carbs: 0, fats: 4, serving: '100g' },
        { id: 'f2', name: 'Brown rice', category: 'carbs', calories: 216, protein: 5, carbs: 45, fats: 2, serving: '1 cup' },
        { id: 'f3', name: 'Avocado toast', category: 'fats', calories: 320, protein: 9, carbs: 32, fats: 18, serving: '1 slice' },
        { id: 'f4', name: 'Greek yogurt', category: 'protein', calories: 130, protein: 15, carbs: 10, fats: 0, serving: '150g' },
        { id: 'f5', name: 'Banana', category: 'carbs', calories: 105, protein: 1, carbs: 27, fats: 0, serving: '1 medium' },
        { id: 'f6', name: 'Salmon fillet', category: 'protein', calories: 210, protein: 22, carbs: 0, fats: 12, serving: '100g' },
        { id: 'f7', name: 'Almond butter', category: 'fats', calories: 190, protein: 6, carbs: 7, fats: 16, serving: '2 tbsp' },
        { id: 'f8', name: 'Sweet potato', category: 'carbs', calories: 112, protein: 2, carbs: 26, fats: 0, serving: '150g' }
    ],
    filters: {
        foodCategory: 'all',
        mealSearch: '',
        globalSearch: ''
    }
};

class AppState {
    constructor() {
        this.state = clone(defaultState);
    }

    async load(storage) {
        const persisted = await storage.load();
        if (persisted) {
            const persistedMeals = clone(persisted.meals) || clone(defaultState.meals);
            const meals = this.isLegacyDefaultMealSeed(persistedMeals) ? clone(defaultState.meals) : persistedMeals;
            this.state = {
                settings: { ...clone(defaultState.settings), ...(persisted.settings || {}) },
                profile: { ...clone(defaultState.profile), ...(persisted.profile || {}) },
                goals: { ...clone(defaultState.goals), ...(persisted.goals || {}) },
                meals,
                workouts: clone(persisted.workouts) || clone(defaultState.workouts),
                weightEntries: clone(persisted.weightEntries) || clone(defaultState.weightEntries),
                measurements: clone(persisted.measurements) || clone(defaultState.measurements),
                waterIntake: Number(persisted.waterIntake ?? defaultState.waterIntake),
                currentSection: persisted.currentSection || defaultState.currentSection,
                foodDatabase: clone(defaultState.foodDatabase),
                filters: { ...clone(defaultState.filters), ...(persisted.filters || {}) }
            };
        }
    }

    isLegacyDefaultMealSeed(meals) {
        const legacyMealIds = ['m1', 'm2', 'm3'];
        return Array.isArray(meals)
            && meals.length === legacyMealIds.length
            && legacyMealIds.every((id, index) => {
                const meal = meals[index];
                const defaultMeal = defaultState.meals[index];
                return meal?.id === id
                    && meal?.calories === defaultMeal.calories
                    && meal?.protein === defaultMeal.protein
                    && meal?.carbs === defaultMeal.carbs
                    && meal?.fats === defaultMeal.fats;
            });
    }

    async save(storage) {
        await storage.save(this.state);
    }

    async reset(storage) {
        this.state = clone(defaultState);
        await storage.clear();
    }

    addMeal(mealData) {
        const meal = new Meal(mealData);
        this.state.meals.unshift(meal);
        return meal;
    }

    editMeal(mealId, updates) {
        const meal = this.state.meals.find((item) => item.id === mealId);
        if (!meal) return null;
        Object.assign(meal, updates);
        return meal;
    }

    deleteMeal(mealId) {
        this.state.meals = this.state.meals.filter((item) => item.id !== mealId);
    }

    addWorkout(workoutData) {
        const workout = new Workout(workoutData);
        this.state.workouts.unshift(workout);
        return workout;
    }

    editWorkout(workoutId, updates) {
        const workout = this.state.workouts.find((item) => item.id === workoutId);
        if (!workout) return null;
        Object.assign(workout, updates);
        return workout;
    }

    deleteWorkout(workoutId) {
        this.state.workouts = this.state.workouts.filter((item) => item.id !== workoutId);
    }

    logWeight(weightValue, dateValue) {
        const entry = new WeightEntry({ weight: weightValue, date: dateValue });
        this.state.weightEntries.push(entry);
        return entry;
    }

    setWaterIntake(amount) {
        const waterGoal = Number(this.state.goals?.waterGoal ?? defaultState.goals.waterGoal);
        const maxGlasses = Math.max(1, Math.round(waterGoal) || defaultState.goals.waterGoal);
        const nextAmount = Math.round(Number(amount) || 0);
        this.state.waterIntake = Math.min(maxGlasses, Math.max(0, nextAmount));
    }

    toggleTheme() {
        this.state.settings.theme = this.state.settings.theme === 'dark' ? 'light' : 'dark';
    }

    setSection(section) {
        this.state.currentSection = section;
    }

    setFilters(filters) {
        this.state.filters = { ...this.state.filters, ...filters };
    }

    setGoals(goals) {
        this.state.goals = { ...this.state.goals, ...goals };
        if (goals.targetWeight != null) {
            this.state.profile.targetWeight = goals.targetWeight;
        }
    }

    setProfile(profile) {
        this.state.profile = { ...this.state.profile, ...profile };
        if (profile.targetWeight != null) {
            this.state.goals.targetWeight = profile.targetWeight;
        }
    }

    calculateNutrition() {
        const profile = this.state.profile;
        const weightKg = profile.unitSystem === 'imperial' ? profile.weight * 0.453592 : profile.weight;
        const heightCm = profile.unitSystem === 'imperial' ? profile.height * 30.48 : profile.height;
        const age = Number(profile.age) || 28;
        const gender = (profile.gender || 'prefer not to say').toLowerCase();
        const goalType = profile.goalType || 'maintain';
        const activityLevels = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            athlete: 1.9
        };
        const activityFactor = activityLevels[profile.activityLevel] || 1.55;
        let bmr = gender === 'male'
            ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
            : gender === 'female'
                ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
                : 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
        let calories = Math.round(bmr * activityFactor);
        if (goalType === 'lose') {
            calories = Math.max(1200, calories - 500);
        } else if (goalType === 'gain' || goalType === 'build') {
            calories = calories + 300;
        }
        const proteinPerKg = goalType === 'lose' ? 2.0 : goalType === 'gain' ? 1.8 : 1.6;
        const proteinGoal = Math.round(weightKg * proteinPerKg);
        const fatGoal = Math.round((calories * 0.25) / 9);
        const carbsGoal = Math.round((calories - proteinGoal * 4 - fatGoal * 9) / 4);
        const waterGoal = Math.max(6, Math.round(weightKg / 10));
        return {
            calorieGoal: calories,
            proteinGoal,
            carbsGoal: Math.max(carbsGoal, 100),
            fatsGoal: Math.max(fatGoal, 40),
            waterGoal
        };
    }

    calculateRemainingMacros(macroGoal, consumedMeals) {
        const meals = Array.isArray(consumedMeals)
            ? consumedMeals
            : consumedMeals && typeof consumedMeals === 'object'
                ? Object.values(consumedMeals)
                : [];

        const consumedTotals = meals.reduce((totals, meal) => {
            const protein = Number(meal?.protein || 0);
            const carbs = Number(meal?.carbs || 0);
            const fats = Number(meal?.fats || 0);

            return {
                protein: totals.protein + (Number.isFinite(protein) ? protein : 0),
                carbs: totals.carbs + (Number.isFinite(carbs) ? carbs : 0),
                fats: totals.fats + (Number.isFinite(fats) ? fats : 0),
            };
        }, { protein: 0, carbs: 0, fats: 0 });

        const goalProtein = Number(macroGoal?.protein || 0);
        const goalCarbs = Number(macroGoal?.carbs || 0);
        const goalFats = Number(macroGoal?.fats || 0);

        return {
            protein: Math.max(0, goalProtein - consumedTotals.protein),
            carbs: Math.max(0, goalCarbs - consumedTotals.carbs),
            fats: Math.max(0, goalFats - consumedTotals.fats),
        };
    }

    get mealTotals() {
        return this.state.meals.reduce(
            (totals, meal) => {
                totals.calories += meal.calories;
                totals.protein += meal.protein;
                totals.carbs += meal.carbs;
                totals.fats += meal.fats;
                return totals;
            },
            { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
    }

    get workoutTotals() {
        return this.state.workouts.reduce(
            (totals, workout) => {
                totals.duration += workout.duration;
                totals.calories += workout.calories;
                totals.sessions += 1;
                return totals;
            },
            { duration: 0, calories: 0, sessions: 0 }
        );
    }

    get currentWeight() {
        return this.state.weightEntries.length ? this.state.weightEntries[this.state.weightEntries.length - 1].weight : null;
    }

    get weightChangePercent() {
        if (this.state.weightEntries.length < 2) return 0;
        const firstWeight = this.state.weightEntries[0].weight;
        const current = this.currentWeight;
        if (!firstWeight || !current) return 0;
        return Math.round(((current - firstWeight) / firstWeight) * 100 * 10) / 10;
    }

    get goalCompletion() {
        const totals = this.mealTotals;
        const goal = this.state.goals;
        const scores = [
            totals.calories / Math.max(goal.calorieGoal, 1),
            this.state.waterIntake / Math.max(goal.waterGoal, 1)
        ];
        return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100);
    }

    get foodCategories() {
        return Array.from(new Set(this.state.foodDatabase.map((item) => item.category))).sort();
    }

    get filteredFoodDatabase() {
        const category = this.state.filters.foodCategory;
        const search = String(this.state.filters.globalSearch || this.state.filters.mealSearch || '').trim().toLowerCase();
        return this.state.foodDatabase.filter((food) => {
            const matchesCategory = category === 'all' || food.category === category;
            const matchesSearch = !search || [food.name, food.serving, food.category].some((value) => String(value).toLowerCase().includes(search));
            return matchesCategory && matchesSearch;
        });
    }

    get filteredMeals() {
        const search = String(this.state.filters.mealSearch || this.state.filters.globalSearch || '').trim().toLowerCase();
        return this.state.meals.filter((meal) => {
            if (!search) return true;
            return [meal.name, meal.category, meal.time].some((value) => String(value).toLowerCase().includes(search));
        });
    }

    get caloriesChartData() {
        const labels = this.state.meals.slice(0, 7).map((meal) => meal.time);
        const values = this.state.meals.slice(0, 7).map((meal) => meal.calories);
        return { labels, values };
    }

    get proteinChartData() {
        const labels = this.state.meals.slice(0, 7).map((meal) => meal.time);
        const values = this.state.meals.slice(0, 7).map((meal) => meal.protein);
        return { labels, values };
    }

    get workoutFrequencyChartData() {
        const labels = this.state.workouts.slice(0, 7).map((workout) => workout.date);
        const values = this.state.workouts.slice(0, 7).map(() => 1);
        return { labels, values };
    }

    get weeklyCaloriesChartData() {
        const labels = this.state.workouts.slice(0, 7).map((workout) => workout.date);
        const values = this.state.workouts.slice(0, 7).map((workout) => workout.calories);
        return { labels, values };
    }

    get weightChartData() {
        const labels = this.state.weightEntries.map((entry) => entry.date);
        const values = this.state.weightEntries.map((entry) => entry.weight);
        return { labels, values };
    }

    exportJson() {
        return JSON.stringify(this.state, null, 2);
    }

    importJson(payload) {
        let parsed;
        if (typeof payload === 'string') {
            parsed = JSON.parse(payload);
        } else {
            parsed = payload;
        }
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Imported JSON is invalid.');
        }
        this.state = {
            ...clone(defaultState),
            ...parsed,
            settings: { ...clone(defaultState.settings), ...(parsed.settings || {}) },
            profile: { ...clone(defaultState.profile), ...(parsed.profile || {}) },
            goals: { ...clone(defaultState.goals), ...(parsed.goals || {}) },
            meals: clone(parsed.meals) || clone(defaultState.meals),
            workouts: clone(parsed.workouts) || clone(defaultState.workouts),
            weightEntries: clone(parsed.weightEntries) || clone(defaultState.weightEntries),
            measurements: clone(parsed.measurements) || clone(defaultState.measurements),
            waterIntake: Number(parsed.waterIntake ?? defaultState.waterIntake),
            currentSection: parsed.currentSection || defaultState.currentSection,
            foodDatabase: clone(defaultState.foodDatabase),
            filters: { ...clone(defaultState.filters), ...(parsed.filters || {}) }
        };
    }
}

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.chartLibrary = null;
        this.registered = false;
    }

    async ensureChartLibrary() {
        if (this.chartLibrary) {
            return this.chartLibrary;
        }
        try {
            const module = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.min.js');
            this.chartLibrary = module;
            this.registered = false;
            return module;
        } catch (error) {
            console.warn('Chart.js failed to load:', error);
            return null;
        }
    }

    destroy(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);
        }
    }

    async renderLineChart(chartId, labels, values, label, color = '#22c55e') {
        const module = await this.ensureChartLibrary();
        if (!module) return;
        const { Chart, registerables } = module;
        if (!this.registered) {
            try {
                Chart.register(...registerables);
            } catch (e) {
                console.warn('Chart.register warning:', e);
            }
            this.registered = true;
        }
        this.destroy(chartId);
        const canvas = document.getElementById(chartId);
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const chart = new Chart(context, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label,
                        data: values,
                        borderColor: color,
                        backgroundColor: 'rgba(34, 197, 94, 0.18)',
                        fill: true,
                        tension: 0.32,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: color,
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
                    y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#cbd5e1' } }
                }
            }
        });
        this.charts.set(chartId, chart);
    }

    async renderBarChart(chartId, labels, values, label, color = '#10b981') {
        const module = await this.ensureChartLibrary();
        if (!module) return;
        const { Chart, registerables } = module;
        if (!this.registered) {
            try {
                Chart.register(...registerables);
            } catch (e) {
                console.warn('Chart.register warning:', e);
            }
            this.registered = true;
        }
        this.destroy(chartId);
        const canvas = document.getElementById(chartId);
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const chart = new Chart(context, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label,
                        data: values,
                        backgroundColor: color,
                        borderRadius: 14,
                        barThickness: 'flex'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
                    y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#cbd5e1' } }
                }
            }
        });
        this.charts.set(chartId, chart);
    }
}

class FitTrackUI {
    constructor(storage) {
        this.storage = storage;
        this.state = new AppState();
        this.chartManager = new ChartManager();
        this.notifications = new Set();
        this.toastTimer = null;
    }

    async init() {
        try {
            await this.state.load(this.storage);
            this.state.setWaterIntake(this.state.state.waterIntake);
            this.cacheElements();
            this.bindEvents();
            this.applyTheme();
            this.setSection(this.state.state.currentSection);
            await this.renderAll();
        } catch (err) {
            console.error('App failed to initialize:', err);
            // best-effort user notification
            if (this.showToast) this.showToast('App failed to initialize. Check console.', 'error');
        }
    }

    cacheElements() {
        this.elements = {

            appFrame: document.getElementById('app-frame'),
            navButtons: Array.from(document.querySelectorAll('.nav-item')),
            mobileButtons: Array.from(document.querySelectorAll('.mobile-item')),
            sectionPanels: Array.from(document.querySelectorAll('.section-panel')),
            userGreeting: document.getElementById('user-greeting'),
            goalCompletion: document.getElementById('goal-completion'),
            caloriesRemaining: document.getElementById('calories-remaining'),
            workoutRemaining: document.getElementById('workout-remaining'),
            dashboardCalories: document.getElementById('dashboard-calories'),
            dashboardProtein: document.getElementById('dashboard-protein'),
            dashboardCarbs: document.getElementById('dashboard-carbs'),
            dashboardFats: document.getElementById('dashboard-fats'),
            snapshotProtein: document.getElementById('snapshot-protein'),
            snapshotCarbs: document.getElementById('snapshot-carbs'),
            snapshotFats: document.getElementById('snapshot-fats'),
            goalProgressFill: document.getElementById('goal-progress-fill'),
            sidebarCaloriesFill: document.getElementById('sidebar-calories-fill'),
            sidebarWaterFill: document.getElementById('sidebar-water-fill'),
            sidebarCalories: document.getElementById('sidebar-calories'),
            sidebarWater: document.getElementById('sidebar-water'),
            todayMealsList: document.getElementById('today-meals-list'),
            waterStatus: document.getElementById('water-status'),
            waterGlasses: document.getElementById('water-glasses'),
            mealSearchInput: document.getElementById('meal-search-input'),
            mealLogForm: document.getElementById('meal-log-form-inner'),
            mealCustomName: document.getElementById('meal-custom-name'),
            mealCustomPerServing: document.getElementById('meal-custom-per-serving'),
            mealCustomServings: document.getElementById('meal-custom-servings'),
            mealCustomProtein: document.getElementById('meal-custom-protein'),
            mealCustomCarbs: document.getElementById('meal-custom-carbs'),
            mealCustomFats: document.getElementById('meal-custom-fats'),
            mealCustomCalories: document.getElementById('meal-custom-calories'),
            mealCustomNotes: document.getElementById('meal-custom-notes'),
            mealCalories: document.getElementById('meal-calories'),
            mealProtein: document.getElementById('meal-protein'),
            mealCarbs: document.getElementById('meal-carbs'),
            mealFats: document.getElementById('meal-fats'),
            foodCategoryFilter: document.getElementById('food-category-filter'),
            foodCards: document.getElementById('food-cards'),
            mealsTableBody: document.getElementById('meals-table-body'),
            mealCount: document.getElementById('meal-count'),
            workoutList: document.getElementById('workout-list'),
            weeklyWorkouts: document.getElementById('weekly-workouts'),
            workoutSessionCount: document.getElementById('workout-session-count'),
            weeklyCalories: document.getElementById('weekly-calories'),
            workoutDuration: document.getElementById('workout-duration'),
            workoutCount: document.getElementById('workout-count'),
            currentWeight: document.getElementById('current-weight'),
            goalWeightLabel: document.getElementById('goal-weight'),
            weightProgressPercent: document.getElementById('weight-progress-percent'),
            goalCalories: document.getElementById('goal-calories'),
            goalProtein: document.getElementById('goal-protein'),
            goalCarbs: document.getElementById('goal-carbs'),
            goalFats: document.getElementById('goal-fats'),
            goalWater: document.getElementById('goal-water'),
            goalWorkouts: document.getElementById('goal-workouts'),
            goalTargetWeight: document.getElementById('goal-target-weight'),
            themeSelect: document.getElementById('theme-select'),
            unitSelect: document.getElementById('unit-select'),
            exportButton: document.getElementById('export-data-button'),
            importButton: document.getElementById('import-data-button'),
            resetButton: document.getElementById('reset-data-button'),
            importFileInput: document.getElementById('import-json-input'),
            toast: document.getElementById('toast-message'),
            addWaterButton: document.getElementById('add-water-button'),
            addMealButton: document.getElementById('show-add-meal'),
            addWorkoutButton: document.getElementById('add-workout-button'),
            logWeightButton: document.getElementById('log-weight-button'),
            globalSearch: document.getElementById('global-search'),
            goalsForm: document.getElementById('goals-form')
        };
    }

    bindEvents() {
        this.elements.navButtons.forEach((button) => {
            button.addEventListener('click', () => this.changeSection(button.dataset.section));
        });

        this.elements.mobileButtons.forEach((button) => {
            button.addEventListener('click', () => this.changeSection(button.dataset.section));
        });

        if (this.elements.addWaterButton) {
            this.elements.addWaterButton.addEventListener('click', async () => {
                this.state.setWaterIntake(this.state.state.waterIntake + 1);
                await this.saveState();
                this.renderDashboard();
            });
        }

        if (this.elements.addMealButton) {
            this.elements.addMealButton.addEventListener('click', async () => {
                await this.changeSection('meals');
                this.focusMealForm();
            });
        }

        if (this.elements.mealLogForm) {
            this.elements.mealLogForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleMealFormSubmit();
            });
        }

        if (this.elements.addWorkoutButton) {
            this.elements.addWorkoutButton.addEventListener('click', async () => await this.handleAddWorkout());
        }

        if (this.elements.logWeightButton) {
            this.elements.logWeightButton.addEventListener('click', async () => await this.handleLogWeight());
        }

        if (this.elements.mealSearchInput) {
            this.elements.mealSearchInput.addEventListener('input', async () => {
                this.state.setFilters({ mealSearch: this.elements.mealSearchInput.value });
                await this.renderMeals();
                await this.renderFoodDatabase();
            });
        }

        if (this.elements.foodCategoryFilter) {
            this.elements.foodCategoryFilter.addEventListener('change', async () => {
                this.state.setFilters({ foodCategory: this.elements.foodCategoryFilter.value });
                await this.renderFoodDatabase();
            });
        }

        if (this.elements.globalSearch) {
            this.elements.globalSearch.addEventListener('input', async () => {
                const query = this.elements.globalSearch.value;
                console.log('Global search query:', query);
                this.state.setFilters({ globalSearch: query });
                await this.renderMeals();
                await this.renderFoodDatabase();
                await this.renderWorkouts();
            });
        }

        if (this.elements.themeSelect) {
            this.elements.themeSelect.addEventListener('change', async (event) => {
                this.state.state.settings.theme = event.target.value;
                this.applyTheme();
                await this.saveState();
            });
        }

        const themeToggleButton = document.getElementById('toggle-theme');
        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', async () => {
                this.state.toggleTheme();
                this.applyTheme();
                if (this.elements.themeSelect) {
                    this.elements.themeSelect.value = this.state.state.settings.theme;
                }
                await this.saveState();
            });
        }

        if (this.elements.unitSelect) {
            this.elements.unitSelect.addEventListener('change', async (event) => {
                this.state.state.settings.units = event.target.value;
                await this.saveState();
                this.showToast('Unit preference saved.', 'success');
            });
        }

        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => this.handleExportData());
        }

        if (this.elements.importButton) {
            this.elements.importButton.addEventListener('click', () => this.elements.importFileInput.click());
        }

        if (this.elements.importFileInput) {
            this.elements.importFileInput.addEventListener('change', async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    this.state.importJson(text);
                    await this.saveState();
                    await this.renderAll();
                    this.showToast('Data imported successfully.', 'success');
                } catch (error) {
                    this.showToast(error.message || 'Unable to import JSON file.', 'error');
                } finally {
                    event.target.value = '';
                }
            });
        }

        if (this.elements.resetButton) {
            this.elements.resetButton.addEventListener('click', async () => {
                if (!confirm('Reset progress to 0% and restore default values?')) return;

                // Reset all stored data/state back to defaults
                await this.state.reset(this.storage);
                await this.state.save(this.storage);

                // Make sure progress UI shows 0% immediately
                // (renders will set it correctly, but this guarantees the “reset to 0%” behavior)
                const goalFill = document.getElementById('goal-progress-fill');
                if (goalFill) goalFill.style.width = '0%';

                const sidebarCaloriesFill = document.getElementById('sidebar-calories-fill');
                if (sidebarCaloriesFill) sidebarCaloriesFill.style.width = '0%';

                const sidebarWaterFill = document.getElementById('sidebar-water-fill');
                if (sidebarWaterFill) sidebarWaterFill.style.width = '0%';

                await this.renderAll();
                this.showToast('Progress reset to 0%.', 'success');
            });
        }

        if (this.elements.goalsForm) {
            this.elements.goalsForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleSaveGoals();
            });
        }

        document.addEventListener('click', async (event) => {
            try {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;

                const sectionButton = target.closest('[data-section]');
                if (
                    sectionButton instanceof HTMLElement
                    && !sectionButton.classList.contains('nav-item')
                    && !sectionButton.classList.contains('mobile-item')
                ) {
                    event.preventDefault();
                    const section = sectionButton.dataset.section;
                    if (section) {
                        await this.changeSection(section);
                        if (section === 'meals') {
                            this.focusMealForm();
                        }
                    }
                    return;
                }

                if (target.matches('.add-food-button')) {
                    const foodId = target.dataset.food;
                    await this.handleAddFood(foodId);
                }

                if (target.matches('[data-action="delete-meal"]')) {
                    await this.handleDeleteMeal(target.dataset.id);
                }

                if (target.matches('[data-action="edit-meal"]')) {
                    await this.handleEditMeal(target.dataset.id);
                }

                if (target.matches('[data-action="delete-workout"]')) {
                    await this.handleDeleteWorkout(target.dataset.id);
                }

                if (target.matches('[data-action="edit-workout"]')) {
                    await this.handleEditWorkout(target.dataset.id);
                }

                const waterGlass = target.closest('.water-glass');
                if (waterGlass instanceof HTMLElement) {
                    const index = Number(waterGlass.dataset.index);
                    if (!Number.isNaN(index)) {
                        const currentWater = this.state.state.waterIntake;
                        const nextWater = index < currentWater ? index : index + 1;
                        this.state.setWaterIntake(nextWater);
                        await this.saveState();
                        this.renderDashboard();
                    }
                }
            } catch (err) {
                console.error('Error handling click event:', err);
                this.showToast((err && err.message) || 'An unexpected error occurred.', 'error');
            }
        });
    }

    async changeSection(section) {
        this.state.setSection(section);
        this.setSection(section);
        await this.saveState();
    }

    setSection(section) {
        this.elements.sectionPanels.forEach((panel) => {
            panel.classList.toggle('hidden-section', panel.id !== `${section}-section`);
        });

        this.elements.navButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.section === section);
        });

        this.elements.mobileButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.section === section);
        });
    }

    async renderAll() {
        this.renderDashboard();
        this.renderMeals();
        this.renderFoodDatabase();
        this.renderWorkouts();
        await this.renderWeight();
        await this.renderAnalytics();
        this.renderSettings();
    }

    renderDashboard() {
        const totals = this.state.mealTotals;
        const goals = this.state.state.goals;
        const waterGoal = this.getWaterTarget();
        const waterIntake = this.state.state.waterIntake;
        const workoutCount = this.state.workoutTotals.sessions;
        const workoutRemaining = Math.max(0, goals.workoutGoal - workoutCount);
        const completion = Math.min(100, Math.max(0, this.state.goalCompletion));
        const caloriesPercent = this.computePercent(totals.calories, goals.calorieGoal);
        const proteinPercent = this.computePercent(totals.protein, goals.proteinGoal);
        const carbsPercent = this.computePercent(totals.carbs, goals.carbsGoal);
        const fatsPercent = this.computePercent(totals.fats, goals.fatsGoal);

        if (this.elements.userGreeting) {
            const name = this.state.state.profile?.name || 'FitTrack user';
            this.elements.userGreeting.textContent = `Welcome back, ${name}`;
        }
        if (this.elements.goalCompletion) {
            this.elements.goalCompletion.textContent = `${completion}%`;
        }
        if (this.elements.caloriesRemaining) {
            this.elements.caloriesRemaining.textContent = `${this.formatNumber(goals.calorieGoal - totals.calories)} kcal`;
        }
        if (this.elements.workoutRemaining) {
            this.elements.workoutRemaining.textContent = `${workoutRemaining}`;
        }
        if (this.elements.dashboardCalories) {
            this.elements.dashboardCalories.textContent = `${this.formatNumber(totals.calories)} / ${this.formatNumber(goals.calorieGoal)} kcal`;
        }
        if (this.elements.dashboardProtein) {
            this.elements.dashboardProtein.textContent = `${totals.protein} / ${goals.proteinGoal} g`;
        }
        if (this.elements.dashboardCarbs) {
            this.elements.dashboardCarbs.textContent = `${totals.carbs} / ${goals.carbsGoal} g`;
        }
        if (this.elements.dashboardFats) {
            this.elements.dashboardFats.textContent = `${totals.fats} / ${goals.fatsGoal} g`;
        }
        if (this.elements.snapshotProtein) {
            this.elements.snapshotProtein.textContent = `${this.formatNumber(totals.protein)}g`;
        }
        if (this.elements.snapshotCarbs) {
            this.elements.snapshotCarbs.textContent = `${this.formatNumber(totals.carbs)}g`;
        }
        if (this.elements.snapshotFats) {
            this.elements.snapshotFats.textContent = `${this.formatNumber(totals.fats)}g`;
        }

        if (this.elements.goalProgressFill) {
            this.elements.goalProgressFill.style.width = `${completion}%`;
        }
        if (this.elements.sidebarCaloriesFill) {
            this.elements.sidebarCaloriesFill.style.width = `${caloriesPercent}%`;
        }
        if (this.elements.sidebarWaterFill) {
            const percent = this.computePercent(waterIntake, waterGoal);
            this.elements.sidebarWaterFill.style.width = `${percent}%`;
        }
        if (this.elements.sidebarCalories) {
            this.elements.sidebarCalories.textContent = `${this.formatNumber(totals.calories)} / ${this.formatNumber(goals.calorieGoal)}`;
        }
        if (this.elements.sidebarWater) {
            this.elements.sidebarWater.textContent = `${waterIntake} / ${waterGoal} glasses`;
        }
        this.renderWaterTracker(waterIntake, waterGoal);

        if (this.elements.todayMealsList) {
            this.elements.todayMealsList.innerHTML = this.state.filteredMeals.slice(0, 4).map((meal) => `
                <li>
                    <div>
                        <p>${meal.category}</p>
                        <strong>${meal.name}</strong>
                    </div>
                    <div>
                        <span>${meal.calories} kcal</span>
                    </div>
                </li>
            `).join('');
        }

        this.checkGoalNotifications(totals, goals);
    }

    renderMeals() {
        const totals = this.state.mealTotals;
        const goals = this.state.state.goals;
        if (this.elements.mealCount) {
            this.elements.mealCount.textContent = `${this.state.filteredMeals.length} items`;
        }

        if (this.elements.mealsTableBody) {
            this.elements.mealsTableBody.innerHTML = this.state.filteredMeals.map((meal) => `
                <tr>
                    <td>
                        <strong>${meal.name}</strong><br>
                        <span>${meal.category} • ${meal.time}</span>
                    </td>
                    <td>${meal.calories}</td>
                    <td>${meal.protein}</td>
                    <td>${meal.carbs}</td>
                    <td>${meal.fats}</td>
                    <td class="table-action">
                        <button data-action="edit-meal" data-id="${meal.id}">Edit</button>
                        <button data-action="delete-meal" data-id="${meal.id}">Delete</button>
                    </td>
                </tr>
            `).join('');
        }

        if (this.elements.mealSearchInput) {
            this.elements.mealSearchInput.value = this.state.state.filters.mealSearch || '';
        }

        this.updateMacroProgress(totals, goals);
    }

    renderFoodDatabase() {
        if (!this.elements.foodCards) return;
        this.elements.foodCards.innerHTML = this.state.filteredFoodDatabase.map((food) => `
            <article class="food-card">
                <div>
                    <h3>${food.name}</h3>
                    <p>${food.serving} • ${food.category}</p>
                </div>
                <div class="food-values">
                    <span>Calories<span>${food.calories} kcal</span></span>
                    <span>Protein<span>${food.protein} g</span></span>
                    <span>Carbs<span>${food.carbs} g</span></span>
                    <span>Fats<span>${food.fats} g</span></span>
                </div>
                <button data-food="${food.id}" class="add-food-button">Add to log</button>
            </article>
        `).join('');

        if (this.elements.foodCategoryFilter) {
            const category = this.state.state.filters.foodCategory || 'all';
            this.elements.foodCategoryFilter.value = category;
        }
    }

    renderWorkouts() {
        const totals = this.state.workoutTotals;
        const goals = this.state.state.goals;
        if (this.elements.workoutSessionCount) {
            this.elements.workoutSessionCount.textContent = `${totals.sessions} / ${goals.workoutGoal}`;
        }
        if (this.elements.weeklyWorkouts) {
            this.elements.weeklyWorkouts.textContent = `${totals.sessions} / ${goals.workoutGoal} sessions`;
        }
        if (this.elements.weeklyCalories) {
            this.elements.weeklyCalories.textContent = `${totals.calories} kcal`;
        }
        if (this.elements.workoutDuration) {
            this.elements.workoutDuration.textContent = `${totals.duration} min`;
        }
        if (this.elements.workoutCount) {
            this.elements.workoutCount.textContent = `${totals.sessions}`;
        }

        if (this.elements.workoutList) {
            const search = String(this.state.state.filters.globalSearch || '').trim().toLowerCase();
            const workouts = this.state.state.workouts.filter((workout) => {
                if (!search) return true;
                return [workout.title, workout.date].some((value) => String(value).toLowerCase().includes(search));
            });
            this.elements.workoutList.innerHTML = workouts.map((workout) => `
                <article class="workout-card">
                    <div class="card-row">
                        <div>
                            <p>${workout.date}</p>
                            <strong>${workout.title}</strong>
                        </div>
                        <div>
                            <span>${workout.calories} kcal</span>
                        </div>
                    </div>
                    <p>Sets ${workout.sets} × Reps ${workout.reps} • ${workout.duration} min</p>
                    <div class="card-row">
                        <button data-action="edit-workout" data-id="${workout.id}">Edit</button>
                        <button data-action="delete-workout" data-id="${workout.id}">Delete</button>
                    </div>
                </article>
            `).join('');
        }
    }

    async renderWeight() {
        const currentWeight = this.state.currentWeight || this.state.state.goals.targetWeight;
        const targetWeight = this.state.state.goals.targetWeight;
        if (this.elements.currentWeight) {
            this.elements.currentWeight.textContent = `${currentWeight} kg`;
        }
        if (this.elements.goalWeightLabel) {
            this.elements.goalWeightLabel.textContent = `Goal ${targetWeight} kg`;
        }
        if (this.elements.weightProgressPercent) {
            const percent = this.state.weightChangePercent;
            this.elements.weightProgressPercent.textContent = `${percent > 0 ? '+' : ''}${percent}% change`;
        }

        await this.chartManager.renderLineChart(
            'weight-chart-canvas',
            this.state.weightChartData.labels,
            this.state.weightChartData.values,
            'Weight',
            '#38bdf8'
        );
    }

    async renderAnalytics() {
        await this.chartManager.renderLineChart(
            'weight-progress-chart',
            this.state.weightChartData.labels,
            this.state.weightChartData.values,
            'Weight',
            '#38bdf8'
        );

        await this.chartManager.renderBarChart(
            'calories-chart',
            this.state.caloriesChartData.labels,
            this.state.caloriesChartData.values,
            'Calories',
            '#22c55e'
        );

        await this.chartManager.renderBarChart(
            'protein-chart',
            this.state.proteinChartData.labels,
            this.state.proteinChartData.values,
            'Protein',
            '#f97316'
        );

        await this.chartManager.renderBarChart(
            'workout-frequency-chart',
            this.state.workoutFrequencyChartData.labels,
            this.state.workoutFrequencyChartData.values,
            'Frequency',
            '#818cf8'
        );

        await this.chartManager.renderBarChart(
            'workout-session-chart',
            this.state.weeklyCaloriesChartData.labels,
            this.state.weeklyCaloriesChartData.values,
            'Weekly Burn',
            '#ec4899'
        );
    }

    renderSettings() {
        if (this.elements.themeSelect) {
            this.elements.themeSelect.value = this.state.state.settings.theme;
        }
        if (this.elements.unitSelect) {
            this.elements.unitSelect.value = this.state.state.settings.units;
        }
        if (this.elements.goalCalories) {
            this.elements.goalCalories.value = this.state.state.goals.calorieGoal;
        }
        if (this.elements.goalProtein) {
            this.elements.goalProtein.value = this.state.state.goals.proteinGoal;
        }
        if (this.elements.goalCarbs) {
            this.elements.goalCarbs.value = this.state.state.goals.carbsGoal;
        }
        if (this.elements.goalFats) {
            this.elements.goalFats.value = this.state.state.goals.fatsGoal;
        }
        if (this.elements.goalWater) {
            this.elements.goalWater.value = this.state.state.goals.waterGoal;
        }
        if (this.elements.goalWorkouts) {
            this.elements.goalWorkouts.value = this.state.state.goals.workoutGoal;
        }
        if (this.elements.goalTargetWeight) {
            this.elements.goalTargetWeight.value = this.state.state.goals.targetWeight;
        }
        if (this.elements.globalSearch) {
            this.elements.globalSearch.value = this.state.state.filters.globalSearch || '';
        }
    }

    renderWaterTracker(waterIntake = this.state.state.waterIntake, waterGoal = this.getWaterTarget()) {
        if (this.elements.waterStatus) {
            this.elements.waterStatus.textContent = `${waterIntake} / ${waterGoal} glasses`;
        }

        if (!this.elements.waterGlasses) return;

        this.elements.waterGlasses.innerHTML = Array.from({ length: waterGoal }, (_, index) => {
            const glassNumber = index + 1;
            const isFilled = glassNumber <= waterIntake;
            return `
                <button
                    class="water-glass${isFilled ? ' filled' : ''}"
                    type="button"
                    data-index="${index}"
                    aria-label="Set water intake to ${glassNumber} ${glassNumber === 1 ? 'glass' : 'glasses'}"
                    aria-pressed="${isFilled}"
                ></button>
            `;
        }).join('');
    }

    updateMacroProgress(totals, goals) {
        const caloriesPercent = this.computePercent(totals.calories, goals.calorieGoal);
        const proteinPercent = this.computePercent(totals.protein, goals.proteinGoal);
        const carbsPercent = this.computePercent(totals.carbs, goals.carbsGoal);
        const fatsPercent = this.computePercent(totals.fats, goals.fatsGoal);

        if (this.elements.mealCalories) {
            this.elements.mealCalories.textContent = `${this.formatNumber(totals.calories)} / ${this.formatNumber(goals.calorieGoal)} kcal`;
        }
        if (this.elements.mealProtein) {
            this.elements.mealProtein.textContent = `${this.formatNumber(totals.protein)} / ${this.formatNumber(goals.proteinGoal)} g`;
        }
        if (this.elements.mealCarbs) {
            this.elements.mealCarbs.textContent = `${this.formatNumber(totals.carbs)} / ${this.formatNumber(goals.carbsGoal)} g`;
        }
        if (this.elements.mealFats) {
            this.elements.mealFats.textContent = `${this.formatNumber(totals.fats)} / ${this.formatNumber(goals.fatsGoal)} g`;
        }

        const caloriesFill = document.getElementById('calories-fill');
        const proteinFill = document.getElementById('protein-fill');
        const carbsFill = document.getElementById('carbs-fill');
        const fatsFill = document.getElementById('fats-fill');
        if (caloriesFill) caloriesFill.style.width = `${caloriesPercent}%`;
        if (proteinFill) proteinFill.style.width = `${proteinPercent}%`;
        if (carbsFill) carbsFill.style.width = `${carbsPercent}%`;
        if (fatsFill) fatsFill.style.width = `${fatsPercent}%`;
    }

    async handleMealFormSubmit() {
        const name = this.elements.mealCustomName?.value.trim();
        if (!name) {
            this.elements.mealCustomName?.reportValidity();
            this.showToast('Add a meal name first.', 'error');
            return;
        }

        const isPerServing = Boolean(this.elements.mealCustomPerServing?.checked);
        const servingsEaten = this.parsePositiveNumber(this.elements.mealCustomServings?.value, 1);
        const caloriesInput = this.parsePositiveNumber(this.elements.mealCustomCalories?.value, 0);
        const proteinInput = this.parsePositiveNumber(this.elements.mealCustomProtein?.value, 0);
        const carbsInput = this.parsePositiveNumber(this.elements.mealCustomCarbs?.value, 0);
        const fatsInput = this.parsePositiveNumber(this.elements.mealCustomFats?.value, 0);

        if (
            servingsEaten == null
            || servingsEaten <= 0
            || caloriesInput == null
            || proteinInput == null
            || carbsInput == null
            || fatsInput == null
        ) {
            this.showToast('Meal numbers must be valid positive values.', 'error');
            return;
        }

        const multiplier = isPerServing ? servingsEaten : 1;
        const calories = Math.round(caloriesInput * multiplier);
        const protein = Math.round(proteinInput * multiplier);
        const carbs = Math.round(carbsInput * multiplier);
        const fats = Math.round(fatsInput * multiplier);

        if (calories + protein + carbs + fats === 0) {
            this.showToast('Enter at least one nutrition number.', 'error');
            return;
        }

        this.state.addMeal({
            name,
            category: 'meal',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            calories,
            protein,
            carbs,
            fats,
            isPerServing,
            servingsEaten,
            notes: this.elements.mealCustomNotes?.value.trim() || ''
        });

        await this.saveState();
        await this.renderAll();
        this.elements.mealLogForm?.reset();
        if (this.elements.mealCustomServings) {
            this.elements.mealCustomServings.value = '1';
        }
        this.elements.mealCustomName?.focus();
        this.showToast('Meal added. Dashboard numbers updated.', 'success');
    }

    focusMealForm() {
        const formCard = document.getElementById('meal-log-form');
        formCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => this.elements.mealCustomName?.focus(), 200);
    }

    async handleAddMeal() {
        const name = prompt('Meal name', 'Greek yogurt bowl');
        if (!name) return;
        const category = prompt('Category', 'Snack') || 'Snack';
        const time = prompt('Time', '6:30 PM') || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const logPerServing = confirm('Log this meal as Per Serving?\n\nCancel = Log by Total (current behavior).');

        let calories;
        let protein;
        let carbs;
        let fats;
        let isPerServing = false;
        let servingsEaten = 1;
        let notes = '';

        if (logPerServing) {
            isPerServing = true;
            const servings = this.parsePositiveNumber(prompt('Servings eaten (multiplier)', '1'));
            if (servings == null) {
                this.showToast('Servings eaten must be a positive number.', 'error');
                return;
            }
            servingsEaten = servings;

            // Per serving values
            const calPer = this.parsePositiveNumber(prompt('Calories per serving', '320'));
            const protPer = this.parsePositiveNumber(prompt('Protein per serving (g)', '24'));
            const carbPer = this.parsePositiveNumber(prompt('Carbs per serving (g)', '30'));
            const fatPer = this.parsePositiveNumber(prompt('Fats per serving (g)', '12'));

            if ([calPer, protPer, carbPer, fatPer].some((v) => v == null)) {
                this.showToast('Meal values must be positive numbers.', 'error');
                return;
            }

            calories = calPer * servingsEaten;
            protein = protPer * servingsEaten;
            carbs = carbPer * servingsEaten;
            fats = fatPer * servingsEaten;

            notes = prompt('Optional notes (e.g., pre-workout meal)', '') || '';
        } else {
            // Totals (backward compatible)
            calories = this.parsePositiveNumber(prompt('Calories (total)', '320'));
            protein = this.parsePositiveNumber(prompt('Protein (g, total)', '24'));
            carbs = this.parsePositiveNumber(prompt('Carbs (g, total)', '30'));
            fats = this.parsePositiveNumber(prompt('Fats (g, total)', '12'));

            if (calories == null || protein == null || carbs == null || fats == null) {
                this.showToast('Meal values must be positive numbers.', 'error');
                return;
            }
        }

        this.state.addMeal({
            name,
            category,
            time,
            calories,
            protein,
            carbs,
            fats,
            isPerServing,
            servingsEaten,
            notes
        });

        await this.saveState();
        await this.renderAll();
        this.showToast('Meal added to your log.', 'success');
    }


    async handleAddFood(foodId) {
        const food = this.state.state.foodDatabase.find((item) => item.id === foodId);
        if (!food) return;
        this.state.addMeal({
            name: food.name,
            category: food.category,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fats: food.fats
        });
        this.state.state.filters.globalSearch = food.name;
        await this.saveState();
        await this.renderAll();
        this.showToast(`${food.name} added to your meals.`, 'success');
    }

    async handleEditMeal(mealId) {
        const meal = this.state.state.meals.find((item) => item.id === mealId);
        if (!meal) return;

        const name = prompt('Meal name', meal.name) || meal.name;
        const category = prompt('Category', meal.category) || meal.category;
        const time = prompt('Time', meal.time) || meal.time;

        const logPerServing = confirm('Edit this meal as Per Serving?\n\nCancel = edit by Total (current behavior).');

        let calories;
        let protein;
        let carbs;
        let fats;
        let isPerServing = false;
        let servingsEaten = meal.servingsEaten ?? 1;
        let notes = meal.notes ?? '';

        if (logPerServing) {
            isPerServing = true;

            const servings = this.parsePositiveNumber(prompt('Servings eaten (multiplier)', String(servingsEaten)), servingsEaten);
            if (servings == null) {
                this.showToast('Servings eaten must be a positive number.', 'error');
                return;
            }
            servingsEaten = servings;

            const calPer = this.parsePositiveNumber(prompt('Calories per serving', String(meal.calories / Math.max(servingsEaten, 1))), String(meal.calories / Math.max(servingsEaten, 1)));
            const protPer = this.parsePositiveNumber(prompt('Protein per serving (g)', String(meal.protein / Math.max(servingsEaten, 1))), String(meal.protein / Math.max(servingsEaten, 1)));
            const carbPer = this.parsePositiveNumber(prompt('Carbs per serving (g)', String(meal.carbs / Math.max(servingsEaten, 1))), String(meal.carbs / Math.max(servingsEaten, 1)));
            const fatPer = this.parsePositiveNumber(prompt('Fats per serving (g)', String(meal.fats / Math.max(servingsEaten, 1))), String(meal.fats / Math.max(servingsEaten, 1)));

            if ([calPer, protPer, carbPer, fatPer].some((v) => v == null)) {
                this.showToast('Meal values must be positive numbers.', 'error');
                return;
            }

            calories = calPer * servingsEaten;
            protein = protPer * servingsEaten;
            carbs = carbPer * servingsEaten;
            fats = fatPer * servingsEaten;

            notes = prompt('Optional notes', notes) || '';
        } else {
            calories = this.parsePositiveNumber(prompt('Calories (total)', meal.calories), meal.calories);
            protein = this.parsePositiveNumber(prompt('Protein (g, total)', meal.protein), meal.protein);
            carbs = this.parsePositiveNumber(prompt('Carbs (g, total)', meal.carbs), meal.carbs);
            fats = this.parsePositiveNumber(prompt('Fats (g, total)', meal.fats), meal.fats);

            if (calories == null || protein == null || carbs == null || fats == null) {
                this.showToast('Meal values must be positive numbers.', 'error');
                return;
            }

            isPerServing = false;
            servingsEaten = 1;
            notes = prompt('Optional notes', notes) || '';
        }

        this.state.editMeal(mealId, { name, category, time, calories, protein, carbs, fats, isPerServing, servingsEaten, notes });
        await this.saveState();
        await this.renderAll();
        this.showToast('Meal updated.', 'success');
    }


    async handleDeleteMeal(mealId) {
        this.state.deleteMeal(mealId);
        await this.saveState();
        await this.renderAll();
        this.showToast('Meal removed from the log.', 'success');
    }

    async handleAddWorkout() {
        const title = prompt('Workout title', 'Full body strength');
        if (!title) return;
        const sets = this.parsePositiveNumber(prompt('Sets', '4'));
        const reps = this.parsePositiveNumber(prompt('Reps', '10'));
        const duration = this.parsePositiveNumber(prompt('Duration (minutes)', '40'));
        const calories = this.parsePositiveNumber(prompt('Calories burned', '320'));
        const date = prompt('Date', new Date().toLocaleDateString()) || new Date().toLocaleDateString();
        if (sets == null || reps == null || duration == null || calories == null) {
            this.showToast('Workout values must be positive numbers.', 'error');
            return;
        }
        this.state.addWorkout({ title, sets, reps, duration, calories, date });
        await this.saveState();
        await this.renderAll();
        this.showToast('Workout session added.', 'success');
    }

    async handleEditWorkout(workoutId) {
        const workout = this.state.state.workouts.find((item) => item.id === workoutId);
        if (!workout) return;
        const title = prompt('Workout title', workout.title) || workout.title;
        const sets = this.parsePositiveNumber(prompt('Sets', workout.sets), workout.sets);
        const reps = this.parsePositiveNumber(prompt('Reps', workout.reps), workout.reps);
        const duration = this.parsePositiveNumber(prompt('Duration (minutes)', workout.duration), workout.duration);
        const calories = this.parsePositiveNumber(prompt('Calories burned', workout.calories), workout.calories);
        const date = prompt('Date', workout.date) || workout.date;
        if (sets == null || reps == null || duration == null || calories == null) {
            this.showToast('Workout values must be positive numbers.', 'error');
            return;
        }
        this.state.editWorkout(workoutId, { title, sets, reps, duration, calories, date });
        await this.saveState();
        await this.renderAll();
        this.showToast('Workout updated.', 'success');
    }

    async handleDeleteWorkout(workoutId) {
        this.state.deleteWorkout(workoutId);
        await this.saveState();
        await this.renderAll();
        this.showToast('Workout deleted.', 'success');
    }

    async handleLogWeight() {
        const weight = this.parsePositiveNumber(prompt('Current weight (kg)', this.state.currentWeight || this.state.state.goals.targetWeight));
        if (weight == null) {
            this.showToast('Weight entry must be a positive number.', 'error');
            return;
        }
        const date = prompt('Entry date', new Date().toLocaleDateString()) || new Date().toLocaleDateString();
        this.state.logWeight(weight, date);
        await this.saveState();
        await this.renderAll();
        this.showToast('Weight entry recorded.', 'success');
    }

    async handleSaveGoals() {
        const calorieGoal = this.parsePositiveNumber(this.elements.goalCalories.value, this.state.state.goals.calorieGoal);
        const proteinGoal = this.parsePositiveNumber(this.elements.goalProtein.value, this.state.state.goals.proteinGoal);
        const carbsGoal = this.parsePositiveNumber(this.elements.goalCarbs.value, this.state.state.goals.carbsGoal);
        const fatsGoal = this.parsePositiveNumber(this.elements.goalFats.value, this.state.state.goals.fatsGoal);
        const waterGoal = this.parsePositiveNumber(this.elements.goalWater.value, this.state.state.goals.waterGoal);
        const workoutGoal = this.parsePositiveNumber(this.elements.goalWorkouts.value, this.state.state.goals.workoutGoal);
        const targetWeight = this.parsePositiveNumber(this.elements.goalTargetWeight.value, this.state.state.goals.targetWeight);

        if ([calorieGoal, proteinGoal, carbsGoal, fatsGoal, waterGoal, workoutGoal, targetWeight].some((value) => value == null)) {
            this.showToast('All goal fields must contain valid positive numbers.', 'error');
            return;
        }

        this.state.setGoals({ calorieGoal, proteinGoal, carbsGoal, fatsGoal, waterGoal, workoutGoal, targetWeight });
        await this.saveState();
        await this.renderAll();
        this.showToast('Goals saved successfully.', 'success');
    }

    handleExportData() {
        const data = this.state.exportJson();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'fittrack-data.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showToast('Data exported to JSON file.', 'success');
    }

    async saveState() {
        await this.state.save(this.storage);
    }

    applyTheme() {
        const theme = this.state.state.settings.theme;
        document.body.classList.toggle('theme-light', theme === 'light');
        document.body.classList.toggle('theme-dark', theme === 'dark');
        document.body.classList.toggle('dark-theme', theme === 'dark');
        if (this.elements.appFrame) {
            this.elements.appFrame.classList.toggle('dark-theme', theme === 'dark');
        }
        const toggle = document.getElementById('toggle-theme');
        if (toggle) {
            toggle.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }

    computePercent(value, goal) {
        return Math.min(100, Math.max(0, Math.round((value / Math.max(goal, 1)) * 100)));
    }

    getWaterTarget() {
        const waterGoal = Number(this.state.state.goals?.waterGoal);
        return Math.max(1, Math.round(Number.isFinite(waterGoal) ? waterGoal : defaultState.goals.waterGoal));
    }

    formatNumber(value) {
        return Number(value).toLocaleString('en-US');
    }

    parsePositiveNumber(input, fallback = null) {
        if (input === '' || input === null || input === undefined) {
            return fallback;
        }
        const value = Number(input);
        if (!Number.isFinite(value) || value < 0) {
            return null;
        }
        return value;
    }

    checkGoalNotifications(totals, goals) {
        const messages = [];
        if (totals.calories >= goals.calorieGoal && !this.notifications.has('calories')) {
            messages.push('You reached your daily calorie goal!');
            this.notifications.add('calories');
        }
        if (totals.protein >= goals.proteinGoal && !this.notifications.has('protein')) {
            messages.push('Protein target achieved. Great work!');
            this.notifications.add('protein');
        }
        if (this.state.state.waterIntake >= goals.waterGoal && !this.notifications.has('water')) {
            messages.push('Hydration goal complete. Keep it up!');
            this.notifications.add('water');
        }
        if (messages.length) {
            this.showToast(messages.join(' '), 'success');
        }
    }

    showToast(message, type = 'success') {
        if (!this.elements.toast) return;
        this.elements.toast.textContent = message;
        this.elements.toast.classList.remove('hidden');
        this.elements.toast.classList.add('show');
        if (type === 'error') {
            this.elements.toast.style.background = 'rgba(185, 28, 28, 0.95)';
        } else {
            this.elements.toast.style.background = 'rgba(15, 23, 42, 0.95)';
        }
        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
        }
        this.toastTimer = window.setTimeout(() => {
            this.elements.toast.classList.remove('show');
            this.elements.toast.classList.add('hidden');
        }, 3200);
    }
}

class OnboardingWizard {
    constructor() {
        this.storage = new Storage();
        this.state = new AppState();
        this.currentStep = 0;
        this.steps = [];
        this.elements = {};
    }

    async init() {
        try {
            await this.state.load(this.storage);
            if (this.state.state.profile.name && this.state.state.profile.name !== 'FitTrack user') {
                    window.location.href = 'fitness-nutrition.index.html';
            }

            this.cacheElements();
            this.bindEvents();
            this.renderStep();
        } catch (err) {
            console.error('Onboarding failed to initialize:', err);
            this.showStatus('Unable to start onboarding. See console for details.');
        }
    }

    cacheElements() {
        this.steps = Array.from(document.querySelectorAll('.onboarding-step'));
        this.elements.form = document.getElementById('onboarding-form');
        this.elements.stepCount = document.getElementById('step-count');
        this.elements.progressFill = document.getElementById('progress-fill');
        this.elements.startButton = document.getElementById('start-button');
        this.elements.backButton = document.getElementById('back-button');
        this.elements.nextButton = document.getElementById('next-button');
        this.elements.statusMessage = document.getElementById('wizard-status');
        this.elements.unitSystem = document.getElementById('unit-system');
        this.elements.heightInput = document.getElementById('height');
        this.elements.imperialHeightFields = document.getElementById('imperial-height-fields');
        this.elements.heightFt = document.getElementById('height-ft');
        this.elements.heightIn = document.getElementById('height-in');
        this.elements.goalType = document.getElementById('goal-type');
        this.elements.workoutDays = document.getElementById('workout-days');
        this.elements.weeklyGoal = document.getElementById('weekly-goal');
        this.elements.caloriesInput = document.getElementById('nutrition-calories');
        this.elements.proteinInput = document.getElementById('nutrition-protein');
        this.elements.carbsInput = document.getElementById('nutrition-carbs');
        this.elements.fatsInput = document.getElementById('nutrition-fats');
        this.elements.waterInput = document.getElementById('nutrition-water');
        this.elements.recommendCalories = document.getElementById('recommend-calories');
        this.elements.recommendProtein = document.getElementById('recommend-protein');
        this.elements.recommendCarbs = document.getElementById('recommend-carbs');
        this.elements.recommendFats = document.getElementById('recommend-fats');
        this.elements.summaryName = document.getElementById('summary-name');
        this.elements.summaryAge = document.getElementById('summary-age');
        this.elements.summaryGender = document.getElementById('summary-gender');
        this.elements.summaryHeight = document.getElementById('summary-height');
        this.elements.summaryWeight = document.getElementById('summary-weight');
        this.elements.summaryTarget = document.getElementById('summary-target');
        this.elements.summaryCalories = document.getElementById('summary-calories');
        this.elements.summaryProtein = document.getElementById('summary-protein');
        this.elements.summaryCarbs = document.getElementById('summary-carbs');
        this.elements.summaryFats = document.getElementById('summary-fats');
        this.elements.summaryWater = document.getElementById('summary-water');
        this.elements.name = document.getElementById('name');
        this.elements.age = document.getElementById('age');
        this.elements.gender = document.getElementById('gender');
        this.elements.activity = document.getElementById('activity');
        this.elements.weight = document.getElementById('weight');
        this.elements.goalWeight = document.getElementById('goal-weight');
        this.elements.goalSummaryText = document.getElementById('goal-summary-text');
    }

    bindEvents() {
        this.elements.form?.addEventListener('submit', (event) => event.preventDefault());
        this.elements.startButton?.addEventListener('click', () => this.nextStep());
        this.elements.backButton?.addEventListener('click', () => this.previousStep());
        this.elements.nextButton?.addEventListener('click', async () => await this.tryAdvance());
        this.elements.unitSystem?.addEventListener('change', () => this.toggleUnitInputs());
        this.elements.goalType?.addEventListener('change', () => this.updateGoalSummary());
        this.elements.workoutDays?.addEventListener('input', () => this.updateGoalSummary());
    }

    renderStep() {
        this.steps.forEach((step, index) => {
            step.classList.toggle('active-step', index === this.currentStep);
            step.classList.toggle('hidden-step', index !== this.currentStep);
        });

        this.elements.stepCount.textContent = Math.min(this.currentStep + 1, this.steps.length);
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;
        this.elements.progressFill.style.width = `${progress}%`;

        const atFinalStep = this.currentStep === this.steps.length - 1;
        this.elements.nextButton.textContent = atFinalStep ? 'Finish Setup' : 'Next';
        this.elements.backButton.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
        this.updateGoalSummary();
        if (this.currentStep === 3) {
            this.syncNutritionFields();
        }
        if (this.currentStep === 4) {
            this.renderSummary();
        }
    }

    async tryAdvance() {
        if (!this.validateCurrentStep()) {
            return;
        }
        if (this.currentStep === this.steps.length - 1) {
            await this.completeWizard();
            return;
        }
        if (this.currentStep === 3) {
            this.saveNutritionStep();
        }
        this.nextStep();
    }

    nextStep() {
        this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1);
        this.renderStep();
    }

    previousStep() {
        this.currentStep = Math.max(this.currentStep - 1, 0);
        this.renderStep();
    }

    validateCurrentStep() {
        const current = this.steps[this.currentStep];
        const requiredFields = Array.from(current.querySelectorAll('input[required], select[required]'));
        for (const field of requiredFields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
        }
        if (this.currentStep === 1 && this.elements.unitSystem.value === 'imperial') {
            const feet = Number(this.elements.heightFt.value);
            const inches = Number(this.elements.heightIn.value);
            if (!(feet > 0 && inches >= 0 && inches < 12)) {
                this.showStatus('Please enter a valid height in feet and inches.');
                return false;
            }
        }
        this.showStatus('');
        return true;
    }

    toggleUnitInputs() {
        const isImperial = this.elements.unitSystem.value === 'imperial';
        this.elements.imperialHeightFields.classList.toggle('hidden', !isImperial);
        this.elements.heightInput.closest('label').classList.toggle('hidden', isImperial);
        const heightLabel = document.getElementById('height-label');
        const weightLabel = document.getElementById('weight-label');
        const goalWeightLabel = document.getElementById('goal-weight-label');
        if (heightLabel && weightLabel && goalWeightLabel) {
            heightLabel.textContent = isImperial ? 'Height (ft / in)' : 'Height (cm)';
            weightLabel.textContent = isImperial ? 'Current weight (lb)' : 'Current weight (kg)';
            goalWeightLabel.textContent = isImperial ? 'Goal weight (lb)' : 'Goal weight (kg)';
        }
    }

    updateGoalSummary() {
        const goalType = this.elements.goalType.value;
        const workoutDays = this.elements.workoutDays.value || '0';
        const description = {
            lose: 'Lose weight',
            maintain: 'Maintain weight',
            gain: 'Gain weight',
            build: 'Build muscle',
            improve: 'Improve fitness'
        }[goalType] || 'Stay consistent';
        this.elements.goalSummaryText.textContent = `${description} with ${workoutDays} workouts per week.`;
    }

    syncNutritionFields() {
        const profile = this.collectProfileData();
        if (!profile) return;
        this.state.setProfile(profile);
        const recommended = this.state.calculateNutrition();
        this.elements.recommendCalories.textContent = recommended.calorieGoal;
        this.elements.recommendProtein.textContent = recommended.proteinGoal;
        this.elements.recommendCarbs.textContent = recommended.carbsGoal;
        this.elements.recommendFats.textContent = recommended.fatsGoal;
        this.elements.caloriesInput.value = recommended.calorieGoal;
        this.elements.proteinInput.value = recommended.proteinGoal;
        this.elements.carbsInput.value = recommended.carbsGoal;
        this.elements.fatsInput.value = recommended.fatsGoal;
        this.elements.waterInput.value = recommended.waterGoal;
    }

    collectProfileData() {
        const name = this.elements.name.value.trim();
        const age = Number(this.elements.age.value);
        const gender = this.elements.gender.value;
        const activityLevel = this.elements.activity.value;
        const unitSystem = this.elements.unitSystem.value;
        const weight = Number(this.elements.weight.value);
        const targetWeight = Number(this.elements.goalWeight.value);
        const goalType = this.elements.goalType?.value || 'maintain';
        const weeklyWeightChangeGoal = Number(this.elements.weeklyGoal?.value) || 0;
        const workoutDays = Number(this.elements.workoutDays?.value) || 0;

        let height = Number(this.elements.heightInput.value);
        if (unitSystem === 'imperial') {
            const feet = Number(this.elements.heightFt.value);
            const inches = Number(this.elements.heightIn.value);
            height = feet * 30.48 + inches * 2.54;
        }

        return {
            name,
            age,
            gender,
            activityLevel,
            unitSystem,
            height,
            weight,
            targetWeight,
            goalType,
            weeklyWeightChangeGoal,
            workoutDays
        };
    }

    saveNutritionStep() {
        const nutrition = {
            calorieGoal: Number(this.elements.caloriesInput.value),
            proteinGoal: Number(this.elements.proteinInput.value),
            carbsGoal: Number(this.elements.carbsInput.value),
            fatsGoal: Number(this.elements.fatsInput.value),
            waterGoal: Number(this.elements.waterInput.value)
        };
        this.state.setGoals({
            calorieGoal: nutrition.calorieGoal,
            proteinGoal: nutrition.proteinGoal,
            carbsGoal: nutrition.carbsGoal,
            fatsGoal: nutrition.fatsGoal,
            waterGoal: nutrition.waterGoal
        });
    }

    renderSummary() {
        const profile = this.collectProfileData();
        if (!profile) return;
        const units = profile.unitSystem === 'imperial' ? 'lb' : 'kg';
        const heightDisplay = profile.unitSystem === 'imperial'
            ? `${Math.floor(profile.height / 2.54 / 12)}ft ${Math.round((profile.height / 2.54) % 12)}in`
            : `${Math.round(profile.height)} cm`;

        this.elements.summaryName.textContent = profile.name;
        this.elements.summaryAge.textContent = `${profile.age} years old`;
        this.elements.summaryGender.textContent = `${profile.gender}`;
        this.elements.summaryHeight.textContent = heightDisplay;
        this.elements.summaryWeight.textContent = `${profile.weight.toFixed(1)} ${units}`;
        this.elements.summaryTarget.textContent = `${profile.targetWeight.toFixed(1)} ${units}`;
        this.elements.summaryCalories.textContent = `${this.elements.caloriesInput.value} kcal`;
        this.elements.summaryProtein.textContent = `${this.elements.proteinInput.value} g protein`;
        this.elements.summaryCarbs.textContent = `${this.elements.carbsInput.value} g carbs`;
        this.elements.summaryFats.textContent = `${this.elements.fatsInput.value} g fats`;
        this.elements.summaryWater.textContent = `${this.elements.waterInput.value} L water`;
    }

    async completeWizard() {
        if (!this.validateCurrentStep()) {
            return;
        }

        const profileData = this.collectProfileData();
        this.state.setProfile(profileData);
        this.saveNutritionStep();
        await this.state.save(this.storage);
        window.location.href = 'fitness-nutrition.index.html';
    }

    showStatus(message) {
        this.elements.statusMessage.textContent = message;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const storage = new Storage();
    if (document.getElementById('app-frame')) {
        const app = new FitTrackUI(storage);
        await app.init();
    }
    if (document.getElementById('onboarding-form')) {
        const wizard = new OnboardingWizard();
        await wizard.init();
    }
});
