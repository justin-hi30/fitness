
// Save user info from the form into localStorage and redirect
function saveUserInfo() {
    const userInfo = {
        name: document.getElementById('name').value || '',
        age: document.getElementById('age').value || '',
        gender: document.getElementById('gender').value || '',
        unitSystem: document.getElementById('unit-system')?.value || 'metric',
        weight: document.getElementById('weight').value || '',
        height: document.getElementById('height').value || '',
        goalWeight: document.getElementById('goal-weight').value || '',
        activity: document.getElementById('activity').value || '',
        goal: document.getElementById('goal').value || '',
        email: document.getElementById('email')?.value || '',
        termsAccepted: document.getElementById('terms')?.checked || false
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    const status = document.getElementById('status-msg');
    if (status) status.textContent = 'Saved — redirecting...';

    setTimeout(() => {
        window.location.href = 'fitness-nutrition.index.html';
    }, 600);
}

// Populate the fitness page with stored info
function populateUserInfo() {
    const raw = localStorage.getItem('userInfo');
    const container = document.getElementById('info-container');
    const noData = document.getElementById('no-data');
    if (!raw) {
        if (container) container.style.display = 'none';
        if (noData) noData.style.display = 'block';
        return;
    }

    let info = {};
    try {
        info = JSON.parse(raw);
    } catch (e) {
        console.error('Invalid userInfo in storage', e);
    }

    if (!container) return;
    const unit = info.unitSystem === 'imperial' ? 'imperial' : 'metric';
    const weightUnit = unit === 'imperial' ? 'lb' : 'kg';
    const heightUnit = unit === 'imperial' ? 'ft' : 'cm';
    container.innerHTML = `
        <ul>
            <li><strong>Name:</strong> ${escapeHtml(info.name || '')}</li>
            <li><strong>Age:</strong> ${escapeHtml(info.age || '')}</li>
            <li><strong>Gender:</strong> ${escapeHtml(info.gender || '')}</li>
            <li><strong>Unit system:</strong> ${escapeHtml(unit === 'imperial' ? 'Imperial' : 'Metric')}</li>
            <li><strong>Weight:</strong> ${escapeHtml(info.weight || '')} ${weightUnit}</li>
            <li><strong>Height:</strong> ${escapeHtml(info.height || '')} ${heightUnit}</li>
            <li><strong>Weight goal:</strong> ${escapeHtml(info.goalWeight || '')} ${weightUnit}</li>
            <li><strong>Activity level:</strong> ${escapeHtml(info.activity || '')}</li>
            <li><strong>Goal:</strong> ${escapeHtml(info.goal || '')}</li>
            <li><strong>Email:</strong> ${escapeHtml(info.email || '')}</li>
            <li><strong>Terms accepted:</strong> ${info.termsAccepted ? 'Yes' : 'No'}</li>
        </ul>
    `;
}

function calculateNutritionGoals(info) {
    const weightKg = info.unitSystem === 'imperial' ? parseFloat(info.weight) * 0.453592 : parseFloat(info.weight);
    const heightCm = info.unitSystem === 'imperial' ? parseFloat(info.height) * 30.48 : parseFloat(info.height);
    const age = parseInt(info.age, 10) || 0;
    const gender = (info.gender || '').toLowerCase();
    const activity = (info.activity || 'sedentary').toLowerCase();
    const goal = (info.goal || 'maintain').toLowerCase();

    const bmr = gender === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : gender === 'female'
            ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
            : 10 * weightKg + 6.25 * heightCm - 5 * age - 78;

    const activityFactors = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725
    };
    const factor = activityFactors[activity] || 1.2;
    let calories = bmr * factor;

    if (goal === 'lose') calories = Math.max(1200, calories - 500);
    if (goal === 'gain') calories = calories + 300;

    const proteinPerKg = goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.6;
    const proteinGrams = weightKg * proteinPerKg;
    const proteinCalories = proteinGrams * 4;
    const fatCalories = calories * 0.25;
    const carbsCalories = calories - proteinCalories - fatCalories;
    const fatGrams = fatCalories / 9;
    const carbsGrams = carbsCalories / 4;

    return {
        calories: Math.round(calories),
        proteinGrams: Math.round(proteinGrams),
        proteinCalories: Math.round(proteinCalories),
        fatGrams: Math.round(fatGrams),
        fatCalories: Math.round(fatCalories),
        carbsGrams: Math.round(carbsGrams),
        carbsCalories: Math.round(carbsCalories)
    };
}

