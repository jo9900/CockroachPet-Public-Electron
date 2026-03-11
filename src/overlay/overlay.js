'use strict';

const { ipcRenderer } = require('electron');
const { drawCockroach, drawSquished, drawPoopDot } = require('./renderer');
const { CockroachManager } = require('./manager');
const { InputHandler } = require('./input');
const { updateAI, setNightMode, isNightActive } = require('./ai');
const { STATES } = require('./cockroach');

// ─── Overlay constants ───────────────────────────────────────────────────────
const POOP_MAX_COUNT = 150;
const POOP_CHANCE_PER_FRAME = 0.003;
const POOP_LIFETIME_SECONDS = 30;
const POOP_MIN_SPEED = 0.3;
const POOP_OFFSET = 6;
const POOP_ALPHA_MULTIPLIER = 0.6;
const BABY_SPAWN_CHANCE = 0.4;
const SPAWN_DELAY = 0.5;
const SQUISH_ANIM_DURATION = 0.3;
const SQUISH_FADE_START = 1.5;
const SQUISH_FADE_DURATION = 1.5;
const DEAD_FADE_DURATION = 2;
const DT_CAP = 0.1;
const SAVE_INTERVAL_MS = 10000;
const NIGHT_CHECK_INTERVAL_MS = 60000;
const NIGHT_SPAWN_INTERVAL = 45;
const SPAWN_AREA_MARGIN = 0.2;

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
const initialX = Math.random() * canvas.width * (1 - 2 * SPAWN_AREA_MARGIN) + canvas.width * SPAWN_AREA_MARGIN;
const initialY = Math.random() * canvas.height * (1 - 2 * SPAWN_AREA_MARGIN) + canvas.height * SPAWN_AREA_MARGIN;
manager.spawn(initialX, initialY, false);

// ─── Poop trail system ─────────────────────────────────────────────────────────
const poopTrails = [];

function maybeDropPoop(cockroach) {
  if (cockroach.speed < POOP_MIN_SPEED) return;
  if (cockroach.state === STATES.FLYING || cockroach.state === STATES.DRAGGED) return;
  if (cockroach.state === STATES.DEAD || cockroach.state === STATES.SQUISHED) return;
  if (Math.random() > POOP_CHANCE_PER_FRAME) return;

  if (poopTrails.length >= POOP_MAX_COUNT) {
    poopTrails.shift();
  }
  poopTrails.push({
    x: cockroach.x + (Math.random() - 0.5) * POOP_OFFSET,
    y: cockroach.y + (Math.random() - 0.5) * POOP_OFFSET,
    age: 0,
    maxAge: POOP_LIFETIME_SECONDS + Math.random() * 10,
  });
}

function updatePoopTrails(dt) {
  for (let i = poopTrails.length - 1; i >= 0; i--) {
    poopTrails[i].age += dt;
    if (poopTrails[i].age >= poopTrails[i].maxAge) {
      poopTrails.splice(i, 1);
    }
  }
}

function renderPoopTrails() {
  for (const poop of poopTrails) {
    const alpha = Math.max(0, 1 - poop.age / poop.maxAge);
    drawPoopDot(ctx, poop.x, poop.y, alpha * POOP_ALPHA_MULTIPLIER);
  }
}

// ─── Squish handler with fear scatter + baby spawning ──────────────────────────
input.onSquish = (cockroach) => {
  // Fear scatter nearby cockroaches
  manager.fearScatter(cockroach.x, cockroach.y);

  // 40% chance to spawn babies from squished cockroach after a delay
  cockroach.stateData.willSpawnBabies = Math.random() < BABY_SPAWN_CHANCE;
};

// ─── Night mode detection ──────────────────────────────────────────────────────
function checkNightMode() {
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 7;
  setNightMode(isNight);
}
checkNightMode();
setInterval(checkNightMode, NIGHT_CHECK_INTERVAL_MS);

// ─── IPC event listeners ───────────────────────────────────────────────────────
ipcRenderer.on('settings-updated', (_event, settings) => {
  if (settings.maxCount !== undefined && settings.babyGrowthMinutes !== undefined) {
    manager.setSettings(settings.maxCount, settings.babyGrowthMinutes);
  }
});

ipcRenderer.on('summon', () => {
  const x = Math.random() * canvas.width * (1 - 2 * SPAWN_AREA_MARGIN) + canvas.width * SPAWN_AREA_MARGIN;
  const y = Math.random() * canvas.height * (1 - 2 * SPAWN_AREA_MARGIN) + canvas.height * SPAWN_AREA_MARGIN;
  manager.spawn(x, y, false);
});

ipcRenderer.on('kill-all', () => {
  manager.killAll();
});

ipcRenderer.on('load-state', (_event, stateData) => {
  if (stateData && stateData.cockroaches && Array.isArray(stateData.cockroaches) && stateData.cockroaches.length > 0) {
    manager.loadFromJSON(stateData.cockroaches);
  }
  if (stateData && stateData.settings) {
    manager.setSettings(
      stateData.settings.maxCount || 30,
      stateData.settings.babyGrowthMinutes || 10
    );
  }
});

