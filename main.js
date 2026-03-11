const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { saveCockroaches, loadCockroaches, saveSettings, loadSettings } = require('./src/store');

let overlayWindow = null;
let cursorPollInterval = null;
let hitTestInterval = null;
let cockroachPositions = [];
let tray = null;

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  overlayWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, 'src', 'overlay', 'overlay.html'));
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

// Poll the global cursor position and forward it to the renderer process
function startCursorPolling() {
  cursorPollInterval = setInterval(() => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const point = screen.getCursorScreenPoint();
    overlayWindow.webContents.send('cursor-position', { x: point.x, y: point.y });
  }, 16);
}

// Track cockroach positions sent from the renderer and toggle mouse event forwarding
function startHitTestPolling() {
  ipcMain.on('cockroach-positions', (_event, positions) => {
    cockroachPositions = positions;
  });

  hitTestInterval = setInterval(() => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    let overCockroach = false;

    for (const pos of cockroachPositions) {
      const dx = cursor.x - pos.x;
      const dy = cursor.y - pos.y;
      if (dx * dx + dy * dy < pos.radius * pos.radius) {
        overCockroach = true;
        break;
      }
    }

    if (overCockroach) {
      overlayWindow.setIgnoreMouseEvents(false);
    } else {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  }, 16);
}

let settingsWindow = null;

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 320,
    height: 240,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'CockroachPet Settings',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, 'src', 'settings', 'settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function isNightMode() {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 7;
}

// Check every minute and update tray tooltip
setInterval(() => {
  if (tray) {
    const tooltip = isNightMode() ? 'CockroachPet 🌙' : 'CockroachPet';
    tray.setToolTip(tooltip);
  }
}, 60000);

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    // Fallback: use template silhouette icon
    const templatePath = path.join(__dirname, 'assets', 'tray-iconTemplate.png');
    icon = nativeImage.createFromPath(templatePath);
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('CockroachPet');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Summon Cockroach',
      accelerator: 'CmdOrCtrl+N',
      click: () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('summon');
        }
      },
    },
    {
      label: 'Kill All',
      accelerator: 'CmdOrCtrl+K',
      click: () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('kill-all');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      accelerator: 'CmdOrCtrl+,',
      click: () => createSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function registerShortcuts() {
  globalShortcut.register('CmdOrCtrl+N', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('summon');
    }
  });

  globalShortcut.register('CmdOrCtrl+K', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('kill-all');
    }
  });
}

ipcMain.on('save-state', (_event, cockroachData) => {
  saveCockroaches(cockroachData);
});

ipcMain.on('request-state', (event) => {
  const cockroaches = loadCockroaches();
  const settings = loadSettings();
  event.reply('load-state', { cockroaches, settings });
});

ipcMain.on('get-settings', (event) => {
  event.reply('current-settings', loadSettings());
});

ipcMain.on('update-settings', (_event, settings) => {
  saveSettings(settings);
  overlayWindow?.webContents.send('settings-updated', settings);
});

app.dock?.hide();

app.whenReady().then(() => {
  createOverlay();
  startCursorPolling();
  startHitTestPolling();
  createTray();
  // Apply night mode tooltip immediately on startup
  if (tray) {
    const tooltip = isNightMode() ? 'CockroachPet 🌙' : 'CockroachPet';
    tray.setToolTip(tooltip);
  }
  registerShortcuts();
});

app.on('window-all-closed', () => {
  if (cursorPollInterval) clearInterval(cursorPollInterval);
  if (hitTestInterval) clearInterval(hitTestInterval);
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

module.exports = { overlayWindow };