function showNutritionGoals() {
    const raw = localStorage.getItem('userInfo');
    const container = document.getElementById('nutrition-container');
    if (!raw) {
        if (container) container.textContent = 'Enter your information first to see your nutrition goals.';
        return;
    }

    let info = {};
    try {
        info = JSON.parse(raw);
    } catch (e) {
        console.error('Invalid userInfo in storage', e);
        if (container) container.textContent = 'Unable to calculate nutrition goals.';
        return;
    }

    const goals = calculateNutritionGoals(info);
    if (!container) return;

    if (!goals || Number.isNaN(goals.calories) || Number.isNaN(goals.proteinGrams)) {
        container.textContent = 'Please complete your weight, height, age, and activity info to calculate nutrition goals.';
        return;
    }

    container.innerHTML = `
        <div class="nutrition-card">
            <p><strong>Daily calorie target:</strong> ${goals.calories} kcal</p>
            <p><strong>Protein:</strong> ${goals.proteinGrams} g (${goals.proteinCalories} kcal)</p>
            <p><strong>Carbs:</strong> ${goals.carbsGrams} g (${goals.carbsCalories} kcal)</p>
            <p><strong>Fats:</strong> ${goals.fatGrams} g (${goals.fatCalories} kcal)</p>
        </div>
    `;
}

// Simple escaping to avoid injecting HTML from localStorage
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getSteps() {
    return Array.from(document.querySelectorAll('.step'));
}

function updateStepDisplay(index) {
    const steps = getSteps();
    const total = steps.length;
    const progress = document.getElementById('progress-fill');
    const title = document.getElementById('step-title');
    const subtitle = document.getElementById('step-subtitle');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');

    steps.forEach((step, idx) => {
        step.style.display = idx === index ? 'grid' : 'none';
    });

    if (progress) {
        progress.style.width = `${((index + 1) / total) * 100}%`;
    }

    if (index === 0) {
        title.textContent = "What's your first name?";
        subtitle.textContent = "We're happy you're here. Let's get to know a little about you.";
        backButton.style.visibility = 'hidden';
        nextButton.textContent = 'Next';
    } else if (index === 1) {
        title.textContent = 'Please tell us your age and gender.';
        subtitle.textContent = 'This helps us personalize your plan.';
        backButton.style.visibility = 'visible';
        nextButton.textContent = 'Next';
    } else if (index === 2) {
        title.textContent = 'How tall are you? And how much do you weigh?';
        subtitle.textContent = 'These numbers help estimate your goals.';
        backButton.style.visibility = 'visible';
        nextButton.textContent = 'Next';
    } else if (index === 3) {
        title.textContent = 'Almost done — choose your activity and goal';
        subtitle.textContent = 'Select the level of activity and the goal that fits you best.';
        backButton.style.visibility = 'visible';
        nextButton.textContent = 'Next';
    } else {
        title.textContent = 'Almost there! Create your account.';
        subtitle.textContent = 'Enter your email, create a password, or continue with Google.';
        backButton.style.visibility = 'visible';
        nextButton.textContent = 'Continue';
    }
}

function validateCurrentStep(step) {
    const fields = Array.from(step.querySelectorAll('input, select'));
    for (const field of fields) {
        if (!field.checkValidity()) {
            field.reportValidity();
            return false;
        }
    }
    return true;
}

function nextStep() {
    const steps = getSteps();
    const activeIndex = steps.findIndex(step => step.style.display !== 'none');
    if (activeIndex === -1) return;

    const currentStep = steps[activeIndex];
    if (!validateCurrentStep(currentStep)) {
        return;
    }

    if (activeIndex === steps.length - 1) {
        saveUserInfo();
        return;
    }

    updateStepDisplay(activeIndex + 1);
}

function previousStep() {
    const steps = getSteps();
    const activeIndex = steps.findIndex(step => step.style.display !== 'none');
    if (activeIndex <= 0) return;
    updateStepDisplay(activeIndex - 1);
}

