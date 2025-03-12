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

// Fonction pour calculer le temps total utilisé
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

// Fonction pour obtenir la clé de date actuelle
function getCurrentDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
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