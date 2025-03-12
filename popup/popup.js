// Fonctions utilitaires
function getCurrentDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function calculateTotalUsageTime() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['dailyUsage', 'maxDailyAccess'], (data) => {
      const maxDailyAccess = data.maxDailyAccess;
      const dateKey = getCurrentDateKey();
      const todayUsage = data.dailyUsage && data.dailyUsage[dateKey] ? data.dailyUsage[dateKey] : {};
      
      let totalSeconds = 0;
      for (const siteDomain in todayUsage) {
        totalSeconds += todayUsage[siteDomain];
      }
      
      const minutes = Math.floor(totalSeconds / 60);
      
      resolve({
        totalSeconds,
        minutes,
        maxDailyAccess,
        isLimitExceeded: maxDailyAccess !== null && minutes >= maxDailyAccess
      });
    });
  });
}

// Fonction pour charger les données
function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sites', 'timeGroups', 'schedule', 'maxDailyAccess', 'dailyUsage'], (result) => {
      resolve(result);
    });
  });
}

// Fonction pour sauvegarder les données
function saveData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

// Fonction utilitaire pour convertir les groupes de temps en format de planning
function convertToScheduleFormat(timeGroups) {
  const schedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  
  if (!timeGroups) return schedule;
  
  timeGroups.forEach(group => {
    group.days.forEach(day => {
      schedule[day].push({
        start: group.startTime,
        end: group.endTime
      });
    });
  });
  
  // Trier les plages horaires par heure de début
  for (const day in schedule) {
    if (schedule.hasOwnProperty(day)) {
      schedule[day].sort((a, b) => a.start.localeCompare(b.start));
    }
  }
  
  return schedule;
}

// Fonction pour migrer l'ancien format de planning
function migrateOldScheduleFormat(schedule) {
  const timeGroups = [];
  let groupId = 1;
  
  for (const day in schedule) {
    if (schedule.hasOwnProperty(day) && schedule[day].length > 0) {
      schedule[day].forEach(timeRange => {
        timeGroups.push({
          id: `group-${groupId++}`,
          days: [day],
          startTime: timeRange.start,
          endTime: timeRange.end
        });
      });
    }
  }
  
  return timeGroups;
}

// Fonction pour obtenir l'utilisation quotidienne
function getDailyUsage() {
  return new Promise(async (resolve) => {
    const result = await loadData();
    resolve(result.dailyUsage || {});
  });
}

// Fonction pour incrémenter l'utilisation du domaine actuel
function incrementCurrentDomainUsage() {
  return new Promise(async (resolve) => {
    const result = await loadData();
    const sites = result.sites || [];
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          const hostname = url.hostname;
          
          if (sites.includes(hostname) || sites.some(site => {
            if (site.startsWith('*.')) {
              const domain = site.substring(2);
              return hostname.endsWith(domain);
            } else {
              return hostname.endsWith('.' + site);
            }
          })) {
            const dateKey = getCurrentDateKey();
            
            chrome.storage.local.get(['dailyUsage'], (data) => {
              const dailyUsage = data.dailyUsage || {};
              
              if (!dailyUsage[dateKey]) {
                dailyUsage[dateKey] = {};
              }
              
              if (!dailyUsage[dateKey][hostname]) {
                dailyUsage[dateKey][hostname] = 0;
              }
              
              dailyUsage[dateKey][hostname] += 1;
              
              chrome.storage.local.set({ dailyUsage }, () => {
                resolve(dailyUsage);
              });
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('Erreur lors de la vérification de l\'URL:', e);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

// Fonction pour vérifier l'onglet actuel
function checkCurrentTab(schedule, sites) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].url) {
        const currentTab = tabs[0];
        
        // Vérifier si l'heure actuelle est dans une période de blocage
        const now = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[now.getDay()];
        
        // Obtenir le planning pour aujourd'hui
        const todaySchedule = schedule[today] || [];
        
        if (todaySchedule.length > 0) {
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTimeMinutes = currentHour * 60 + currentMinute;
          
          // Vérifier si l'heure actuelle est dans une des plages horaires
          const isBlockedNow = todaySchedule.some(timeRange => {
            const [startHour, startMinute] = timeRange.start.split(':').map(Number);
            const [endHour, endMinute] = timeRange.end.split(':').map(Number);
            
            const startTimeMinutes = startHour * 60 + startMinute;
            const endTimeMinutes = endHour * 60 + endMinute;
            
            return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
          });
          
          // Si nous sommes dans une période de blocage, vérifier l'URL
          if (isBlockedNow) {
            try {
              const url = new URL(currentTab.url);
              const hostname = url.hostname;
              
              // Vérifier si le site est dans la liste des sites bloqués
              const isBlocked = sites.some(site => {
                if (site.startsWith('*.')) {
                  const domain = site.substring(2);
                  return hostname.endsWith(domain);
                } else {
                  return hostname === site || hostname.endsWith('.' + site);
                }
              });
              
              // Si le site est bloqué, vérifier également la limite de temps quotidienne
              if (isBlocked && !currentTab.url.includes(chrome.runtime.id)) {
                // Utiliser la fonction centralisée pour calculer le temps d'utilisation
                const usageInfo = await calculateTotalUsageTime();
                
                // Si aucune limite de temps n'est définie ou si la limite est atteinte, bloquer le site
                if (usageInfo.maxDailyAccess === null || usageInfo.isLimitExceeded) {
                  // Fermer la popup
                  window.close();
                  
                  // Rediriger vers la page de blocage
                  chrome.tabs.update(currentTab.id, { url: chrome.runtime.getURL(`blocked.html?domain=${hostname}`) });
                }
                // Sinon, ne pas bloquer car le temps n'est pas encore écoulé
              }
            } catch (e) {
              console.error('Erreur lors de la vérification de l\'URL:', e);
            }
          }
        }
      }
      resolve();
    });
  });
}