function fillSavedValues() {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return;

    let info = {};
    try {
        info = JSON.parse(raw);
    } catch {
        return;
    }

    const fields = ['name', 'age', 'gender', 'unit-system', 'weight', 'height', 'goal-weight', 'activity', 'goal', 'email'];
    fields.forEach((field) => {
        const input = document.getElementById(field);
        if (input && info[field]) input.value = info[field];
    });

    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox && info.termsAccepted) {
        termsCheckbox.checked = true;
    }
}

function updateUnitLabels() {
    const system = document.getElementById('unit-system')?.value || 'metric';
    const weightLabel = document.getElementById('weight-label');
    const heightLabel = document.getElementById('height-label');
    const goalWeightLabel = document.getElementById('goal-weight-label');
    const weightInput = document.getElementById('weight');
    const heightInput = document.getElementById('height');
    const goalWeightInput = document.getElementById('goal-weight');

    const weightUnit = system === 'imperial' ? 'lb' : 'kg';
    const heightUnit = system === 'imperial' ? 'ft' : 'cm';

    if (heightLabel) heightLabel.textContent = `How tall are you? (${heightUnit})`;
    if (weightLabel) weightLabel.textContent = `How much do you weigh? (${weightUnit})`;
    if (goalWeightLabel) goalWeightLabel.textContent = `What is your weight goal? (${weightUnit})`;
    if (heightInput) heightInput.placeholder = system === 'imperial' ? 'e.g. 5.7' : 'e.g. 170';
    if (weightInput) weightInput.placeholder = system === 'imperial' ? 'e.g. 150' : 'e.g. 65.5';
    if (goalWeightInput) goalWeightInput.placeholder = system === 'imperial' ? 'e.g. 160' : 'e.g. 68';
}

// Attach event listeners when the DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('user-form');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');

    fillSavedValues();
    updateUnitLabels();
    updateStepDisplay(0);

    const unitSystem = document.getElementById('unit-system');
    if (unitSystem) {
        unitSystem.addEventListener('change', updateUnitLabels);
    }

    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            saveUserInfo();
        });
    }

    const googleButton = document.querySelector('.google-button');
    const emailInput = document.getElementById('email');
    if (googleButton && emailInput) {
        googleButton.addEventListener('click', function () {
            const gmail = prompt('Enter your Gmail address to continue:', 'example@gmail.com');
            if (gmail) {
                emailInput.value = gmail;
                emailInput.focus();
            }
        });
    }

    if (backButton) {
        backButton.addEventListener('click', previousStep);
    }
    if (nextButton) {
        nextButton.addEventListener('click', nextStep);
    }

    if (document.getElementById('info-container')) {
        populateUserInfo();
    }
    if (document.getElementById('nutrition-container')) {
        showNutritionGoals();
    }

    if (document.getElementById('app-frame')) {
        initFitnessApp();
    }
});