ipcRenderer.on('request-state', () => {
  ipcRenderer.send('save-state', manager.toJSON());
});

// Request saved state on load
ipcRenderer.send('request-state');

let lastSaveTime = Date.now();
let nightSpawnTimer = 0;

// Animation loop
let lastFrameTime = performance.now();

function loop(now) {
  requestAnimationFrame(loop);

  let dt = (now - lastFrameTime) / 1000;
  if (dt > DT_CAP) dt = DT_CAP;
  lastFrameTime = now;

  const screenW = canvas.width;
  const screenH = canvas.height;
  const cursor = input.cursor;

  // Update growth (baby -> adult graduation)
  manager.updateGrowth();

  // Night mode: occasionally spawn extra cockroach
  if (isNightActive()) {
    nightSpawnTimer += dt;
    if (nightSpawnTimer >= NIGHT_SPAWN_INTERVAL) {
      nightSpawnTimer = 0;
      const x = Math.random() * screenW;
      const y = Math.random() < 0.5 ? 0 : screenH; // emerge from edges
      manager.spawn(x, y, false);
    }
  } else {
    nightSpawnTimer = 0;
  }

  // Update AI for each cockroach
  for (const cockroach of manager.cockroaches) {
    updateAI(cockroach, dt, cursor, screenW, screenH);

    // Handle spawning state: after timer exceeds 0.5s, spawn babies and remove parent
    if (cockroach.state === STATES.SPAWNING && cockroach.stateTimer > SPAWN_DELAY) {
      manager.spawnBabies(cockroach.x, cockroach.y);
      manager.remove(cockroach.id);
    }

    // Handle squished: spawn babies after 0.5s if flagged
    if (cockroach.state === STATES.SQUISHED &&
        cockroach.stateData.willSpawnBabies &&
        cockroach.stateTimer > SPAWN_DELAY &&
        !cockroach.stateData.babiesSpawned) {
      cockroach.stateData.babiesSpawned = true;
      manager.spawnBabies(cockroach.x, cockroach.y);
    }

    // Drop poop
    maybeDropPoop(cockroach);
  }

  // Update poop trails
  updatePoopTrails(dt);

  // Remove dead/squished cockroaches that have faded out
  manager.cleanup();

  // Clear canvas
  ctx.clearRect(0, 0, screenW, screenH);

  // Render poop trails (behind cockroaches)
  renderPoopTrails();

  // Render all cockroaches
  for (const cockroach of manager.cockroaches) {
    const scale = cockroach.isBaby ? 0.35 : 1.0;

    // Squished cockroach — special flat render
    if (cockroach.state === STATES.SQUISHED) {
      const progress = Math.min(1, cockroach.stateTimer / SQUISH_ANIM_DURATION);
      const fadeAlpha = cockroach.stateTimer > SQUISH_FADE_START
        ? Math.max(0, 1 - (cockroach.stateTimer - SQUISH_FADE_START) / SQUISH_FADE_DURATION)
        : 1;
      ctx.globalAlpha = fadeAlpha;
      drawSquished(ctx, cockroach.x, cockroach.y, scale, cockroach.angle + Math.PI / 2, progress);
      ctx.globalAlpha = 1;
      continue;
    }

    const isFlipped = cockroach.state === STATES.FLIPPED ||
                      cockroach.state === STATES.PLAYING_DEAD;
    const isFlying = cockroach.state === STATES.FLYING ||
                     cockroach.stateData.flying === true;
    const alertAngle = cockroach.stateData.alertAngle ?? null;
    const isPlayingDead = cockroach.state === STATES.PLAYING_DEAD;
    const isGrooming = cockroach.state === STATES.GROOMING;
    const groomPhase = cockroach.stateData.groomPhase || 0;

    // Dead cockroaches fade out based on stateTimer (0 -> 2s)
    if (cockroach.state === STATES.DEAD) {
      ctx.globalAlpha = Math.max(0, 1 - cockroach.stateTimer / DEAD_FADE_DURATION);
    }

    drawCockroach(ctx, cockroach.x, cockroach.y, scale, {
      angle: cockroach.angle + Math.PI / 2,
      legPhase: cockroach.legPhase,
      antennaPhase: cockroach.antennaPhase,
      isBaby: cockroach.isBaby,
      isFlipped,
      isFlying,
      alertAngle,
      isPlayingDead,
      isGrooming,
      groomPhase,
    });

    // Reset alpha after drawing dead cockroaches
    if (cockroach.state === STATES.DEAD) {
      ctx.globalAlpha = 1;
    }
  }

  // Send cockroach positions to main process for hit-testing
  const positions = manager.cockroaches
    .filter(c => c.state !== STATES.DEAD && c.state !== STATES.SQUISHED)
    .map(c => ({ x: c.x, y: c.y, radius: c.radius }));
  ipcRenderer.send('cockroach-positions', positions);

  // Periodic state save
  if (Date.now() - lastSaveTime >= SAVE_INTERVAL_MS) {
    lastSaveTime = Date.now();
    ipcRenderer.send('save-state', manager.toJSON());
  }
}

requestAnimationFrame(loop);
