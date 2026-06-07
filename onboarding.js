import { AppState } from './state.js';
import { Storage } from './storage.js';

class OnboardingWizard {
    constructor() {
        this.storage = new Storage();
        this.state = new AppState();
        this.currentStep = 0;
        this.steps = [];
        this.elements = {};
    }

    async init() {
        await this.state.load(this.storage);
        if (this.state.state.profile.name && this.state.state.profile.name !== 'FitTrack user') {
                window.location.href = 'fitness-nutrition.index.html';

        this.cacheElements();
        this.bindEvents();
        this.renderStep();
    }

    cacheElements() {
        this.steps = Array.from(document.querySelectorAll('.onboarding-step'));
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
        this.elements.startButton?.addEventListener('click', () => this.nextStep());
        this.elements.backButton?.addEventListener('click', () => this.previousStep());
        this.elements.nextButton?.addEventListener('click', () => this.tryAdvance());
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

    tryAdvance() {
        if (!this.validateCurrentStep()) {
            return;
        }
        if (this.currentStep === this.steps.length - 1) {
            this.completeWizard();
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
        if (!profile) {
            return;
        }
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
        if (!profile) {
            return;
        }
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

window.addEventListener('DOMContentLoaded', () => {
    const wizard = new OnboardingWizard();
    wizard.init();
});