const defaultTrackerState = {
    userInfo: {
        name: 'Alex',
        age: 28,
        gender: 'Male',
        unitSystem: 'metric'
    },
    goals: {
        calorieGoal: 2200,
        proteinGoal: 150,
        carbsGoal: 275,
        fatsGoal: 73,
        waterGoal: 8,
        workoutGoal: 4,
        weightGoal: 68
    },
    meals: [
        { id: 'm1', name: 'Oatmeal with berries', category: 'Breakfast', time: '8:00 AM', calories: 420, protein: 13, carbs: 70, fats: 7 },
        { id: 'm2', name: 'Grilled chicken salad', category: 'Lunch', time: '12:30 PM', calories: 520, protein: 48, carbs: 32, fats: 18 },
        { id: 'm3', name: 'Protein shake', category: 'Snack', time: '4:00 PM', calories: 220, protein: 28, carbs: 10, fats: 2 }
    ],
    workouts: [
        { id: 'w1', title: 'Upper body strength', type: 'Strength', exercises: 'Bench press • Pull-ups • Shoulder press', duration: 45, calories: 320, date: 'May 20' },
        { id: 'w2', title: 'Cardio HIIT', type: 'Cardio', exercises: 'Burpees • Jump rope • Mountain climbers', duration: 25, calories: 280, date: 'May 18' },
        { id: 'w3', title: 'Lower body strength', type: 'Strength', exercises: 'Squats • Deadlifts • Lunges', duration: 50, calories: 360, date: 'May 16' }
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
    waterIntake: 6,
    settings: {
        theme: 'dark',
        units: 'metric'
    },
    foodDatabase: [
        { id: 'f1', name: 'Chicken breast', calories: 165, protein: 31, carbs: 0, fats: 4, serving: '100g' },
        { id: 'f2', name: 'Brown rice', calories: 216, protein: 5, carbs: 45, fats: 2, serving: '1 cup' },
        { id: 'f3', name: 'Avocado toast', calories: 320, protein: 9, carbs: 32, fats: 18, serving: '1 slice' },
        { id: 'f4', name: 'Greek yogurt', calories: 130, protein: 15, carbs: 10, fats: 0, serving: '150g' },
        { id: 'f5', name: 'Banana', calories: 105, protein: 1, carbs: 27, fats: 0, serving: '1 medium' },
        { id: 'f6', name: 'Salmon fillet', calories: 210, protein: 22, carbs: 0, fats: 12, serving: '100g' }
    ],
    recentSearches: ['Chicken', 'Oats', 'Protein', 'Smoothie'],
    currentSection: 'dashboard'
};

let trackerState = {};

function loadTrackerState() {
    const raw = localStorage.getItem('fitTrackState');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            trackerState = {
                ...defaultTrackerState,
                ...parsed,
                goals: { ...defaultTrackerState.goals, ...(parsed.goals || {}) },
                settings: { ...defaultTrackerState.settings, ...(parsed.settings || {}) }
            };
        } catch {
            trackerState = { ...defaultTrackerState };
        }
    } else {
        trackerState = { ...defaultTrackerState };
    }

    const savedUser = localStorage.getItem('userInfo');
    if (savedUser) {
        try {
            const userInfo = JSON.parse(savedUser);
            trackerState.userInfo = { ...trackerState.userInfo, ...userInfo };
            if (userInfo.unitSystem) trackerState.settings.units = userInfo.unitSystem;
            if (userInfo.goalWeight) trackerState.goals.weightGoal = parseFloat(userInfo.goalWeight) || trackerState.goals.weightGoal;
        } catch {
            // ignore invalid user data
        }
    }
}

function saveTrackerState() {
    localStorage.setItem('fitTrackState', JSON.stringify(trackerState));
}

