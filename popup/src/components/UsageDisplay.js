import { formatUsageDisplay, updateMaxDailyAccess } from '../services/usageService.js';

export default class UsageDisplay {
  constructor(usageDisplayElement, maxDailyAccessInput) {
    this.usageDisplayElement = usageDisplayElement;
    this.maxDailyAccessInput = maxDailyAccessInput;
    
    if (this.maxDailyAccessInput) {
      this.setupEventListeners();
    }
  }
  
  setupEventListeners() {
    this.maxDailyAccessInput.addEventListener('change', () => this.handleMaxDailyAccessChange());
    this.maxDailyAccessInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleMaxDailyAccessChange();
      }
    });
  }
  
  async handleMaxDailyAccessChange() {
    await updateMaxDailyAccess(this.maxDailyAccessInput.value);
    // L'événement de mise à jour sera géré par le contrôleur principal
  }
  
  render(dailyUsage, maxDailyAccess) {
    if (this.maxDailyAccessInput) {
      this.maxDailyAccessInput.value = maxDailyAccess !== null ? maxDailyAccess : '';
    }
    
    const usageInfo = formatUsageDisplay(dailyUsage, maxDailyAccess);
    
    if (typeof usageInfo === 'string') {
      this.usageDisplayElement.textContent = usageInfo;
    } else {
      if (usageInfo.percentUsed !== null) {
        this.usageDisplayElement.innerHTML = `
          <div>${usageInfo.text}</div>
          <div class="progress-bar">
            <div class="progress" style="width: ${usageInfo.percentUsed}%;"></div>
          </div>
        `;
      } else {
        this.usageDisplayElement.textContent = usageInfo.text;
      }
    }
  }
} 