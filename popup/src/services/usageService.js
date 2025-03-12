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

function updateMaxDailyAccess(maxDailyValue) {
  return new Promise(async (resolve) => {
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
    
    resolve(maxDailyAccess);
  });
}

function getDailyUsage() {
  return new Promise(async (resolve) => {
    const result = await loadData();
    resolve(result.dailyUsage || {});
  });
}

function formatUsageDisplay(dailyUsage, maxDailyAccess) {
  if (!dailyUsage) return "Pas d'utilisation aujourd'hui";
  
  const now = new Date();
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