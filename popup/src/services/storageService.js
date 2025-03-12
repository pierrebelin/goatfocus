const STORAGE_KEY = 'todos-react';

export const loadData = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sites', 'timeGroups', 'schedule', 'maxDailyAccess', 'dailyUsage'], (result) => {
      resolve(result);
    });
  });
};

export const saveData = (data) => {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
};

export const migrateOldScheduleFormat = (oldSchedule) => {
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
};

export const generateTimeGroupId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

export const convertToScheduleFormat = (timeGroups) => {
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
}; 