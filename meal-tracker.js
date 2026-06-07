const STORAGE_KEY = 'mealTrackerV1';

class Storage {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Storage.load error', e);
      return null;
    }
  }
  save(payload) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Storage.save error', e);
    }
  }
}

class Meal {
  constructor({
    id,
    name,
    calories,
    protein,
    carbs,
    fat,
    time,
    isPerServing,
    servingsEaten,
    notes
  } = {}) {
    this.id = id || `m-${Date.now()}-${Math.floor(Math.random() * 900)}`;
    this.name = (name || '').toString();

    // Backward compatibility: existing meals only have total macros.
    this.isPerServing = Boolean(isPerServing);
    this.servingsEaten = Number(servingsEaten) || 1;
    if (!Number.isFinite(this.servingsEaten) || this.servingsEaten <= 0) this.servingsEaten = 1;
    this.notes = notes == null ? '' : String(notes);

    this.calories = Number(calories) || 0;
    this.protein = Number(protein) || 0;
    this.carbs = Number(carbs) || 0;
    this.fat = Number(fat) || 0;
    this.time = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}


const DEFAULT = {
  goals: { calories: 2500, protein: 180, carbs: 300, fat: 70 },
  meals: [],
  theme: 'dark'
};

class ChartManager {
  constructor() {
    this.lib = null;
    this.registered = false;
    this.charts = {};
  }
  async ensure() {
    if (this.lib) return this.lib;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.min.js');
      this.lib = mod;
      return mod;
    } catch (e) {
      console.error('Chart import failed', e);
      return null;
    }
  }
  async createDoughnut(id, value, goal, color) {
    const mod = await this.ensure();
    if (!mod) return;
    const { Chart, ArcElement, Tooltip, Legend } = mod;
    if (!this.registered) {
      try { Chart.register(ArcElement, Tooltip, Legend); } catch (e) { /* ignore */ }
      this.registered = true;
    }
    const el = document.getElementById(id);
    if (!el) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
    const percent = Math.min(100, Math.max(0, Math.round((value / Math.max(goal,1)) * 100)));
    const data = {
      labels: ['Completed','Remaining'],
      datasets: [{ data: [value, Math.max(0, goal - value)], backgroundColor: [color, '#0b1220'], hoverOffset:4 }]
    };
    const cfg = {
      type: 'doughnut',
      data,
      options: { cutout: '72%', responsive:true, plugins:{legend:{display:false},tooltip:{enabled:false}} }
    };
    try {
      this.charts[id] = new Chart(el.getContext('2d'), cfg);
    } catch (e) {
      console.error('Chart creation failed', e);
    }
  }
}

class MealTracker {
  constructor() {
    this.storage = new Storage();
    this.state = { ...DEFAULT };
    this.chart = new ChartManager();
    this.cache();
    this.bind();
    this.load();
  }
  cache() {
    this.el = {
      goalCal: document.getElementById('goal-cal'),

      goalProt: document.getElementById('goal-prot'),
      goalCarb: document.getElementById('goal-carb'),
      goalFat: document.getElementById('goal-fat'),
      goalsForm: document.getElementById('goals-form'),
      resetGoals: document.getElementById('reset-goals'),
      mealForm: document.getElementById('meal-form'),
      mealName: document.getElementById('meal-name'),
      mealCal: document.getElementById('meal-cal'),
      mealProt: document.getElementById('meal-prot'),
      mealCarb: document.getElementById('meal-carb'),
      mealFat: document.getElementById('meal-fat'),
      mealPerServing: document.getElementById('meal-per-serving'),
      mealServings: document.getElementById('meal-servings'),
      mealNotes: document.getElementById('meal-notes'),
      mealsBody: document.getElementById('meals-body'),
      clearMeals: document.getElementById('clear-meals'),
      statMeals: document.getElementById('stat-meals'),
      statAvg: document.getElementById('stat-avg'),
      statTotal: document.getElementById('stat-total'),
      calConsumed: document.getElementById('cal-consumed'),
      protConsumed: document.getElementById('prot-consumed'),
      carbConsumed: document.getElementById('carb-consumed'),
      fatConsumed: document.getElementById('fat-consumed'),
      calRem: document.getElementById('cal-remaining'),
      protRem: document.getElementById('prot-remaining'),
      carbRem: document.getElementById('carb-remaining'),
      fatRem: document.getElementById('fat-remaining'),
      calChart: document.getElementById('cal-chart'),
      protChart: document.getElementById('prot-chart'),
      carbChart: document.getElementById('carb-chart'),
      fatChart: document.getElementById('fat-chart'),
      editModal: document.getElementById('edit-modal'),
      editForm: document.getElementById('edit-form'),
      editId: document.getElementById('edit-id'),
      editName: document.getElementById('edit-name'),
      editCal: document.getElementById('edit-cal'),
      editProt: document.getElementById('edit-prot'),
      editCarb: document.getElementById('edit-carb'),
      editFat: document.getElementById('edit-fat'),
      editPerServing: document.getElementById('edit-per-serving'),
      editServings: document.getElementById('edit-servings'),
      editNotes: document.getElementById('edit-notes'),
      darkToggle: document.getElementById('dark-toggle'),
      exportBtn: document.getElementById('export-data'),
      importBtn: document.getElementById('import-data'),
      importFile: document.getElementById('import-file')
    };
  }

