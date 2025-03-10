// Structure initiale des données
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
  }
};

// Initialiser les données de stockage si elles n'existent pas
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['sites', 'schedule'], (result) => {
    if (!result.sites || !result.schedule) {
      chrome.storage.local.set(defaultData);
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

// Fonction pour vérifier si un onglet doit être bloqué
function checkAndBlockTab(tabId, url) {
  // Ne pas bloquer notre propre page de blocage ou les URL spéciales de Chrome
  if (!url || url.startsWith('chrome') || url.includes(chrome.runtime.id)) return;
  
  chrome.storage.local.get(['sites', 'schedule'], (data) => {
    // Vérifier si les données existent
    if (!data.sites || !data.schedule) return;
    
    // Vérifier si l'URL est bloquée et si nous sommes dans une période de blocage
    if (isBlockedSite(url, data.sites) && isBlockedTime(data.schedule)) {
      // Bloquer la navigation en redirigeant vers notre page de blocage personnalisée
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') });
    }
  });
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