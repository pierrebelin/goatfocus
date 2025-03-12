import { checkCurrentTab } from './services/siteService.js';
import { convertToScheduleFormat, loadData, migrateOldScheduleFormat } from './services/storageService.js';
import { getDailyUsage, incrementCurrentDomainUsage } from './services/usageService.js';
import { defaultData } from './utils/constants.js';

import SiteForm from './components/SiteForm.js';
import SitesList from './components/SitesList.js';
import TimeGroupForm from './components/TimeGroupForm.js';
import TimeGroupsList from './components/TimeGroupsList.js';
import UsageDisplay from './components/UsageDisplay.js';

export default class App {
  constructor() {
    // Éléments DOM
    this.newSiteInput = document.getElementById('new-site');
    this.addSiteButton = document.getElementById('add-site');
    this.addCurrentSiteButton = document.getElementById('add-current-site');
    this.sitesList = document.getElementById('sites-list');
    this.timeGroupsContainer = document.getElementById('time-groups-container');
    this.newStartTimeInput = document.getElementById('new-start-time');
    this.newEndTimeInput = document.getElementById('new-end-time');
    this.addTimeGroupButton = document.getElementById('add-time-group');
    this.updateTimeGroupButton = document.getElementById('update-time-group');
    this.cancelEditButton = document.getElementById('cancel-edit');
    this.editorTitleElement = document.getElementById('editor-title');
    this.editGroupIdInput = document.getElementById('edit-group-id');
    this.maxDailyAccessInput = document.getElementById('max-daily-access');
    this.usageDisplayElement = document.getElementById('usage-display');
    
    // Données de l'application
    this.sites = [];
    this.timeGroups = [];
    this.maxDailyAccess = null;
    
    // Initialiser les composants
    this.initComponents();
    
    // Charger les données
    this.loadData();
    
    // Mettre à jour l'affichage du temps d'utilisation fréquemment
    setInterval(() => this.updateUsageDisplay(), 1000);
  }
  
  initComponents() {
    // Initialiser les composants
    this.sitesListComponent = new SitesList(this.sitesList);
    
    this.siteFormComponent = new SiteForm(
      this.newSiteInput,
      this.addSiteButton,
      this.addCurrentSiteButton
    );
    
    this.timeGroupsListComponent = new TimeGroupsList(
      this.timeGroupsContainer,
      (groupId) => this.startEditingTimeGroup(groupId)
    );
    
    this.timeGroupFormComponent = new TimeGroupForm({
      newStartTimeInput: this.newStartTimeInput,
      newEndTimeInput: this.newEndTimeInput,
      addTimeGroupButton: this.addTimeGroupButton,
      updateTimeGroupButton: this.updateTimeGroupButton,
      cancelEditButton: this.cancelEditButton,
      editorTitleElement: this.editorTitleElement,
      editGroupIdInput: this.editGroupIdInput
    });
    
    this.usageDisplayComponent = new UsageDisplay(
      this.usageDisplayElement,
      this.maxDailyAccessInput
    );
    
    // Ajouter des écouteurs d'événements pour les mises à jour de stockage
    chrome.storage.onChanged.addListener((changes) => {
      this.handleStorageChanges(changes);
    });
  }
  
  async loadData() {
    const result = await loadData();
    
    if (result.sites) {
      this.sites = result.sites;
    } else {
      this.sites = defaultData.sites;
    }
    
    if (result.schedule && !result.timeGroups) {
      this.timeGroups = migrateOldScheduleFormat(result.schedule);
    } else if (result.timeGroups) {
      this.timeGroups = result.timeGroups;
    } else {
      this.timeGroups = defaultData.timeGroups;
    }
    
    this.maxDailyAccess = result.maxDailyAccess !== undefined ? result.maxDailyAccess : defaultData.maxDailyAccess;
    
    // Mettre à jour l'interface utilisateur
    this.updateUI();
    
    // Vérifier l'onglet actuel
    const schedule = convertToScheduleFormat(this.timeGroups);
    await checkCurrentTab(schedule, this.sites);
    
    // Incrémenter le temps d'utilisation pour le domaine actuel
    await incrementCurrentDomainUsage();
  }
  
  async updateUsageDisplay() {
    const dailyUsage = await getDailyUsage();
    this.usageDisplayComponent.render(dailyUsage, this.maxDailyAccess);
  }
  
  handleStorageChanges(changes) {
    let needsUpdate = false;
    
    if (changes.sites) {
      this.sites = changes.sites.newValue;
      needsUpdate = true;
    }
    
    if (changes.timeGroups) {
      this.timeGroups = changes.timeGroups.newValue;
      needsUpdate = true;
    }
    
    if (changes.maxDailyAccess) {
      this.maxDailyAccess = changes.maxDailyAccess.newValue;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      this.updateUI();
    }
    
    if (changes.dailyUsage) {
      this.updateUsageDisplay();
    }
  }
  
  updateUI() {
    this.sitesListComponent.render(this.sites);
    this.timeGroupsListComponent.render(this.timeGroups);
    this.updateUsageDisplay();
  }
  
  startEditingTimeGroup(groupId) {
    const groupToEdit = this.timeGroups.find(group => group.id === groupId);
    if (groupToEdit) {
      this.timeGroupFormComponent.startEditing(groupToEdit);
    }
  }
  
  showSaveIndicator() {
    const saveIndicator = document.createElement('div');
    saveIndicator.classList.add('save-indicator');
    saveIndicator.innerHTML = '<div class="save-dot"></div>';
    
    document.body.appendChild(saveIndicator);
    
    setTimeout(() => {
      saveIndicator.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(saveIndicator);
      }, 300);
    }, 700);
  }
} 