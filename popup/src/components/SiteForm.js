import { addSite, getCurrentTabDomain } from '../services/siteService.js';

export default class SiteForm {
  constructor(newSiteInput, addSiteButton, addCurrentSiteButton) {
    this.newSiteInput = newSiteInput;
    this.addSiteButton = addSiteButton;
    this.addCurrentSiteButton = addCurrentSiteButton;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.addSiteButton.addEventListener('click', () => this.handleAddSite());
    
    this.addCurrentSiteButton.addEventListener('click', () => this.handleAddCurrentSite());
    
    this.newSiteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddSite();
      }
    });
  }
  
  async handleAddSite() {
    const siteValue = this.newSiteInput.value.trim();
    
    if (siteValue) {
      await addSite(siteValue);
      this.newSiteInput.value = '';
      // L'événement de mise à jour sera géré par le contrôleur principal
    }
  }
  
  async handleAddCurrentSite() {
    const domain = await getCurrentTabDomain();
    
    if (domain) {
      await addSite(domain);
      
      // Afficher un message de confirmation
      this.showMessage(`${domain} ajouté à la liste`, 'success');
    }
  }
  
  showMessage(text, type = 'success') {
    const message = document.createElement('div');
    message.textContent = text;
    
    const backgroundColor = type === 'success' ? '#48bb78' : '#f56565';
    
    message.style.cssText = `position: fixed; top: 16px; right: 16px; background-color: ${backgroundColor}; color: white; padding: 8px 16px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 14px;`;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      document.body.removeChild(message);
    }, 2000);
  }
} 