  bind() {
    this.el.goalsForm?.addEventListener('submit', (e)=>{e.preventDefault();this.saveGoals();});
    this.el.resetGoals?.addEventListener('click', ()=>{this.state.goals = {...DEFAULT.goals};this.save();this.render();});
    this.el.mealForm?.addEventListener('submit', (e)=>{e.preventDefault();this.addMealFromForm();});
    this.el.clearMeals?.addEventListener('click', ()=>{if(confirm('Clear all meals?')){this.state.meals=[];this.save();this.render();}});
    this.el.mealsBody?.addEventListener('click', (ev)=>this.onMealsClick(ev));
    this.el.editForm?.addEventListener('submit', (e)=>{e.preventDefault();this.saveEdit();});
    this.el.editCancel?.addEventListener && this.el.editCancel?.addEventListener('click',()=>this.hideEdit());
    this.el.darkToggle?.addEventListener('click',()=>{this.toggleTheme();});
    this.el.exportBtn?.addEventListener('click',()=>this.export());
    this.el.importBtn?.addEventListener('click',()=>this.el.importFile.click());
    this.el.importFile?.addEventListener('change',async (e)=>{
      const f = e.target.files?.[0]; if(!f) return; try{const text=await f.text();this.import(JSON.parse(text));}catch(err){alert('Import failed: '+err.message);} finally{e.target.value='';}
    });
  }
  load() {
    const data = this.storage.load();
    if (data) {
      this.state = { ...DEFAULT, ...data };
      // Ensure backward compatibility
      this.state.goals = { ...DEFAULT.goals, ...(data.goals || {}) };
      this.state.meals = Array.isArray(data.meals) ? data.meals.map(m=>new Meal(m)) : [];
    }
    this.applyTheme();
    this.render();
  }
  save() { this.storage.save(this.state); }
  saveGoals() {
    const c = Number(this.el.goalCal.value) || 0;
    const p = Number(this.el.goalProt.value) || 0;
    const cb = Number(this.el.goalCarb.value) || 0;
    const f = Number(this.el.goalFat.value) || 0;
    this.state.goals = { calories:c, protein:p, carbs:cb, fat:f };
    this.save();
    this.render();
  }
  addMealFromForm(){
    const name = this.el.mealName.value.trim();

    const isPerServing = !!this.el.mealPerServing?.checked;
    const servingsEaten = this.parsePositive(this.el.mealServings?.value);
    const notes = this.el.mealNotes?.value?.trim() || '';

    const calInput = this.parsePositive(this.el.mealCal.value);
    const protInput = this.parsePositive(this.el.mealProt.value);
    const carbInput = this.parsePositive(this.el.mealCarb.value);
    const fatInput = this.parsePositive(this.el.mealFat.value);

    if(!name) return alert('Please enter a meal name');
    if([calInput, protInput, carbInput, fatInput].some(v=>v==null)) return alert('Enter valid numeric values');
    const safeServings = isPerServing ? (servingsEaten == null ? 1 : servingsEaten) : 1;

    const multiplier = isPerServing ? safeServings : 1;
    const meal = new Meal({
      name,
      calories: calInput * multiplier,
      protein: protInput * multiplier,
      carbs: carbInput * multiplier,
      fat: fatInput * multiplier,
      isPerServing,
      servingsEaten: safeServings,
      notes
    });

    this.state.meals.unshift(meal);
    this.save();
    this.clearMealForm();
    this.render();
  }