function getMealTotals() {
    return trackerState.meals.reduce((totals, meal) => {
        totals.calories += meal.calories;
        totals.protein += meal.protein;
        totals.carbs += meal.carbs;
        totals.fats += meal.fats;
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

function getWorkoutTotals() {
    return trackerState.workouts.reduce((totals, workout) => {
        totals.duration += workout.duration;
        totals.calories += workout.calories;
        return totals;
    }, { duration: 0, calories: 0 });
}

function updateUserGreeting() {
    const greeting = document.getElementById('user-greeting');
    if (!greeting) return;
    const name = trackerState.userInfo.name || 'Fitness Friend';
    greeting.textContent = `Welcome back, ${name}`;
}

function setActiveSection(section) {
    trackerState.currentSection = section;
    document.querySelectorAll('.section-panel').forEach((sectionEl) => {
        sectionEl.classList.toggle('hidden-section', sectionEl.id !== `${section}-section`);
    });
    document.querySelectorAll('.nav-item, .mobile-item').forEach((button) => {
        button.classList.toggle('active', button.dataset.section === section);
    });
}

function applyTheme() {
    document.body.classList.toggle('theme-light', trackerState.settings.theme === 'light');
    document.body.classList.toggle('theme-dark', trackerState.settings.theme === 'dark');
    const toggle = document.getElementById('toggle-theme');
    if (toggle) toggle.textContent = trackerState.settings.theme === 'dark' ? '🌙' : '☀️';
}

function updateDashboard() {
    const totals = getMealTotals();
    const goals = trackerState.goals;
    const workoutCount = trackerState.workouts.length;
    const workoutRemaining = Math.max(0, goals.workoutGoal - workoutCount);
    const completion = Math.round(((totals.calories / goals.calorieGoal) + (totals.protein / goals.proteinGoal) + (totals.carbs / goals.carbsGoal) + (totals.fats / goals.fatsGoal)) / 4 * 100);
    const caloriePercent = Math.min(100, Math.round((totals.calories / goals.calorieGoal) * 100));
    const proteinPercent = Math.min(100, Math.round((totals.protein / goals.proteinGoal) * 100));
    const carbsPercent = Math.min(100, Math.round((totals.carbs / goals.carbsGoal) * 100));
    const fatsPercent = Math.min(100, Math.round((totals.fats / goals.fatsGoal) * 100));
    document.getElementById('dashboard-calories').textContent = `${totals.calories} / ${goals.calorieGoal} kcal`;
    document.getElementById('dashboard-protein').textContent = `${totals.protein} / ${goals.proteinGoal} g`;
    document.getElementById('dashboard-carbs').textContent = `${totals.carbs} / ${goals.carbsGoal} g`;
    document.getElementById('dashboard-fats').textContent = `${totals.fats} / ${goals.fatsGoal} g`;
    document.getElementById('goal-completion').textContent = `${Math.min(100, completion)}%`;
    document.getElementById('calories-remaining').textContent = `${Math.max(0, goals.calorieGoal - totals.calories)} kcal`;
    document.getElementById('workout-remaining').textContent = `${workoutRemaining}`;
    document.getElementById('weekly-workouts').textContent = `${workoutCount} / ${goals.workoutGoal}`;
    document.getElementById('snapshot-protein').textContent = `${totals.protein}g`;
    document.getElementById('snapshot-carbs').textContent = `${totals.carbs}g`;
    document.getElementById('snapshot-fats').textContent = `${totals.fats}g`;
    document.getElementById('goal-progress-fill').style.width = `${Math.min(100, completion)}%`;
    document.getElementById('sidebar-calories').textContent = `${totals.calories} / ${goals.calorieGoal}`;
    document.getElementById('sidebar-calories-fill').style.width = `${caloriePercent}%`;
    document.getElementById('sidebar-water').textContent = `${trackerState.waterIntake} / ${goals.waterGoal} glasses`;
    document.getElementById('sidebar-water-fill').style.width = `${Math.min(100, Math.round((trackerState.waterIntake / goals.waterGoal) * 100))}%`;
    const todayMealsList = document.getElementById('today-meals-list');
    if (todayMealsList) {
        todayMealsList.innerHTML = trackerState.meals.slice(0, 4).map((meal) => `
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
    updateMealPanel(totals, caloriePercent, proteinPercent, carbsPercent, fatsPercent);
    renderWaterGlasses();
}

function updateMealPanel(totals, caloriePercent, proteinPercent, carbsPercent, fatsPercent) {
    const goals = trackerState.goals;
    document.getElementById('meal-calories').textContent = `${totals.calories} / ${goals.calorieGoal} kcal`;
    document.getElementById('meal-protein').textContent = `${totals.protein} / ${goals.proteinGoal} g`;
    document.getElementById('meal-carbs').textContent = `${totals.carbs} / ${goals.carbsGoal} g`;
    document.getElementById('meal-fats').textContent = `${totals.fats} / ${goals.fatsGoal} g`;
    document.getElementById('calories-fill').style.width = `${caloriePercent}%`;
    document.getElementById('protein-fill').style.width = `${proteinPercent}%`;
    document.getElementById('carbs-fill').style.width = `${carbsPercent}%`;
    document.getElementById('fats-fill').style.width = `${fatsPercent}%`;
}

function renderFoodCards() {
    const container = document.getElementById('food-cards');
    if (!container) return;
    container.innerHTML = trackerState.foodDatabase.map((food) => `
        <article class="food-card">
            <div>
                <h3>${food.name}</h3>
                <p>${food.serving}</p>
            </div>
            <div class="food-values">
                <span>Calories<span>${food.calories} kcal</span></span>
                <span>Protein<span>${food.protein}g</span></span>
                <span>Carbs<span>${food.carbs}g</span></span>
                <span>Fats<span>${food.fats}g</span></span>
            </div>
            <button data-food="${food.id}" class="add-food-button">Add</button>
        </article>
    `).join('');
}

function renderMealsTable(filter = '') {
    const table = document.getElementById('meals-table-body');
    if (!table) return;
    const rows = trackerState.meals.filter((meal) => {
        return meal.name.toLowerCase().includes(filter) || meal.category.toLowerCase().includes(filter);
    }).map((meal) => `
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
                <button data-action="edit" data-id="${meal.id}">Edit</button>
                <button data-action="delete" data-id="${meal.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    table.innerHTML = rows;
    const mealCount = document.getElementById('meal-count');
    if (mealCount) mealCount.textContent = `${rows.length} items`;
}

function renderWorkouts() {
    const container = document.getElementById('workout-list');
    if (!container) return;
    const totals = getWorkoutTotals();
    const workoutGoal = trackerState.goals.workoutGoal;
    document.getElementById('workout-session-count').textContent = `${trackerState.workouts.length} / ${workoutGoal}`;
    document.getElementById('weekly-calories').textContent = `${totals.calories} kcal`;
    document.getElementById('workout-duration').textContent = `${totals.duration} min`;
    document.getElementById('workout-count').textContent = `${trackerState.workouts.length}`;
    container.innerHTML = trackerState.workouts.map((workout) => `
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
            <p>${workout.exercises}</p>
            <div class="card-row">
                <span>${workout.type}</span>
                <span>${workout.duration} min</span>
            </div>
        </article>
    `).join('');
}

function renderWeightTracker() {
    const currentWeight = trackerState.weightEntries[trackerState.weightEntries.length - 1]?.weight || trackerState.goals.weightGoal;
    document.getElementById('current-weight').textContent = `${currentWeight} kg`;
    document.getElementById('goal-weight').textContent = `Goal ${trackerState.goals.weightGoal} kg`;
    const chart = document.getElementById('weight-chart');
    if (!chart) return;
    const max = Math.max(...trackerState.weightEntries.map((entry) => entry.weight));
    const min = Math.min(...trackerState.weightEntries.map((entry) => entry.weight));
    chart.innerHTML = trackerState.weightEntries.map((entry) => {
        const height = ((entry.weight - min) / (max - min || 1)) * 100;
        return `<span class="graph-bar" style="height:${Math.max(16, height)}%">${entry.weight}</span>`;
    }).join('');
    const list = document.getElementById('measurement-list');
    if (list) {
        list.innerHTML = trackerState.measurements.map((item) => `
            <li>
                <span>${item.label}</span>
                <strong>${item.value}</strong>
            </li>
        `).join('');
    }
}

function renderAnalytics() {
    renderLineGraph('weight-progress-graph', trackerState.weightEntries.map((entry) => entry.weight));
    renderBarGraph('calories-graph', trackerState.meals.map((meal) => meal.calories), trackerState.meals.map((meal) => meal.time));
    renderBarGraph('protein-graph', trackerState.meals.map((meal) => meal.protein), trackerState.meals.map((meal) => meal.time));
    renderBarGraph('workout-frequency-graph', trackerState.workouts.map((_, idx) => 20 + idx * 10), trackerState.workouts.map((workout) => workout.date));
    renderBarGraph('workout-bar-chart', trackerState.workouts.map((_, idx) => 35 + idx * 15), ['W1', 'W2', 'W3', 'W4']);
}

function renderLineGraph(containerId, values = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    container.innerHTML = values.map((value) => {
        const height = ((value - min) / (max - min || 1)) * 100;
        return `<span class="graph-bar" style="height:${Math.max(16, height)}%">${value}</span>`;
    }).join('');
}

function renderBarGraph(containerId, values = [], labels = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const max = Math.max(...values, 1);
    container.innerHTML = values.map((value, index) => {
        const height = Math.round((value / max) * 100);
        const label = labels[index] || '';
        return `<div class="graph-bar" style="height:${Math.max(18, height)}%"><span>${label}</span></div>`;
    }).join('');
}

function renderWaterGlasses() {
    const container = document.getElementById('water-glasses');
    if (!container) return;
    const goal = trackerState.goals.waterGoal;
    container.innerHTML = Array.from({ length: goal }, (_, index) => {
        const filled = index < trackerState.waterIntake ? 'filled' : '';
        return `<button type="button" class="water-glass ${filled}" data-index="${index}"></button>`;
    }).join('');
    document.getElementById('water-status').textContent = `${trackerState.waterIntake} / ${goal} glasses`;
}

function bindAppEvents() {
    document.querySelectorAll('.nav-item, .mobile-item').forEach((button) => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            if (section) {
                setActiveSection(section);
                saveTrackerState();
            }
        });
    });

    const resetDataButton = document.getElementById('reset-data-button');
    if (resetDataButton) {
        resetDataButton.addEventListener('click', () => {
            if (!confirm('Reset progress to 0% and restore default values?')) return;

            // Reset stored state used by the legacy tracker.js
            localStorage.removeItem('fitTrackState');

            // Re-load defaults and force 0% on progress UI
            loadTrackerState();
            updateDashboard();

            const goalFill = document.getElementById('goal-progress-fill');
            if (goalFill) goalFill.style.width = '0%';

            const sidebarCaloriesFill = document.getElementById('sidebar-calories-fill');
            if (sidebarCaloriesFill) sidebarCaloriesFill.style.width = '0%';

            const sidebarWaterFill = document.getElementById('sidebar-water-fill');
            if (sidebarWaterFill) sidebarWaterFill.style.width = '0%';

            updateMealPanel({ calories: 0, protein: 0, carbs: 0, fats: 0 }, 0, 0, 0, 0);
            renderWaterGlasses();

            saveTrackerState();
        });
    }

    const addWaterButton = document.getElementById('add-water-button');
    if (addWaterButton) {
        addWaterButton.addEventListener('click', () => {
            trackerState.waterIntake = Math.min(trackerState.goals.waterGoal, trackerState.waterIntake + 1);
            renderWaterGlasses();
            updateDashboard();
            saveTrackerState();
        });
    }

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.add-food-button')) {
            addFoodById(target.dataset.food);
        }
        if (target.matches('.water-glass')) {
            trackerState.waterIntake = Number(target.dataset.index) + 1;
            renderWaterGlasses();
            updateDashboard();
            saveTrackerState();
        }
        if (target.matches('[data-action="edit"]')) {
            editMeal(target.dataset.id);
        }
        if (target.matches('[data-action="delete"]')) {
            deleteMeal(target.dataset.id);
        }
        if (target.matches('.search-tag')) {
            const value = target.textContent.trim();
            const input = document.getElementById('meal-search-input');
            if (input) {
                input.value = value;
                renderMealsTable(value.toLowerCase());
            }
        }
    });

    const mealSearchInput = document.getElementById('meal-search-input');
    if (mealSearchInput) {
        mealSearchInput.addEventListener('input', () => {
            renderMealsTable(mealSearchInput.value.toLowerCase());
        });
    }

    const showAddMeal = document.getElementById('show-add-meal');
    if (showAddMeal) {
        showAddMeal.addEventListener('click', openAddMealPrompt);
    }

    const addWorkoutButton = document.getElementById('add-workout-button');
    if (addWorkoutButton) {
        addWorkoutButton.addEventListener('click', addWorkout);
    }

    const goalForm = document.getElementById('goals-form');
    if (goalForm) {
        goalForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveGoals();
        });
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            trackerState.settings.theme = event.target.value;
            applyTheme();
            saveTrackerState();
        });
    }

    const unitSelect = document.getElementById('unit-select');
    if (unitSelect) {
        unitSelect.addEventListener('change', (event) => {
            trackerState.settings.units = event.target.value;
            saveTrackerState();
        });
    }

    const toggleTheme = document.getElementById('toggle-theme');
    if (toggleTheme) {
        toggleTheme.addEventListener('click', () => {
            trackerState.settings.theme = trackerState.settings.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) themeSelect.value = trackerState.settings.theme;
            saveTrackerState();
        });
    }
}

