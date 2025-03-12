import { removeSite } from '../services/siteService.js';

export default class SitesList {
  constructor(sitesListElement) {
    this.sitesListElement = sitesListElement;
  }
  
  render(sites) {
    this.sitesListElement.innerHTML = '';
    
    sites.forEach((site, index) => {
      const li = document.createElement('li');
      li.className = 'site-item';
      
      const siteText = document.createElement('span');
      siteText.textContent = site;
      
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-site';
      removeButton.textContent = '×';
      removeButton.addEventListener('click', async () => {
        await removeSite(index);
        // L'événement de mise à jour sera géré par le contrôleur principal
      });
      
      li.appendChild(siteText);
      li.appendChild(removeButton);
      
      this.sitesListElement.appendChild(li);
    });
  }
} 