// Structure initiale des données
const defaultData = {
  sites: [],
  timeGroups: []
};

// Noms des jours pour l'affichage
const dayNames = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche'
};

// Noms courts des jours pour l'affichage
const shortDayNames = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mer',
  thursday: 'Jeu',
  friday: 'Ven',
  saturday: 'Sam',
  sunday: 'Dim'
};

// Éléments DOM
const newSiteInput = document.getElementById('new-site');
const addSiteButton = document.getElementById('add-site');
const addCurrentSiteButton = document.getElementById('add-current-site');
const sitesList = document.getElementById('sites-list');
const timeGroupsContainer = document.getElementById('time-groups-container');
const newStartTimeInput = document.getElementById('new-start-time');
const newEndTimeInput = document.getElementById('new-end-time');
const addTimeGroupButton = document.getElementById('add-time-group');
const updateTimeGroupButton = document.getElementById('update-time-group');
const cancelEditButton = document.getElementById('cancel-edit');
const editorTitleElement = document.getElementById('editor-title');
const editGroupIdInput = document.getElementById('edit-group-id');
const saveButton = document.getElementById('save-button');

// Jours de la semaine
const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Variables pour stocker les données
let sites = [];
let timeGroups = [];

// Charger les données sauvegardées
function loadData() {
  chrome.storage.local.get(['sites', 'timeGroups', 'schedule'], (result) => {
    if (result.sites) {
      sites = result.sites;
    } else {
      sites = defaultData.sites;
    }
    
    // Migration des anciennes données si nécessaire
    if (result.schedule && !result.timeGroups) {
      timeGroups = migrateOldScheduleFormat(result.schedule);
    } else if (result.timeGroups) {
      timeGroups = result.timeGroups;
    } else {
      timeGroups = defaultData.timeGroups;
    }
    
    // Mettre à jour l'interface
    renderSitesList();
    renderTimeGroups();
  });
}

// Migrer l'ancien format de planning vers le nouveau format
function migrateOldScheduleFormat(oldSchedule) {
  const newTimeGroups = [];
  
  // Collecter toutes les plages horaires uniques
  const uniqueTimeRanges = new Map();
  
  for (const day in oldSchedule) {
    if (oldSchedule.hasOwnProperty(day)) {
      oldSchedule[day].forEach(timeRange => {
        const key = `${timeRange.start}-${timeRange.end}`;
        
        if (!uniqueTimeRanges.has(key)) {
          uniqueTimeRanges.set(key, {
            startTime: timeRange.start,
            endTime: timeRange.end,
            days: [day]
          });
        } else {
          uniqueTimeRanges.get(key).days.push(day);
        }
      });
    }
  }
  
  // Convertir en tableau
  uniqueTimeRanges.forEach(group => {
    newTimeGroups.push({
      id: generateTimeGroupId(),
      startTime: group.startTime,
      endTime: group.endTime,
      days: group.days
    });
  });
  
  return newTimeGroups;
}

// Générer un ID unique pour un groupe de temps
function generateTimeGroupId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Afficher la liste des sites bloqués
function renderSitesList() {
  sitesList.innerHTML = '';
  
  sites.forEach((site, index) => {
    const li = document.createElement('li');
    li.className = 'site-item';
    
    const siteText = document.createElement('span');
    siteText.textContent = site;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-site';
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => {
      sites.splice(index, 1);
      renderSitesList();
    });
    
    li.appendChild(siteText);
    li.appendChild(removeButton);
    
    sitesList.appendChild(li);
  });
}

// Afficher les groupes de temps
function renderTimeGroups() {
  timeGroupsContainer.innerHTML = '';
  
  timeGroups.forEach((group, index) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'time-group';
    groupDiv.dataset.id = group.id;
    
    // En-tête du groupe avec l'heure et les boutons d'action
    const headerDiv = document.createElement('div');
    headerDiv.className = 'time-group-header';
    
    const timeLabel = document.createElement('span');
    timeLabel.className = 'time-label';
    timeLabel.textContent = `${group.startTime} - ${group.endTime}`;
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-time-group';
    editButton.textContent = '✎';
    editButton.title = 'Modifier cette plage horaire';
    editButton.addEventListener('click', () => {
      startEditingTimeGroup(group.id);
    });
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-time-group';
    removeButton.textContent = '×';
    removeButton.title = 'Supprimer cette plage horaire';
    removeButton.addEventListener('click', () => {
      timeGroups.splice(index, 1);
      renderTimeGroups();
    });
    
    headerDiv.appendChild(timeLabel);
    headerDiv.appendChild(editButton);
    headerDiv.appendChild(removeButton);
    
    // Badges pour les jours
    const daysDiv = document.createElement('div');
    daysDiv.className = 'days-badges';
    
    group.days.forEach(day => {
      const badge = document.createElement('span');
      badge.className = 'day-badge';
      badge.textContent = shortDayNames[day];
      daysDiv.appendChild(badge);
    });
    
    groupDiv.appendChild(headerDiv);
    groupDiv.appendChild(daysDiv);
    
    timeGroupsContainer.appendChild(groupDiv);
  });
}