function openAddMealPrompt() {
    const name = prompt('Meal name', 'Greek yogurt bowl');
    if (!name) return;
    const calories = parseInt(prompt('Calories', '320'), 10) || 0;
    const protein = parseInt(prompt('Protein (g)', '24'), 10) || 0;
    const carbs = parseInt(prompt('Carbs (g)', '30'), 10) || 0;
    const fats = parseInt(prompt('Fats (g)', '12'), 10) || 0;
    const category = prompt('Meal type', 'Snack') || 'Snack';
    const time = prompt('Time', '6:30 PM') || '6:30 PM';
    trackerState.meals.unshift({ id: `m${Date.now()}`, name, category, time, calories, protein, carbs, fats });
    saveTrackerState();
    updateDashboard();
    renderMealsTable();
}

function addFoodById(foodId) {
    const food = trackerState.foodDatabase.find((item) => item.id === foodId);
    if (!food) return;
    trackerState.meals.unshift({ id: `m${Date.now()}`, name: food.name, category: 'Snack', time: 'Now', calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats });
    trackerState.recentSearches.unshift(food.name);
    trackerState.recentSearches = Array.from(new Set(trackerState.recentSearches)).slice(0, 6);
    saveTrackerState();
    updateDashboard();
    renderMealsTable();
    renderRecentSearches();
}