  clearMealForm(){
    this.el.mealName.value='';
    this.el.mealCal.value='';
    this.el.mealProt.value='';
    this.el.mealCarb.value='';
    this.el.mealFat.value='';
    if(this.el.mealPerServing) this.el.mealPerServing.checked = false;
    if(this.el.mealServings) this.el.mealServings.value = '1';
    if(this.el.mealNotes) this.el.mealNotes.value = '';
  }


  onMealsClick(ev){
    const t = ev.target; if(!(t instanceof HTMLElement)) return;
    const tr = t.closest('tr'); if(!tr) return;
    const id = tr.dataset.id;
    if(t.matches('[data-action="edit"]')) this.showEdit(id);
    if(t.matches('[data-action="delete"]')){ if(confirm('Delete this meal?')){ this.state.meals = this.state.meals.filter(m=>m.id!==id); this.save(); this.render(); } }
  }
  showEdit(id){
    const meal = this.state.meals.find(m=>m.id===id); if(!meal) return;
    this.el.editId.value = meal.id;
    this.el.editName.value = meal.name;

    // If meal was originally logged as per-serving, the stored calories are already totals.
    // For editing we keep the UI consistent with saved flags: user can toggle per-serving and re-enter per-serving numbers.
    const isPerServing = !!meal.isPerServing;
    const servingsEaten = Number(meal.servingsEaten) || 1;

    this.el.editPerServing.checked = isPerServing;
    this.el.editServings.value = String(servingsEaten);
    this.el.editNotes.value = meal.notes || '';

    // Populate macro inputs with totals. If user keeps per-serving checked, they'll be treated as per-serving values.
    // So we convert totals back to per-serving when per-serving is enabled.
    const denom = isPerServing ? servingsEaten : 1;
    this.el.editCal.value = (Number(meal.calories) / denom) || 0;
    this.el.editProt.value = (Number(meal.protein) / denom) || 0;
    this.el.editCarb.value = (Number(meal.carbs) / denom) || 0;
    this.el.editFat.value = (Number(meal.fat) / denom) || 0;

    this.el.editModal.style.display='grid';
  }

  hideEdit(){ this.el.editModal.style.display='none'; }
  saveEdit(){
    const id = this.el.editId.value;
    const meal = this.state.meals.find(m=>m.id===id);
    if(!meal) return;

    meal.name = this.el.editName.value.trim() || meal.name;

    const isPerServing = !!this.el.editPerServing?.checked;
    const servingsEaten = this.parsePositive(this.el.editServings?.value);
    const notes = this.el.editNotes?.value?.trim() || '';

    const calInput = this.parsePositive(this.el.editCal.value);
    const protInput = this.parsePositive(this.el.editProt.value);
    const carbInput = this.parsePositive(this.el.editCarb.value);
    const fatInput = this.parsePositive(this.el.editFat.value);

    if([calInput, protInput, carbInput, fatInput].some(v=>v==null)) return alert('Enter valid numeric values');

    const safeServings = isPerServing ? (servingsEaten == null ? 1 : servingsEaten) : 1;
    const multiplier = isPerServing ? safeServings : 1;

    meal.isPerServing = isPerServing;
    meal.servingsEaten = safeServings;
    meal.notes = notes;

    meal.calories = calInput * multiplier;
    meal.protein = protInput * multiplier;
    meal.carbs = carbInput * multiplier;
    meal.fat = fatInput * multiplier;

    this.save(); this.hideEdit(); this.render();
  }