// Passer en mode édition pour une plage horaire existante
function startEditingTimeGroup(groupId) {
  // Trouver le groupe par son ID
  const groupToEdit = timeGroups.find(group => group.id === groupId);
  
  if (groupToEdit) {
    // Mettre à jour le titre
    editorTitleElement.textContent = 'Modifier la plage horaire';
    
    // Définir les valeurs dans le formulaire
    newStartTimeInput.value = groupToEdit.startTime;
    newEndTimeInput.value = groupToEdit.endTime;
    
    // Cocher les jours correspondants
    daysOfWeek.forEach(day => {
      const checkbox = document.getElementById(`day-${day}`);
      if (checkbox) {
        checkbox.checked = groupToEdit.days.includes(day);
      }
    });
    
    // Stocker l'ID du groupe en cours d'édition
    editGroupIdInput.value = groupId;
    
    // Afficher les boutons de mise à jour et d'annulation
    addTimeGroupButton.style.display = 'none';
    updateTimeGroupButton.style.display = 'block';
    cancelEditButton.style.display = 'block';
    
    // Faire défiler jusqu'au formulaire d'édition
    document.getElementById('time-group-editor').scrollIntoView({ behavior: 'smooth' });
  }
}

// Mettre à jour une plage horaire existante
function updateTimeGroup() {
  const groupId = editGroupIdInput.value;
  const startTime = newStartTimeInput.value;
  const endTime = newEndTimeInput.value;
  
  // Récupérer les jours sélectionnés
  const selectedDays = [];
  daysOfWeek.forEach(day => {
    const checkbox = document.getElementById(`day-${day}`);
    if (checkbox && checkbox.checked) {
      selectedDays.push(day);
    }
  });
  
  if (startTime && endTime && selectedDays.length > 0) {
    // Vérifier que l'heure de début est avant l'heure de fin
    if (startTime >= endTime) {
      alert("L'heure de début doit être avant l'heure de fin.");
      return;
    }
    
    // Trouver l'index du groupe à mettre à jour
    const groupIndex = timeGroups.findIndex(group => group.id === groupId);
    
    if (groupIndex !== -1) {
      // Mettre à jour le groupe
      timeGroups[groupIndex] = {
        id: groupId,
        startTime: startTime,
        endTime: endTime,
        days: selectedDays
      };
      
      // Réinitialiser le formulaire
      resetTimeGroupEditor();
      
      // Mettre à jour l'affichage
      renderTimeGroups();
    }
  } else {
    alert("Veuillez sélectionner au moins un jour et définir les heures de début et de fin.");
  }
}

// Réinitialiser le formulaire d'édition
function resetTimeGroupEditor() {
  // Réinitialiser le titre
  editorTitleElement.textContent = 'Ajouter une nouvelle plage horaire';
  
  // Réinitialiser les champs
  newStartTimeInput.value = '09:00';
  newEndTimeInput.value = '17:00';
  
  // Décocher tous les jours
  daysOfWeek.forEach(day => {
    const checkbox = document.getElementById(`day-${day}`);
    if (checkbox) {
      checkbox.checked = false;
    }
  });
  
  // Effacer l'ID du groupe en cours d'édition
  editGroupIdInput.value = '';
  
  // Afficher le bouton d'ajout et masquer les boutons de mise à jour et d'annulation
  addTimeGroupButton.style.display = 'block';
  updateTimeGroupButton.style.display = 'none';
  cancelEditButton.style.display = 'none';
}

// Ajouter un nouveau site à la liste
function addSite() {
  const siteValue = newSiteInput.value.trim();
  
  if (siteValue && !sites.includes(siteValue)) {
    sites.push(siteValue);
    newSiteInput.value = '';
    renderSitesList();
  }
}