function editMeal(id) {
    const meal = trackerState.meals.find((item) => item.id === id);
    if (!meal) return;
    const name = prompt('Meal name', meal.name);
    if (!name) return;
    meal.name = name;
    meal.calories = parseInt(prompt('Calories', meal.calories), 10) || meal.calories;
    meal.protein = parseInt(prompt('Protein (g)', meal.protein), 10) || meal.protein;
    meal.carbs = parseInt(prompt('Carbs (g)', meal.carbs), 10) || meal.carbs;
    meal.fats = parseInt(prompt('Fats (g)', meal.fats), 10) || meal.fats;
    saveTrackerState();
    updateDashboard();
    renderMealsTable();
}

function deleteMeal(id) {
    trackerState.meals = trackerState.meals.filter((meal) => meal.id !== id);
    saveTrackerState();
    updateDashboard();
    renderMealsTable();
}

function addWorkout() {
    const title = prompt('Workout title', 'Full body strength');
    if (!title) return;
    const type = prompt('Type', 'Strength') || 'Strength';
    const exercises = prompt('Exercises', 'Squats • Lunges • Press') || '';
    const duration = parseInt(prompt('Duration (min)', '40'), 10) || 40;
    const calories = parseInt(prompt('Calories burned', '320'), 10) || 320;
    const date = prompt('Date', 'May 25') || 'Today';
    trackerState.workouts.unshift({ id: `w${Date.now()}`, title, type, exercises, duration, calories, date });
    saveTrackerState();
    renderWorkouts();
    updateDashboard();
}

