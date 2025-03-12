// Fonctions utilitaires intégrées directement dans le background.js
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

const defaultData = {
  sites: [],
  schedule: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  },
  maxDailyAccess: null,
  dailyUsage: {}
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['sites', 'schedule', 'maxDailyAccess', 'dailyUsage'], (result) => {
    if (!result.sites || !result.schedule) {
      chrome.storage.local.set(defaultData);
    }
    if (result.maxDailyAccess === undefined) {
      chrome.storage.local.set({ maxDailyAccess: null });
    }
    if (!result.dailyUsage) {
      chrome.storage.local.set({ dailyUsage: {} });
    }
  });
});

// Vérifier si une URL correspond à un site bloqué
function isBlockedSite(url, blockedSites) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    return blockedSites.some(site => {
      // Vérifier si c'est un domaine exact ou un sous-domaine
      if (site.startsWith('*.')) {
        const domain = site.substring(2);
        return hostname.endsWith(domain);
      } else {
        return hostname === site || hostname.endsWith('.' + site);
      }
    });
  } catch (e) {
    return false;
  }
}

// Vérifier si l'heure actuelle est dans une plage de blocage
function isBlockedTime(schedule) {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  
  // Si aucun planning n'est défini pour aujourd'hui, retourner false
  if (!schedule[today] || schedule[today].length === 0) {
    return false;
  }
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  // Vérifier si l'heure actuelle est dans une des plages horaires
  return schedule[today].some(timeRange => {
    const [startHour, startMinute] = timeRange.start.split(':').map(Number);
    const [endHour, endMinute] = timeRange.end.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
  });
}

function updateUsageTime(domain) {
  const dateKey = getCurrentDateKey();
  
  chrome.storage.local.get(['dailyUsage'], (data) => {
    const dailyUsage = data.dailyUsage || {};
    
    if (!dailyUsage[dateKey]) {
      dailyUsage[dateKey] = {};
    }
    
    if (!dailyUsage[dateKey][domain]) {
      dailyUsage[dateKey][domain] = 0;
    }
    
    dailyUsage[dateKey][domain] += 1;
    
    chrome.storage.local.set({ dailyUsage });
  });
}

function getDomainTime(domain, callback) {
  const dateKey = getCurrentDateKey();
  
  chrome.storage.local.get(['dailyUsage'], (data) => {
    const dailyUsage = data.dailyUsage || {};
    const todayUsage = dailyUsage[dateKey] || {};
    const timeSpent = todayUsage[domain] || 0;
    
    callback(timeSpent);
  });
}

function getTotalTimeForToday(callback) {
  const dateKey = getCurrentDateKey();
  
  chrome.storage.local.get(['dailyUsage'], (data) => {
    const dailyUsage = data.dailyUsage || {};
    const todayUsage = dailyUsage[dateKey] || {};
    
    let totalTime = 0;
    for (const domain in todayUsage) {
      totalTime += todayUsage[domain];
    }
    
    callback(totalTime);
  });
}

async function checkAndBlockTab(tabId, url) {
  if (!url || url.startsWith('chrome') || url.includes(chrome.runtime.id)) return;
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    chrome.storage.local.get(['sites', 'schedule'], async (data) => {
      if (!data.sites || !data.schedule) return;
      
      const isBlocked = isBlockedSite(url, data.sites);
      const isInBlockedTime = isBlockedTime(data.schedule);
      
      if (isBlocked && isInBlockedTime) {
        // Utiliser la fonction centralisée pour vérifier le temps d'utilisation
        const usageInfo = await calculateTotalUsageTime();
        
        // Bloquer si aucune limite n'est définie ou si la limite est dépassée
        if (usageInfo.maxDailyAccess === null || usageInfo.isLimitExceeded) {
          chrome.tabs.update(tabId, { url: chrome.runtime.getURL(`blocked.html?domain=${domain}`) });
        }
        // Si le temps n'est pas dépassé, on laisse l'utilisateur accéder au site
        // Le temps continuera d'être suivi par startPeriodicCheck
      }
    });
  } catch (e) {
    console.error(e);
  }
}

// Écouteur d'événements pour la navigation web
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Ne vérifier que la frame principale
  if (details.frameId !== 0) return;
  
  checkAndBlockTab(details.tabId, details.url);
});

// Vérifier également les mises à jour de l'onglet (en cas de changement d'URL dans le même onglet)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    checkAndBlockTab(tabId, tab.url);
  }
});

// Vérifier quand un onglet prend le focus (devient actif)
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Récupérer les informations sur l'onglet qui vient de prendre le focus
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    // Vérifier si l'URL doit être bloquée
    if (tab.url && tab.url !== 'chrome://newtab/') {
      checkAndBlockTab(tab.id, tab.url);
    }
  });
});

function startPeriodicCheck() {
  setInterval(async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        try {
          const urlObj = new URL(tabs[0].url);
          const domain = urlObj.hostname;
          
          // Ne pas vérifier les pages internes de l'extension ou du navigateur
          if (tabs[0].url.startsWith('chrome') || tabs[0].url.includes(chrome.runtime.id)) {
            return;
          }
          
          chrome.storage.local.get(['sites', 'schedule'], async (data) => {
            if (!data.sites || !data.schedule) return;
            
            const isBlockedSiteResult = isBlockedSite(tabs[0].url, data.sites);
            const isInBlockedTime = isBlockedTime(data.schedule);
            
            if (isBlockedSiteResult && isInBlockedTime) {
              // Toujours incrémenter l'utilisation si on est sur un site bloqué pendant une période de blocage
              updateUsageTime(domain);
              
              // Ensuite, vérifier si le temps est dépassé pour bloquer le site
              const usageInfo = await calculateTotalUsageTime();
              
              // Si le temps est écoulé et que nous ne sommes pas déjà sur la page de blocage, bloquer immédiatement
              if (usageInfo.isLimitExceeded && !tabs[0].url.includes('blocked.html')) {
                chrome.tabs.update(tabs[0].id, { 
                  url: chrome.runtime.getURL(`blocked.html?domain=${domain}`) 
                });
              }
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
    });
  }, 1000); // Mettre à jour l'utilisation chaque seconde
}

startPeriodicCheck();