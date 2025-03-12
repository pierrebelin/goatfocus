import { convertToScheduleFormat, generateTimeGroupId, loadData, saveData } from './storageService.js';

export const addTimeGroup = async (startTime, endTime, selectedDays) => {
  if (!startTime || !endTime || selectedDays.length === 0) {
    throw new Error("Veuillez sélectionner au moins un jour et définir les heures de début et de fin.");
  }
  
  // Vérifier que l'heure de début est avant l'heure de fin
  if (startTime >= endTime) {
    throw new Error("L'heure de début doit être avant l'heure de fin.");
  }
  
  const { sites, timeGroups, maxDailyAccess } = await loadData();
  
  // Créer un nouveau groupe de temps
  const newGroup = {
    id: generateTimeGroupId(),
    startTime: startTime,
    endTime: endTime,
    days: selectedDays
  };
  
  const newTimeGroups = [...timeGroups, newGroup];
  const schedule = convertToScheduleFormat(newTimeGroups);
  
  await saveData({ 
    sites, 
    timeGroups: newTimeGroups, 
    schedule, 
    maxDailyAccess 
  });
  
  return newTimeGroups;
};

export const updateTimeGroup = async (groupId, startTime, endTime, selectedDays) => {
  if (!startTime || !endTime || selectedDays.length === 0) {
    throw new Error("Veuillez sélectionner au moins un jour et définir les heures de début et de fin.");
  }
  
  // Vérifier que l'heure de début est avant l'heure de fin
  if (startTime >= endTime) {
    throw new Error("L'heure de début doit être avant l'heure de fin.");
  }
  
  const { sites, timeGroups, maxDailyAccess } = await loadData();
  
  // Trouver l'index du groupe à mettre à jour
  const groupIndex = timeGroups.findIndex(group => group.id === groupId);
  
  if (groupIndex === -1) {
    throw new Error("Groupe de temps non trouvé.");
  }
  
  // Créer une copie du tableau des groupes de temps
  const newTimeGroups = [...timeGroups];
  
  // Mettre à jour le groupe
  newTimeGroups[groupIndex] = {
    id: groupId,
    startTime: startTime,
    endTime: endTime,
    days: selectedDays
  };
  
  const schedule = convertToScheduleFormat(newTimeGroups);
  
  await saveData({ 
    sites, 
    timeGroups: newTimeGroups, 
    schedule, 
    maxDailyAccess 
  });
  
  return newTimeGroups;
};

export const removeTimeGroup = async (index) => {
  const { sites, timeGroups, maxDailyAccess } = await loadData();
  
  const newTimeGroups = [...timeGroups];
  newTimeGroups.splice(index, 1);
  
  const schedule = convertToScheduleFormat(newTimeGroups);
  
  await saveData({ 
    sites, 
    timeGroups: newTimeGroups, 
    schedule, 
    maxDailyAccess 
  });
  
  return newTimeGroups;
}; 