function saveGoals() {
    trackerState.goals.calorieGoal = parseInt(document.getElementById('goal-calories').value, 10) || trackerState.goals.calorieGoal;
    trackerState.goals.proteinGoal = parseInt(document.getElementById('goal-protein').value, 10) || trackerState.goals.proteinGoal;
    trackerState.goals.carbsGoal = parseInt(document.getElementById('goal-carbs').value, 10) || trackerState.goals.carbsGoal;
    trackerState.goals.fatsGoal = parseInt(document.getElementById('goal-fats').value, 10) || trackerState.goals.fatsGoal;
    trackerState.goals.waterGoal = parseInt(document.getElementById('goal-water').value, 10) || trackerState.goals.waterGoal;
    trackerState.goals.workoutGoal = parseInt(document.getElementById('goal-workouts').value, 10) || trackerState.goals.workoutGoal;
    saveTrackerState();
    updateDashboard();
    alert('Goals updated successfully');
}

function populateGoalForm() {
    document.getElementById('goal-calories').value = trackerState.goals.calorieGoal;
    document.getElementById('goal-protein').value = trackerState.goals.proteinGoal;
    document.getElementById('goal-carbs').value = trackerState.goals.carbsGoal;
    document.getElementById('goal-fats').value = trackerState.goals.fatsGoal;
    document.getElementById('goal-water').value = trackerState.goals.waterGoal;
    document.getElementById('goal-workouts').value = trackerState.goals.workoutGoal;
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = trackerState.settings.theme;
    const unitSelect = document.getElementById('unit-select');
    if (unitSelect) unitSelect.value = trackerState.settings.units;
}

function renderRecentSearches() {
    const container = document.getElementById('recent-searches');
    if (!container) return;
    container.innerHTML = trackerState.recentSearches.map((term) => `<button type="button" class="search-tag">${term}</button>`).join('');
}

function initFitnessApp() {
    loadTrackerState();
    applyTheme();
    updateUserGreeting();
    setActiveSection(trackerState.currentSection || 'dashboard');
    renderFoodCards();
    renderMealsTable();
    renderWorkouts();
    renderWeightTracker();
    renderAnalytics();
    updateDashboard();
    populateGoalForm();
    renderRecentSearches();
    bindAppEvents();
}

