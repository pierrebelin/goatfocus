import { addTimeGroup, updateTimeGroup } from '../services/timeGroupService.js';
import { daysOfWeek } from '../utils/constants.js';

export default class TimeGroupForm {
  constructor(formElements) {
    this.newStartTimeInput = formElements.newStartTimeInput;
    this.newEndTimeInput = formElements.newEndTimeInput;
    this.addTimeGroupButton = formElements.addTimeGroupButton;
    this.updateTimeGroupButton = formElements.updateTimeGroupButton;
    this.cancelEditButton = formElements.cancelEditButton;
    this.editorTitleElement = formElements.editorTitleElement;
    this.editGroupIdInput = formElements.editGroupIdInput;
    
    this.setupEventListeners();
    this.resetForm();
  }
  
  setupEventListeners() {
    this.addTimeGroupButton.addEventListener('click', () => this.handleAddTimeGroup());
    this.updateTimeGroupButton.addEventListener('click', () => this.handleUpdateTimeGroup());
    this.cancelEditButton.addEventListener('click', () => this.resetForm());
  }
  
  async handleAddTimeGroup() {
    try {
      const startTime = this.newStartTimeInput.value;
      const endTime = this.newEndTimeInput.value;
      const selectedDays = this.getSelectedDays();
      
      await addTimeGroup(startTime, endTime, selectedDays);
      this.resetForm();
      // L'événement de mise à jour sera géré par le contrôleur principal
    } catch (error) {
      alert(error.message);
    }
  }
  
  async handleUpdateTimeGroup() {
    try {
      const groupId = this.editGroupIdInput.value;
      const startTime = this.newStartTimeInput.value;
      const endTime = this.newEndTimeInput.value;
      const selectedDays = this.getSelectedDays();
      
      await updateTimeGroup(groupId, startTime, endTime, selectedDays);
      this.resetForm();
      // L'événement de mise à jour sera géré par le contrôleur principal
    } catch (error) {
      alert(error.message);
    }
  }
  
  getSelectedDays() {
    const selectedDays = [];
    daysOfWeek.forEach(day => {
      const checkbox = document.getElementById(`day-${day}`);
      if (checkbox && checkbox.checked) {
        selectedDays.push(day);
      }
    });
    return selectedDays;
  }
  
  startEditing(group) {
    // Mettre à jour le titre
    this.editorTitleElement.textContent = 'Modifier la plage horaire';
    
    // Définir les valeurs dans le formulaire
    this.newStartTimeInput.value = group.startTime;
    this.newEndTimeInput.value = group.endTime;
    
    // Cocher les jours correspondants
    daysOfWeek.forEach(day => {
      const checkbox = document.getElementById(`day-${day}`);
      if (checkbox) {
        checkbox.checked = group.days.includes(day);
      }
    });
    
    // Stocker l'ID du groupe en cours d'édition
    this.editGroupIdInput.value = group.id;
    
    // Afficher les boutons de mise à jour et d'annulation
    this.addTimeGroupButton.style.display = 'none';
    this.updateTimeGroupButton.style.display = 'block';
    this.cancelEditButton.style.display = 'block';
    
    // Faire défiler jusqu'au formulaire d'édition
    document.getElementById('time-group-editor').scrollIntoView({ behavior: 'smooth' });
  }
  
  resetForm() {
    // Réinitialiser le titre
    this.editorTitleElement.textContent = 'Ajouter une nouvelle plage horaire';
    
    // Réinitialiser les champs
    this.newStartTimeInput.value = '09:00';
    this.newEndTimeInput.value = '17:00';
    
    // Décocher tous les jours
    daysOfWeek.forEach(day => {
      const checkbox = document.getElementById(`day-${day}`);
      if (checkbox) {
        checkbox.checked = false;
      }
    });
    
    // Effacer l'ID du groupe en cours d'édition
    this.editGroupIdInput.value = '';
    
    // Afficher le bouton d'ajout et masquer les boutons de mise à jour et d'annulation
    this.addTimeGroupButton.style.display = 'block';
    this.updateTimeGroupButton.style.display = 'none';
    this.cancelEditButton.style.display = 'none';
  }
} 