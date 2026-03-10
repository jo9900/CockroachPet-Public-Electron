const Store = require('electron-store');

const store = new Store({
  defaults: {
    cockroaches: [],
    settings: {
      maxCount: 30,
      babyGrowthMinutes: 10,
    },
  },
});

function saveCockroaches(data) {
  store.set('cockroaches', data);
}

function loadCockroaches() {
  return store.get('cockroaches');
}

function saveSettings(settings) {
  store.set('settings', settings);
}

function loadSettings() {
  return store.get('settings');
}

module.exports = { saveCockroaches, loadCockroaches, saveSettings, loadSettings };
