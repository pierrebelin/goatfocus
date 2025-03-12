import { removeTimeGroup } from '../services/timeGroupService.js';
import { shortDayNames } from '../utils/constants.js';

export default class TimeGroupsList {
  constructor(timeGroupsContainer, onEditTimeGroup) {
    this.timeGroupsContainer = timeGroupsContainer;
    this.onEditTimeGroup = onEditTimeGroup;
  }
  
  render(timeGroups) {
    this.timeGroupsContainer.innerHTML = '';
    
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
        this.onEditTimeGroup(group.id);
      });
      
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-time-group';
      removeButton.textContent = '×';
      removeButton.title = 'Supprimer cette plage horaire';
      removeButton.addEventListener('click', async () => {
        await removeTimeGroup(index);
        // L'événement de mise à jour sera géré par le contrôleur principal
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
      
      this.timeGroupsContainer.appendChild(groupDiv);
    });
  }
} 