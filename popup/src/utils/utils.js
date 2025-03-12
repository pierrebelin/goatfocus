// Fonction pour obtenir la clé de date actuelle
function getCurrentDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Fonction pour calculer le temps total utilisé aujourd'hui
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