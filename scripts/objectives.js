import { selectedGoals, goalsFormData, goals, grid, formsContainer, initFormToggles } from './script.js';

//! ==============================================
//! MANIPULAÇÃO DE OBJETIVOS
//! ==============================================

function saveField(goalId, name, value) {
  if (!goalsFormData[goalId]) goalsFormData[goalId] = {};
  goalsFormData[goalId][name] = value;
  localStorage.setItem("goalsFormData", JSON.stringify(goalsFormData));
}

function populateFormFields(form) {
  const data = goalsFormData[form.dataset.goal] || {};
  form.querySelectorAll("input, select").forEach(f => {
    const key = f.name || f.dataset.name;
    if (key && data[key] != null) f.value = data[key];
  });
}

function attachFieldListeners(form) {
  form.querySelectorAll("input, select").forEach(f => {
    const key = f.name || f.dataset.name;
    if (!key) return;
    f.addEventListener("input", () =>
      saveField(form.dataset.goal, key, f.value)
    );
  });
}

function renderGoalsGrid() {
  grid.innerHTML = "";
  goals.forEach(({ id, label, icon }) => {
    const card = document.createElement("div");
    card.className = `base-card${selectedGoals.includes(id) ? " selected" : ""}`;
    card.innerHTML = `<span class="google-icons base-card-icons">${icon}</span><span class="base-card-label">${label}</span>`;
    card.addEventListener("click", () => {
      const idx = selectedGoals.indexOf(id);
      if (idx >= 0) {
        selectedGoals.splice(idx, 1);
        delete goalsFormData[id];
      } else selectedGoals.push(id);
      localStorage.setItem("selectedGoals", JSON.stringify(selectedGoals));
      localStorage.setItem("goalsFormData", JSON.stringify(goalsFormData));
      renderGoalsGrid();
    });
    grid.appendChild(card);
  });
  renderForms();
}

function renderForms() {
  formsContainer.querySelectorAll(".goal-form").forEach(form => {
    const show = selectedGoals.includes(form.dataset.goal);
    form.classList.toggle("hidden", !show);
    if (show) {
      populateFormFields(form);
      if (!form.dataset.listenersAttached) {
        attachFieldListeners(form);
        form.dataset.listenersAttached = "true";
      }
    }
  });
  initFormToggles();
}

// Make these functions available globally for showStep() to call
window.showObjetivosSelect = function() {
  renderGoalsGrid();
};

window.showObjetivosForm = function() {
  renderForms();
};

// Initialize goals on module load
document.addEventListener('DOMContentLoaded', () => {
  renderGoalsGrid();
});
