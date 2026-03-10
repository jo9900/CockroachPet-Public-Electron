const { ipcRenderer } = require('electron');

const maxCountInput = document.getElementById('maxCount');
const growthTimeInput = document.getElementById('growthTime');

ipcRenderer.send('get-settings');
ipcRenderer.on('current-settings', (event, settings) => {
  maxCountInput.value = settings.maxCount;
  growthTimeInput.value = settings.babyGrowthMinutes;
});

function onSettingsChange() {
  const settings = {
    maxCount: Math.max(1, Math.min(99, parseInt(maxCountInput.value) || 30)),
    babyGrowthMinutes: Math.max(1, Math.min(60, parseInt(growthTimeInput.value) || 10)),
  };
  ipcRenderer.send('update-settings', settings);
}

maxCountInput.addEventListener('change', onSettingsChange);
growthTimeInput.addEventListener('change', onSettingsChange);