  parsePositive(v){ const n=Number(v); if(!Number.isFinite(n)||n<0) return null; return Math.round(n*100)/100; }
  totals(){
    return this.state.meals.reduce((acc,m)=>{
      acc.cal += Number(m.calories)||0; acc.pro += Number(m.protein)||0; acc.car += Number(m.carbs)||0; acc.fat += Number(m.fat)||0; return acc;
    },{cal:0,pro:0,car:0,fat:0});
  }
  render(){
    const g = this.state.goals;
    // populate goals inputs
    this.el.goalCal.value = g.calories; this.el.goalProt.value = g.protein; this.el.goalCarb.value = g.carbs; this.el.goalFat.value = g.fat;
    // totals
    const t = this.totals();
    const rem = { cal: Math.max(0,g.calories - t.cal), pro: Math.max(0,g.protein - t.pro), car: Math.max(0,g.carbs - t.car), fat: Math.max(0,g.fat - t.fat) };
    // dashboard
    this.el.calConsumed.textContent = `${t.cal} kcal`;
    this.el.protConsumed.textContent = `${t.pro} g`;
    this.el.carbConsumed.textContent = `${t.car} g`;
    this.el.fatConsumed.textContent = `${t.fat} g`;
    this.el.calRem.textContent = `${rem.cal}`;
    this.el.protRem.textContent = `${rem.pro}`;
    this.el.carbRem.textContent = `${rem.car}`;
    this.el.fatRem.textContent = `${rem.fat}`;
    // stats
    const mealsCount = this.state.meals.length;
    this.el.statMeals.textContent = mealsCount;
    this.el.statTotal.textContent = t.cal;
    this.el.statAvg.textContent = mealsCount ? Math.round(t.cal / mealsCount) : 0;

    // When user has not logged any meal yet, ensure macro progress shows zero completed.
    // (Charts already use t.* which is 0, but keeping explicit guarantees for any UI that might depend on it.)
    if (mealsCount === 0) {
      this.el.calConsumed.textContent = `0 kcal`;
      this.el.protConsumed.textContent = `0 g`;
      this.el.carbConsumed.textContent = `0 g`;
      this.el.fatConsumed.textContent = `0 g`;
      this.el.calRem.textContent = `${g.calories}`;
      this.el.protRem.textContent = `${g.protein}`;
      this.el.carbRem.textContent = `${g.carbs}`;
      this.el.fatRem.textContent = `${g.fat}`;
    }
    // meals table
    this.el.mealsBody.innerHTML = this.state.meals.map(m=>`<tr data-id="${m.id}"><td><strong>${escapeHtml(m.name)}</strong></td><td>${m.calories}</td><td>${m.protein}</td><td>${m.carbs}</td><td>${m.fat}</td><td class="small">${m.time}</td><td><button data-action="edit">Edit</button> <button data-action="delete">Delete</button></td></tr>`).join('') || '<tr><td colspan="7" class="small">No meals logged</td></tr>';
    // charts
    this.updateCharts(t,g);
    // save
    this.save();
  }
  async updateCharts(t,g){
    // color logic
    const colorFor = (val,goal)=>{
      if(val>goal) return '#ef4444';
      const pct = goal?val/goal:0; if(pct>0.9) return '#f59e0b'; return '#22c55e';
    };
    await this.chart.createDoughnut('cal-chart', t.cal, g.calories, colorFor(t.cal,g.calories));
    await this.chart.createDoughnut('prot-chart', t.pro, g.protein, colorFor(t.pro,g.protein));
    await this.chart.createDoughnut('carb-chart', t.car, g.carbs, colorFor(t.car,g.carbs));
    await this.chart.createDoughnut('fat-chart', t.fat, g.fat, colorFor(t.fat,g.fat));
  }
  export(){
    const data = JSON.stringify(this.state, null, 2);
    const blob = new Blob([data],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='meal-tracker.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  import(obj){
    try{
      if(obj.goals) this.state.goals = {...DEFAULT.goals,...obj.goals};
      if(Array.isArray(obj.meals)) this.state.meals = obj.meals.map(m=>new Meal(m));
      this.save(); this.render();
    }catch(e){console.error(e);alert('Import error');}
  }
  exportState(){ return JSON.stringify(this.state); }
  toggleTheme(){ this.state.theme = this.state.theme==='dark'?'light':'dark'; this.applyTheme(); this.save(); }
  applyTheme(){ if(this.state.theme==='light'){ document.body.classList.remove('theme-dark'); document.body.classList.add('theme-light'); this.el.darkToggle.textContent='☀️'; } else { document.body.classList.remove('theme-light'); document.body.classList.add('theme-dark'); this.el.darkToggle.textContent='🌙'; } }
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"]+/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c)); }

window.addEventListener('DOMContentLoaded', ()=>{
  try{
    window.mealTracker = new MealTracker();
  }catch(e){console.error('MealTracker bootstrap failed',e); alert('App failed to initialize. See console.');}
});
