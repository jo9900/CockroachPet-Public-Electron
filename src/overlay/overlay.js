'use strict';

const { ipcRenderer } = require('electron');
const { drawCockroach } = require('./renderer');
const { CockroachManager } = require('./manager');
const { InputHandler } = require('./input');
const { updateAI } = require('./ai');
const { STATES } = require('./cockroach');

// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Core modules
const manager = new CockroachManager();
const input = new InputHandler(canvas, manager);

// Spawn 1 initial cockroach at a random position
const initialX = Math.random() * canvas.width * 0.6 + canvas.width * 0.2;
const initialY = Math.random() * canvas.height * 0.6 + canvas.height * 0.2;
manager.spawn(initialX, initialY, false);

// IPC event listeners
ipcRenderer.on('settings-updated', (_event, settings) => {
  if (settings.maxCount !== undefined && settings.babyGrowthMinutes !== undefined) {
    manager.setSettings(settings.maxCount, settings.babyGrowthMinutes);
  }
});

ipcRenderer.on('summon', () => {
  const x = Math.random() * canvas.width * 0.6 + canvas.width * 0.2;
  const y = Math.random() * canvas.height * 0.6 + canvas.height * 0.2;
  manager.spawn(x, y, false);
});

ipcRenderer.on('kill-all', () => {
  manager.killAll();
});

ipcRenderer.on('load-state', (_event, stateData) => {
  if (Array.isArray(stateData) && stateData.length > 0) {
    manager.loadFromJSON(stateData);
  }
});

ipcRenderer.on('request-state', () => {
  ipcRenderer.send('save-state', manager.toJSON());
});

// Request saved state on load
ipcRenderer.send('request-state');

// Periodic state save every 10 seconds
const SAVE_INTERVAL_MS = 10000;
let lastSaveTime = Date.now();

// Animation loop
let lastFrameTime = performance.now();

function loop(now) {
  requestAnimationFrame(loop);

  // Delta time in seconds, capped at 0.1s to avoid large jumps
  let dt = (now - lastFrameTime) / 1000;
  if (dt > 0.1) dt = 0.1;
  lastFrameTime = now;

  const screenW = canvas.width;
  const screenH = canvas.height;
  const cursor = input.cursor;

  // Update growth (baby -> adult graduation)
  manager.updateGrowth();

  // Update AI for each cockroach
  for (const cockroach of manager.cockroaches) {
    updateAI(cockroach, dt, cursor, screenW, screenH);

    // Handle spawning state: after timer exceeds 0.5s, spawn babies and remove parent
    if (cockroach.state === STATES.SPAWNING && cockroach.stateTimer > 0.5) {
      manager.spawnBabies(cockroach.x, cockroach.y);
      manager.remove(cockroach.id);
    }
  }

  // Remove dead cockroaches that have faded out
  manager.cleanup();

  // Clear canvas
  ctx.clearRect(0, 0, screenW, screenH);

  // Render all cockroaches
  for (const cockroach of manager.cockroaches) {
    const scale = cockroach.isBaby ? 0.35 : 1.0;
    const isFlipped = cockroach.state === STATES.FLIPPED ||
                      cockroach.stateData.flipped === true;
    const isFlying = cockroach.state === STATES.FLYING ||
                     cockroach.stateData.flying === true;
    const alertAngle = cockroach.stateData.alertAngle ?? null;

    // Dead cockroaches fade out based on stateTimer (0 -> 2s)
    if (cockroach.state === STATES.DEAD) {
      ctx.globalAlpha = Math.max(0, 1 - cockroach.stateTimer / 2);
    }

    drawCockroach(ctx, cockroach.x, cockroach.y, scale, {
      angle: cockroach.angle + Math.PI / 2,
      legPhase: cockroach.legPhase,
      antennaPhase: cockroach.antennaPhase,
      isBaby: cockroach.isBaby,
      isFlipped,
      isFlying,
      alertAngle,
    });

    // Reset alpha after drawing dead cockroaches
    if (cockroach.state === STATES.DEAD) {
      ctx.globalAlpha = 1;
    }
  }

  // Send cockroach positions to main process for hit-testing
  const positions = manager.cockroaches
    .filter(c => c.state !== STATES.DEAD)
    .map(c => ({ x: c.x, y: c.y, radius: c.radius }));
  ipcRenderer.send('cockroach-positions', positions);

  // Periodic state save
  if (Date.now() - lastSaveTime >= SAVE_INTERVAL_MS) {
    lastSaveTime = Date.now();
    ipcRenderer.send('save-state', manager.toJSON());
  }
}

requestAnimationFrame(loop);