// Fonction pour obtenir le domaine de l'onglet actuel
function getCurrentTabDomain() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          // Extraire le domaine sans le www.
          let domain = url.hostname;
          // Supprimer www. si présent
          if (domain.startsWith('www.')) {
            domain = domain.substring(4);
          }
          resolve(domain);
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

// Fonction pour ajouter un site
function addSite(siteValue) {
  return new Promise(async (resolve) => {
    const result = await loadData();
    const sites = result.sites || [];
    const timeGroups = result.timeGroups || [];
    const maxDailyAccess = result.maxDailyAccess;
    
    if (siteValue && !sites.includes(siteValue)) {
      const newSites = [...sites, siteValue];
      const schedule = convertToScheduleFormat(timeGroups);
      
      await saveData({ 
        sites: newSites, 
        timeGroups, 
        schedule, 
        maxDailyAccess 
      });
      
      resolve(newSites);
    } else {
      resolve(sites);
    }
  });
}

// Fonction pour supprimer un site
function removeSite(index) {
  return new Promise(async (resolve) => {
    const result = await loadData();
    const sites = result.sites || [];
    const timeGroups = result.timeGroups || [];
    const maxDailyAccess = result.maxDailyAccess;
    
    const newSites = [...sites];
    newSites.splice(index, 1);
    
    const schedule = convertToScheduleFormat(timeGroups);
    
    await saveData({ 
      sites: newSites, 
      timeGroups, 
      schedule, 
      maxDailyAccess 
    });
    
    resolve(newSites);
  });
}

