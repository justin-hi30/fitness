import { AppState } from './state.js';
import { ChartManager } from './charts.js';

export class FitTrackUI {
    constructor(storage) {
        this.storage = storage;
        this.state = new AppState();
        this.chartManager = new ChartManager();
        this.notifications = new Set();
        this.toastTimer = null;
    }

    async init() {
        await this.state.load(this.storage);
        this.cacheElements();
        this.bindEvents();
        this.applyTheme();
        this.setSection(this.state.state.currentSection);
        await this.renderAll();
    }

    cacheElements() {
        this.elements = {
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
            goalProgressFill: document.getElementById('goal-progress-fill'),
            sidebarCaloriesFill: document.getElementById('sidebar-calories-fill'),
            sidebarWaterFill: document.getElementById('sidebar-water-fill'),
            sidebarCalories: document.getElementById('sidebar-calories'),
            sidebarWater: document.getElementById('sidebar-water'),
            todayMealsList: document.getElementById('today-meals-list'),
            waterStatus: document.getElementById('water-status'),
            waterGlasses: document.getElementById('water-glasses'),
            mealSearchInput: document.getElementById('meal-search-input'),
            foodCategoryFilter: document.getElementById('food-category-filter'),
            foodCards: document.getElementById('food-cards'),
            mealsTableBody: document.getElementById('meals-table-body'),
            mealCount: document.getElementById('meal-count'),
            workoutList: document.getElementById('workout-list'),
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
                await this.renderAll();
            });
        }

        if (this.elements.addMealButton) {
            this.elements.addMealButton.addEventListener('click', async () => await this.handleAddMeal());
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
                this.state.setFilters({ globalSearch: this.elements.globalSearch.value });
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
                if (!confirm('Reset all FitTrack data and restore default values?')) return;
                await this.state.reset(this.storage);
                await this.state.save(this.storage);
                await this.renderAll();
                this.showToast('All data reset to defaults.', 'success');
            });
        }

        if (this.elements.goalsForm) {
            this.elements.goalsForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleSaveGoals();
            });
        }

        document.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

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

            if (target.matches('.water-glass')) {
                const index = Number(target.dataset.index);
                if (!Number.isNaN(index)) {
                    this.state.setWaterIntake(index + 1);
                    await this.saveState();
                    await this.renderAll();
                }
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
        this.renderWeight();
        this.renderAnalytics();
        this.renderSettings();
    }

    renderDashboard() {
        const totals = this.state.mealTotals;
        const goals = this.state.state.goals;
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
            this.elements.caloriesRemaining.textContent = `${Math.max(0, goals.calorieGoal - totals.calories)} kcal`;
        }
        if (this.elements.workoutRemaining) {
            this.elements.workoutRemaining.textContent = `${workoutRemaining}`;
        }
        if (this.elements.dashboardCalories) {
            this.elements.dashboardCalories.textContent = `${totals.calories} / ${goals.calorieGoal} kcal`;
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

        if (this.elements.goalProgressFill) {
            this.elements.goalProgressFill.style.width = `${completion}%`;
        }
        if (this.elements.sidebarCaloriesFill) {
            this.elements.sidebarCaloriesFill.style.width = `${caloriesPercent}%`;
        }
        if (this.elements.sidebarWaterFill) {
            const percent = this.computePercent(this.state.state.waterIntake, goals.waterGoal);
            this.elements.sidebarWaterFill.style.width = `${percent}%`;
        }
        if (this.elements.sidebarCalories) {
            this.elements.sidebarCalories.textContent = `${totals.calories} / ${goals.calorieGoal}`;
        }
        if (this.elements.sidebarWater) {
            this.elements.sidebarWater.textContent = `${this.state.state.waterIntake} / ${goals.waterGoal} glasses`;
        }

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

    renderWeight() {
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

        this.chartManager.renderLineChart(
            'weight-chart-canvas',
            this.state.weightChartData.labels,
            this.state.weightChartData.values,
            'Weight',
            '#38bdf8'
        );
    }

    renderAnalytics() {
        this.chartManager.renderLineChart(
            'weight-progress-chart',
            this.state.weightChartData.labels,
            this.state.weightChartData.values,
            'Weight',
            '#38bdf8'
        );

        this.chartManager.renderBarChart(
            'calories-chart',
            this.state.caloriesChartData.labels,
            this.state.caloriesChartData.values,
            'Calories',
            '#22c55e'
        );

        this.chartManager.renderBarChart(
            'protein-chart',
            this.state.proteinChartData.labels,
            this.state.proteinChartData.values,
            'Protein',
            '#f97316'
        );

        this.chartManager.renderBarChart(
            'workout-frequency-chart',
            this.state.workoutFrequencyChartData.labels,
            this.state.workoutFrequencyChartData.values,
            'Frequency',
            '#818cf8'
        );

        this.chartManager.renderBarChart(
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

    updateMacroProgress(totals, goals) {
        const caloriesPercent = this.computePercent(totals.calories, goals.calorieGoal);
        const proteinPercent = this.computePercent(totals.protein, goals.proteinGoal);
        const carbsPercent = this.computePercent(totals.carbs, goals.carbsGoal);
        const fatsPercent = this.computePercent(totals.fats, goals.fatsGoal);

        const caloriesFill = document.getElementById('calories-fill');
        const proteinFill = document.getElementById('protein-fill');
        const carbsFill = document.getElementById('carbs-fill');
        const fatsFill = document.getElementById('fats-fill');
        if (caloriesFill) caloriesFill.style.width = `${caloriesPercent}%`;
        if (proteinFill) proteinFill.style.width = `${proteinPercent}%`;
        if (carbsFill) carbsFill.style.width = `${carbsPercent}%`;
        if (fatsFill) fatsFill.style.width = `${fatsPercent}%`;
    }

    async handleAddMeal() {
        const name = prompt('Meal name', 'Greek yogurt bowl');
        if (!name) return;
        const category = prompt('Category', 'Snack') || 'Snack';
        const time = prompt('Time', '6:30 PM') || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const calories = this.parsePositiveNumber(prompt('Calories', '320'));
        const protein = this.parsePositiveNumber(prompt('Protein (g)', '24'));
        const carbs = this.parsePositiveNumber(prompt('Carbs (g)', '30'));
        const fats = this.parsePositiveNumber(prompt('Fats (g)', '12'));

        if (calories == null || protein == null || carbs == null || fats == null) {
            this.showToast('Meal values must be positive numbers.', 'error');
            return;
        }

        this.state.addMeal({ name, category, time, calories, protein, carbs, fats });
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
        const calories = this.parsePositiveNumber(prompt('Calories', meal.calories), meal.calories);
        const protein = this.parsePositiveNumber(prompt('Protein (g)', meal.protein), meal.protein);
        const carbs = this.parsePositiveNumber(prompt('Carbs (g)', meal.carbs), meal.carbs);
        const fats = this.parsePositiveNumber(prompt('Fats (g)', meal.fats), meal.fats);
        if (calories == null || protein == null || carbs == null || fats == null) {
            this.showToast('Meal values must be positive numbers.', 'error');
            return;
        }
        this.state.editMeal(mealId, { name, category, time, calories, protein, carbs, fats });
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
        const toggle = document.getElementById('toggle-theme');
        if (toggle) {
            toggle.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }

    computePercent(value, goal) {
        return Math.min(100, Math.max(0, Math.round((value / Math.max(goal, 1)) * 100)));
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