// Ajouter un nouveau groupe de temps
function addTimeGroup() {
  const startTime = newStartTimeInput.value;
  const endTime = newEndTimeInput.value;
  
  // Récupérer les jours sélectionnés
  const selectedDays = [];
  daysOfWeek.forEach(day => {
    const checkbox = document.getElementById(`day-${day}`);
    if (checkbox && checkbox.checked) {
      selectedDays.push(day);
    }
  });
  
  if (startTime && endTime && selectedDays.length > 0) {
    // Vérifier que l'heure de début est avant l'heure de fin
    if (startTime >= endTime) {
      alert("L'heure de début doit être avant l'heure de fin.");
      return;
    }
    
    // Créer un nouveau groupe de temps
    const newGroup = {
      id: generateTimeGroupId(),
      startTime: startTime,
      endTime: endTime,
      days: selectedDays
    };
    
    timeGroups.push(newGroup);
    
    // Réinitialiser les champs
    newStartTimeInput.value = '';
    newEndTimeInput.value = '';
    daysOfWeek.forEach(day => {
      const checkbox = document.getElementById(`day-${day}`);
      if (checkbox) {
        checkbox.checked = false;
      }
    });
    
    renderTimeGroups();
  } else {
    alert("Veuillez sélectionner au moins un jour et définir les heures de début et de fin.");
  }
}

// Convertir les groupes de temps en format de planning pour le background script
function convertToScheduleFormat() {
  const schedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  
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

// Sauvegarder les données
function saveData() {
  // Convertir au format attendu par le background script
  const schedule = convertToScheduleFormat();
  
  chrome.storage.local.set({ sites, timeGroups, schedule }, () => {
    // Afficher un message de confirmation temporaire
    const saveStatus = document.createElement('div');
    saveStatus.textContent = 'Configuration sauvegardée !';
    saveStatus.style.cssText = 'position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background-color: #48bb78; color: white; padding: 8px 16px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
    
    document.body.appendChild(saveStatus);
    
    setTimeout(() => {
      document.body.removeChild(saveStatus);
    }, 2000);
    
    // Vérifier l'onglet actuel après la sauvegarde
    checkCurrentTab(schedule);
  });
}

// Vérifier l'onglet actuel par rapport aux règles de blocage
function checkCurrentTab(schedule) {
  // Récupérer l'onglet actif
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
            
            // Si le site est bloqué, fermer la popup et rediriger l'onglet
            if (isBlocked && !currentTab.url.includes(chrome.runtime.id)) {
              // Fermer la popup
              window.close();
              
              // Rediriger vers la page de blocage
              chrome.tabs.update(currentTab.id, { url: chrome.runtime.getURL('blocked.html') });
            }
          } catch (e) {
            console.error('Erreur lors de la vérification de l\'URL:', e);
          }
        }
      }
    }
  });
}

// Extraire le nom de domaine de l'URL actuelle
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

// Ajouter le site actuel à la liste des sites bloqués
async function addCurrentSite() {
  const domain = await getCurrentTabDomain();
  
  if (domain) {
    // Vérifier si le site n'est pas déjà dans la liste
    if (!sites.includes(domain)) {
      sites.push(domain);
      renderSitesList();
      
      // Afficher un message de confirmation
      const message = document.createElement('div');
      message.textContent = `${domain} ajouté à la liste`;
      message.style.cssText = 'position: fixed; top: 16px; right: 16px; background-color: #48bb78; color: white; padding: 8px 16px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 14px;';
      
      document.body.appendChild(message);
      
      setTimeout(() => {
        document.body.removeChild(message);
      }, 2000);
    } else {
      // Afficher un message si le site est déjà dans la liste
      const message = document.createElement('div');
      message.textContent = `${domain} est déjà dans la liste`;
      message.style.cssText = 'position: fixed; top: 16px; right: 16px; background-color: #f56565; color: white; padding: 8px 16px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 14px;';
      
      document.body.appendChild(message);
      
      setTimeout(() => {
        document.body.removeChild(message);
      }, 2000);
    }
  }
}

// Événements
window.addEventListener('DOMContentLoaded', loadData);

addSiteButton.addEventListener('click', addSite);

addCurrentSiteButton.addEventListener('click', addCurrentSite);

newSiteInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addSite();
  }
});

addTimeGroupButton.addEventListener('click', addTimeGroup);

updateTimeGroupButton.addEventListener('click', updateTimeGroup);

cancelEditButton.addEventListener('click', resetTimeGroupEditor);

saveButton.addEventListener('click', saveData);

// Définir des valeurs par défaut pour les champs d'heure
newStartTimeInput.value = '09:00';
newEndTimeInput.value = '17:00';