// Classe principale de l'application
class App {
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
    // Ajouter des écouteurs d'événements pour les sites
    this.addSiteButton.addEventListener('click', () => this.handleAddSite());
    this.newSiteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddSite();
      }
    });
    
    this.addCurrentSiteButton.addEventListener('click', () => this.handleAddCurrentSite());
    
    // Ajouter des écouteurs d'événements pour les groupes de temps
    this.addTimeGroupButton.addEventListener('click', () => this.handleAddTimeGroup());
    this.updateTimeGroupButton.addEventListener('click', () => this.handleUpdateTimeGroup());
    this.cancelEditButton.addEventListener('click', () => this.handleCancelEdit());
    
    // Ajouter un écouteur d'événement pour le temps d'accès quotidien
    this.maxDailyAccessInput.addEventListener('change', () => this.handleMaxDailyAccessChange());
    
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
      this.sites = [];
    }
    
    if (result.schedule && !result.timeGroups) {
      this.timeGroups = migrateOldScheduleFormat(result.schedule);
    } else if (result.timeGroups) {
      this.timeGroups = result.timeGroups;
    } else {
      this.timeGroups = [];
    }
    
    this.maxDailyAccess = result.maxDailyAccess !== undefined ? result.maxDailyAccess : null;
    
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
    this.renderUsageDisplay(dailyUsage, this.maxDailyAccess);
  }
  
  renderUsageDisplay(dailyUsage, maxDailyAccess) {
    const formattedUsage = this.formatUsageDisplay(dailyUsage, maxDailyAccess);
    
    if (typeof formattedUsage === 'string') {
      this.usageDisplayElement.textContent = formattedUsage;
      this.usageDisplayElement.style.background = '';
    } else {
      this.usageDisplayElement.textContent = formattedUsage.text;
      
      if (formattedUsage.percentUsed !== null) {
        const percentColor = formattedUsage.percentUsed >= 90 ? '#FFEBEE' : 
                            formattedUsage.percentUsed >= 75 ? '#FFF8E1' : '#E8F5E9';
        this.usageDisplayElement.style.background = percentColor;
      } else {
        this.usageDisplayElement.style.background = '';
      }
    }
    
    // Mettre à jour la valeur de l'input
    if (maxDailyAccess !== null) {
      this.maxDailyAccessInput.value = maxDailyAccess;
    } else {
      this.maxDailyAccessInput.value = '';
    }
  }
  
  formatUsageDisplay(dailyUsage, maxDailyAccess) {
    if (!dailyUsage) return "Pas d'utilisation aujourd'hui";
    
    const dateKey = getCurrentDateKey();
    
    if (!dailyUsage[dateKey]) {
      return "Pas d'utilisation aujourd'hui";
    }
    
    const todayUsage = dailyUsage[dateKey];
    let totalSeconds = 0;
    
    for (const domain in todayUsage) {
      totalSeconds += todayUsage[domain];
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (maxDailyAccess !== null) {
      const percentUsed = Math.min(100, Math.round((minutes / maxDailyAccess) * 100));
      return {
        text: `Temps utilisé: ${minutes}m ${seconds}s/${maxDailyAccess}m`,
        percentUsed: percentUsed
      };
    } else {
      return {
        text: `Temps utilisé: ${minutes}m ${seconds}s`,
        percentUsed: null
      };
    }
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
    this.renderSitesList();
    this.renderTimeGroupsList();
    this.updateUsageDisplay();
  }
  
  renderSitesList() {
    this.sitesList.innerHTML = '';
    
    this.sites.forEach((site, index) => {
      const li = document.createElement('li');
      li.className = 'site-item';
      
      const siteText = document.createElement('span');
      siteText.className = 'site-text';
      siteText.textContent = site;
      
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-site';
      removeButton.innerHTML = '&times;';
      removeButton.addEventListener('click', () => this.handleRemoveSite(index));
      
      li.appendChild(siteText);
      li.appendChild(removeButton);
      
      this.sitesList.appendChild(li);
    });
  }
  
  renderTimeGroupsList() {
    this.timeGroupsContainer.innerHTML = '';
    
    this.timeGroups.forEach(group => {
      const groupElement = document.createElement('div');
      groupElement.className = 'time-group';
      groupElement.dataset.id = group.id;
      
      const daysText = this.formatDays(group.days);
      const timeText = `${group.startTime} - ${group.endTime}`;
      
      groupElement.innerHTML = `
        <div class="time-group-info">
          <div class="time-group-days">${daysText}</div>
          <div class="time-group-time">${timeText}</div>
        </div>
        <div class="time-group-actions">
          <button class="edit-time-group"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Modifier</button>
          <button class="delete-time-group"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Supprimer</button>
        </div>
      `;
      
      const editButton = groupElement.querySelector('.edit-time-group');
      const deleteButton = groupElement.querySelector('.delete-time-group');
      
      editButton.addEventListener('click', () => this.startEditingTimeGroup(group.id));
      deleteButton.addEventListener('click', () => this.handleDeleteTimeGroup(group.id));
      
      this.timeGroupsContainer.appendChild(groupElement);
    });
  }
  
  formatDays(days) {
    const dayNames = {
      monday: 'Lun',
      tuesday: 'Mar',
      wednesday: 'Mer',
      thursday: 'Jeu',
      friday: 'Ven',
      saturday: 'Sam',
      sunday: 'Dim'
    };
    
    return days.map(day => dayNames[day]).join(', ');
  }
  
  async handleAddSite() {
    const siteValue = this.newSiteInput.value.trim();
    if (siteValue) {
      await addSite(siteValue);
      this.newSiteInput.value = '';
      this.newSiteInput.focus();
    }
  }
  
  async handleAddCurrentSite() {
    const domain = await getCurrentTabDomain();
    if (domain) {
      await addSite(domain);
    }
  }
  
  async handleRemoveSite(index) {
    await removeSite(index);
  }
  
  handleAddTimeGroup() {
    const selectedDays = this.getSelectedDays();
    const startTime = this.newStartTimeInput.value;
    const endTime = this.newEndTimeInput.value;
    
    if (selectedDays.length === 0 || !startTime || !endTime) {
      alert('Veuillez sélectionner au moins un jour et définir les heures de début et de fin.');
      return;
    }
    
    this.addTimeGroup(selectedDays, startTime, endTime);
  }
  
  async addTimeGroup(days, startTime, endTime) {
    const result = await loadData();
    let timeGroups = result.timeGroups || [];
    const sites = result.sites || [];
    const maxDailyAccess = result.maxDailyAccess;
    
    const newGroup = {
      id: `group-${Date.now()}`,
      days,
      startTime,
      endTime
    };
    
    timeGroups = [...timeGroups, newGroup];
    const schedule = convertToScheduleFormat(timeGroups);
    
    await saveData({
      sites,
      timeGroups,
      schedule,
      maxDailyAccess
    });
    
    this.resetTimeGroupForm();
  }
  
  async handleUpdateTimeGroup() {
    const groupId = this.editGroupIdInput.value;
    const selectedDays = this.getSelectedDays();
    const startTime = this.newStartTimeInput.value;
    const endTime = this.newEndTimeInput.value;
    
    if (selectedDays.length === 0 || !startTime || !endTime) {
      alert('Veuillez sélectionner au moins un jour et définir les heures de début et de fin.');
      return;
    }
    
    const result = await loadData();
    let timeGroups = result.timeGroups || [];
    const sites = result.sites || [];
    const maxDailyAccess = result.maxDailyAccess;
    
    const updatedGroups = timeGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          days: selectedDays,
          startTime,
          endTime
        };
      }
      return group;
    });
    
    const schedule = convertToScheduleFormat(updatedGroups);
    
    await saveData({
      sites,
      timeGroups: updatedGroups,
      schedule,
      maxDailyAccess
    });
    
    this.resetTimeGroupForm();
  }
  
  async handleDeleteTimeGroup(groupId) {
    const result = await loadData();
    let timeGroups = result.timeGroups || [];
    const sites = result.sites || [];
    const maxDailyAccess = result.maxDailyAccess;
    
    const updatedGroups = timeGroups.filter(group => group.id !== groupId);
    const schedule = convertToScheduleFormat(updatedGroups);
    
    await saveData({
      sites,
      timeGroups: updatedGroups,
      schedule,
      maxDailyAccess
    });
  }
  
  handleCancelEdit() {
    this.resetTimeGroupForm();
  }
  
  async handleMaxDailyAccessChange() {
    const maxDailyValue = this.maxDailyAccessInput.value.trim();
    
    const result = await loadData();
    const sites = result.sites || [];
    const timeGroups = result.timeGroups || [];
    
    const maxDailyAccess = maxDailyValue === '' ? null : (isNaN(parseInt(maxDailyValue)) ? null : parseInt(maxDailyValue));
    const schedule = convertToScheduleFormat(timeGroups);
    
    await saveData({ 
      sites, 
      timeGroups, 
      schedule, 
      maxDailyAccess 
    });
  }
  
  startEditingTimeGroup(groupId) {
    const groupToEdit = this.timeGroups.find(group => group.id === groupId);
    if (groupToEdit) {
      // Mettre à jour le titre
      this.editorTitleElement.textContent = 'Modifier une plage horaire';
      
      // Sélectionner les jours
      this.clearSelectedDays();
      groupToEdit.days.forEach(day => {
        const checkbox = document.getElementById(`day-${day}`);
        if (checkbox) checkbox.checked = true;
      });
      
      // Définir les heures
      this.newStartTimeInput.value = groupToEdit.startTime;
      this.newEndTimeInput.value = groupToEdit.endTime;
      
      // Stocker l'ID du groupe en cours d'édition
      this.editGroupIdInput.value = groupId;
      
      // Afficher les boutons appropriés
      this.addTimeGroupButton.style.display = 'none';
      this.updateTimeGroupButton.style.display = 'inline-block';
      this.cancelEditButton.style.display = 'inline-block';
    }
  }
  
  resetTimeGroupForm() {
    // Réinitialiser le titre
    this.editorTitleElement.textContent = 'Ajouter une nouvelle plage horaire';
    
    // Décocher tous les jours
    this.clearSelectedDays();
    
    // Réinitialiser les heures
    this.newStartTimeInput.value = '';
    this.newEndTimeInput.value = '';
    
    // Effacer l'ID du groupe en cours d'édition
    this.editGroupIdInput.value = '';
    
    // Afficher les boutons appropriés
    this.addTimeGroupButton.style.display = 'inline-block';
    this.updateTimeGroupButton.style.display = 'none';
    this.cancelEditButton.style.display = 'none';
  }
  
  getSelectedDays() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.filter(day => {
      const checkbox = document.getElementById(`day-${day}`);
      return checkbox && checkbox.checked;
    });
  }
  
  clearSelectedDays() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const checkbox = document.getElementById(`day-${day}`);
      if (checkbox) checkbox.checked = false;
    });
  }
}

// Initialiser l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  new App();
}); 