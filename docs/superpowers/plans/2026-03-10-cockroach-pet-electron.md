# CockroachPet Electron Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform desktop cockroach pet app with Electron — transparent overlay, vector-rendered cockroaches with full AI behavior, breeding, and packaging to .dmg/.exe.

**Architecture:** Single fullscreen transparent overlay window renders all cockroaches on one Canvas at 60fps. Main process handles cursor tracking, hit-testing, and IPC. Separate settings window for configuration. electron-builder for packaging.

**Tech Stack:** Electron 33+, vanilla JS (no framework), HTML5 Canvas, electron-store, electron-builder

**Spec:** `docs/superpowers/specs/2026-03-10-cockroach-pet-electron-design.md`
**Rendering reference:** `.superpowers/brainstorm/10548-1773128672/cockroach-render-v6.html`

---

## File Structure

```
Pet-Electron/
├── package.json
├── electron-builder.yml
├── main.js                  # Main process: app lifecycle, tray, windows, IPC, cursor polling
├── src/
│   ├── overlay/
│   │   ├── overlay.html     # Fullscreen transparent overlay
│   │   ├── overlay.js       # Entry: initializes manager, input, animation loop
│   │   ├── renderer.js      # Canvas drawing functions (v6 approved design)
│   │   ├── cockroach.js     # Single cockroach class: state, position, velocity
│   │   ├── ai.js            # State machine logic: transitions, timers
│   │   ├── manager.js       # Array management: spawn, kill, growth timer
│   │   └── input.js         # Mouse event handling, hit-testing
│   ├── settings/
│   │   ├── settings.html    # Settings window UI
│   │   └── settings.js      # Settings form logic
│   └── store.js             # Persistence: electron-store wrapper
├── assets/
│   ├── tray-icon.png        # 22×22 tray icon (generated from APP-logo.png)
│   └── icon.png             # App icon for packaging
└── docs/
    └── changelog-1.0.0.md
```

---

## Chunk 1: Project Scaffold + Renderer

### Task 1: Project initialization

**Files:**
- Create: `package.json`
- Create: `main.js`
- Create: `src/overlay/overlay.html`

- [ ] **Step 1: Initialize npm project**

```bash
cd /Users/joyuen/Desktop/project/Pet-Electron
npm init -y
```

Update `package.json`:
```json
{
  "name": "cockroach-pet",
  "version": "1.0.0",
  "description": "Desktop cockroach pet app",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win"
  },
  "author": "",
  "license": "MIT"
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install electron@latest electron-store@latest --save
npm install electron-builder@latest --save-dev
```

- [ ] **Step 3: Create minimal main.js**

Create `main.js` — minimal Electron main process that opens a transparent fullscreen overlay:

```js
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let overlayWindow = null;

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

app.dock?.hide();

app.whenReady().then(createOverlay);

app.on('window-all-closed', () => {
  app.quit();
});
```

- [ ] **Step 4: Create overlay.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script src="overlay.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create placeholder overlay.js**

```js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Placeholder: draw a test circle to verify overlay works
ctx.beginPath();
ctx.arc(200, 200, 30, 0, Math.PI * 2);
ctx.fillStyle = '#8B4513';
ctx.fill();
```

- [ ] **Step 6: Test the overlay**

```bash
npx electron .
```

Expected: A brown circle appears at (200,200) on a transparent overlay. Desktop is visible behind it. Circle is always on top. Clicks pass through to desktop.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json main.js src/
git commit -m "feat: scaffold Electron project with transparent overlay window"
```

---

### Task 2: Cockroach renderer (v6 design)

**Files:**
- Create: `src/overlay/renderer.js`

Port the approved v6 rendering code from the brainstorm prototype into a clean module.

- [ ] **Step 1: Create renderer.js**

This file exports `drawCockroach(ctx, x, y, scale, opts)` — the exact rendering logic from the approved v6 prototype. Copy the drawing functions (colors, drawLeg, drawAllLegs, drawFlippedLegs, drawWhipAntenna, drawAntennae, drawCockroach) from `.superpowers/brainstorm/10548-1773128672/cockroach-render-v6.html` lines 53-413.

Wrap in module exports:
```js
// At top of file
const COLORS = { /* ... exact v6 colors ... */ };

// ... all drawing functions from v6 ...

// At bottom
module.exports = { drawCockroach, COLORS };
```

Key functions to port:
- `COLORS` object (line 53-73)
- `drawLeg()` (line 77-87)
- `drawAllLegs()` (line 89-151)
- `drawFlippedLegs()` (line 153-170)
- `drawWhipAntenna()` (line 173-218)
- `drawAntennae()` (line 220-238)
- `drawCockroach()` (line 240-413)

- [ ] **Step 2: Integrate renderer into overlay.js**

Replace the test circle with actual cockroach rendering:
```js
const { drawCockroach } = require('./renderer');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Test: draw one cockroach
let phase = 0;
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  phase += 0.07;
  drawCockroach(ctx, 400, 400, 1.0, {
    legPhase: phase,
    antennaPhase: phase * 0.4,
  });
  requestAnimationFrame(loop);
}
loop();
```

- [ ] **Step 3: Test rendering**

```bash
npx electron .
```

Expected: An animated cockroach walks in place at (400,400) on the transparent overlay. Legs animate with alternating tripod gait. Antennae sway naturally.

- [ ] **Step 4: Commit**

```bash
git add src/overlay/renderer.js src/overlay/overlay.js
git commit -m "feat: add v6 cockroach Canvas renderer with full anatomy"
```

---

### Task 3: Cockroach data model

**Files:**
- Create: `src/overlay/cockroach.js`

- [ ] **Step 1: Create cockroach.js**

```js
const STATES = {
  IDLE: 'idle',
  PATROL: 'patrol',
  WANDER: 'wander',
  FREEZE: 'freeze',
  DASH: 'dash',
  ALERT: 'alert',
  FLEE: 'flee',
  CURIOUS: 'curious',
  FLIPPED: 'flipped',
  RECOVERING: 'recovering',
  FLYING: 'flying',
  DRAGGED: 'dragged',
  DROPPED: 'dropped',
  DEAD: 'dead',
  BABY: 'baby',
  SPAWNING: 'spawning',
};

let nextId = 0;

class Cockroach {
  constructor(x, y, isBaby = false) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.state = isBaby ? STATES.BABY : STATES.IDLE;
    this.isBaby = isBaby;
    this.birthTime = Date.now();

    // Animation phases
    this.legPhase = Math.random() * Math.PI * 2;
    this.antennaPhase = Math.random() * Math.PI * 2;

    // State timers
    this.stateTimer = 0;
    this.stateData = {};

    // Rendering size (for hit-testing)
    this.radius = isBaby ? 12 : 25;
  }

  // Serialize for persistence
  toJSON() {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      state: this.state,
      isBaby: this.isBaby,
      birthTime: this.birthTime,
    };
  }

  // Deserialize
  static fromJSON(data) {
    const c = new Cockroach(data.x, data.y, data.isBaby);
    c.angle = data.angle;
    c.state = data.state;
    c.birthTime = data.birthTime;
    return c;
  }
}

module.exports = { Cockroach, STATES };
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay/cockroach.js
git commit -m "feat: add Cockroach data model with 16 states and serialization"
```

---

### Task 4: Cockroach manager

**Files:**
- Create: `src/overlay/manager.js`

- [ ] **Step 1: Create manager.js**

```js
const { Cockroach, STATES } = require('./cockroach');

class CockroachManager {
  constructor() {
    this.cockroaches = [];
    this.maxCount = 30;
    this.babyGrowthMinutes = 10;
  }

  spawn(x, y, isBaby = false) {
    if (this.cockroaches.length >= this.maxCount) return null;
    const c = new Cockroach(x, y, isBaby);
    this.cockroaches.push(c);
    return c;
  }

  remove(id) {
    this.cockroaches = this.cockroaches.filter(c => c.id !== id);
  }

  killAll() {
    this.cockroaches.forEach(c => {
      c.state = STATES.DEAD;
      c.stateTimer = 0;
    });
  }

  spawnBabies(parentX, parentY) {
    const count = 3 + Math.floor(Math.random() * 3); // 3-5
    const babies = [];
    for (let i = 0; i < count; i++) {
      const baby = this.spawn(parentX, parentY, true);
      if (baby) {
        // Scatter direction
        baby.angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        baby.speed = 2 + Math.random() * 2;
        baby.state = STATES.BABY;
        babies.push(baby);
      }
    }
    return babies;
  }

  updateGrowth() {
    const now = Date.now();
    const growthMs = this.babyGrowthMinutes * 60 * 1000;
    this.cockroaches.forEach(c => {
      if (c.isBaby && now - c.birthTime >= growthMs) {
        c.isBaby = false;
        c.radius = 25;
        if (c.state === STATES.BABY) {
          c.state = STATES.IDLE;
        }
      }
    });
  }

  // Remove dead cockroaches after fade animation
  cleanup() {
    this.cockroaches = this.cockroaches.filter(
      c => c.state !== STATES.DEAD || c.stateTimer < 2
    );
  }

  getAlive() {
    return this.cockroaches.filter(c => c.state !== STATES.DEAD);
  }

  setSettings(maxCount, babyGrowthMinutes) {
    this.maxCount = maxCount;
    this.babyGrowthMinutes = babyGrowthMinutes;
  }

  toJSON() {
    return this.cockroaches
      .filter(c => c.state !== STATES.DEAD)
      .map(c => c.toJSON());
  }

  loadFromJSON(dataArray) {
    this.cockroaches = dataArray.map(d => Cockroach.fromJSON(d));
  }
}

module.exports = { CockroachManager };
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay/manager.js
git commit -m "feat: add CockroachManager with spawn, kill, breeding, growth"
```

---

## Chunk 2: AI State Machine + Input

### Task 5: AI state machine

**Files:**
- Create: `src/overlay/ai.js`

- [ ] **Step 1: Create ai.js with state transitions**

```js
const { STATES } = require('./cockroach');

// Speeds per state
const SPEED = {
  [STATES.PATROL]: 0.5,
  [STATES.WANDER]: 0.4,
  [STATES.DASH]: 4,
  [STATES.FLEE]: 3.5,
  [STATES.CURIOUS]: 0.3,
  [STATES.RECOVERING]: 2,
  [STATES.FLYING]: 2,
  [STATES.BABY]: 0.7,
};

function updateAI(cockroach, dt, cursor, screenW, screenH) {
  const c = cockroach;
  c.stateTimer += dt;

  // Update animation phases
  if (c.speed > 0) {
    c.legPhase += dt * c.speed * 3;
  }
  c.antennaPhase += dt * 0.8;

  // Distance to cursor
  const dx = cursor.x - c.x;
  const dy = cursor.y - c.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angleToCursor = Math.atan2(dy, dx);

  // Screen edge detection
  const edgeMargin = 150;
  const nearEdge =
    c.x < edgeMargin || c.x > screenW - edgeMargin ||
    c.y < edgeMargin || c.y > screenH - edgeMargin;

  switch (c.state) {
    case STATES.IDLE:
      c.speed = 0;
      if (c.stateTimer > 1 + Math.random() * 2) {
        const choices = [STATES.PATROL, STATES.WANDER, STATES.FREEZE, STATES.DASH];
        c.state = choices[Math.floor(Math.random() * choices.length)];
        c.stateTimer = 0;
        c.angle = Math.random() * Math.PI * 2;
      }
      if (dist < 100) {
        c.state = STATES.ALERT;
        c.stateTimer = 0;
      }
      break;

    case STATES.PATROL:
      c.speed = SPEED[STATES.PATROL];
      if (c.stateTimer > 3 + Math.random() * 4) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
      }
      // Slight random turning
      c.angle += (Math.random() - 0.5) * 0.1;
      if (dist < 100) {
        c.state = STATES.ALERT;
        c.stateTimer = 0;
      }
      break;

    case STATES.WANDER:
      c.speed = SPEED[STATES.WANDER];
      // Follow screen edge
      if (c.x < 50) c.angle = 0;
      else if (c.x > screenW - 50) c.angle = Math.PI;
      else if (c.y < 50) c.angle = Math.PI / 2;
      else if (c.y > screenH - 50) c.angle = -Math.PI / 2;
      if (c.stateTimer > 5 + Math.random() * 5) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
      }
      if (dist < 100) {
        c.state = STATES.ALERT;
        c.stateTimer = 0;
      }
      break;

    case STATES.FREEZE:
      c.speed = 0;
      if (c.stateTimer > 2 + Math.random() * 3) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
      }
      if (dist < 100) {
        c.state = STATES.ALERT;
        c.stateTimer = 0;
      }
      break;

    case STATES.DASH:
      c.speed = SPEED[STATES.DASH];
      if (c.stateTimer > 0.5 + Math.random() * 0.5) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
      }
      break;

    case STATES.ALERT:
      c.speed = 0;
      c.stateData.alertAngle = angleToCursor;
      if (dist > 150) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
        c.stateData = {};
      }
      // Cursor moved fast -> flee
      if (c.stateData.lastCursorDist !== undefined) {
        const cursorSpeed = Math.abs(dist - c.stateData.lastCursorDist) / dt;
        if (cursorSpeed > 300) {
          c.state = STATES.FLEE;
          c.angle = angleToCursor + Math.PI + (Math.random() - 0.5) * 0.5;
          c.stateTimer = 0;
          c.stateData = {};
        }
      }
      c.stateData.lastCursorDist = dist;
      // Cursor still for 3s -> curious
      if (c.stateTimer > 3) {
        c.state = STATES.CURIOUS;
        c.stateTimer = 0;
      }
      // Near edge + cursor chasing -> flying
      if (nearEdge && dist < 120) {
        if (!c.stateData.flyTimer) c.stateData.flyTimer = 0;
        c.stateData.flyTimer += dt;
        if (c.stateData.flyTimer > 1 + Math.random() * 1.5) {
          c.state = STATES.FLYING;
          c.stateTimer = 0;
          c.stateData = {
            targetX: 100 + Math.random() * (screenW - 200),
            targetY: 100 + Math.random() * (screenH - 200),
          };
        }
      }
      break;

    case STATES.FLEE:
      c.speed = SPEED[STATES.FLEE];
      if (c.stateTimer > 1 + Math.random()) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
      }
      break;

    case STATES.CURIOUS:
      // Move toward cursor slowly
      c.angle = angleToCursor;
      c.speed = SPEED[STATES.CURIOUS];
      c.stateData.alertAngle = angleToCursor;
      if (dist < 30) {
        c.speed = 0; // Touching cursor with antennae
      }
      if (dist > 150) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
        c.stateData = {};
      }
      // Cursor moved -> alert
      if (c.stateData.lastCursorDist !== undefined) {
        const cursorSpeed = Math.abs(dist - c.stateData.lastCursorDist) / dt;
        if (cursorSpeed > 200) {
          c.state = STATES.ALERT;
          c.stateTimer = 0;
          c.stateData = {};
        }
      }
      c.stateData.lastCursorDist = dist;
      break;

    case STATES.FLIPPED:
      c.speed = 0;
      c.stateData.flipped = true;
      if (c.stateTimer > 2 + Math.random() * 2) {
        if (Math.random() < 0.8) {
          c.state = STATES.RECOVERING;
          c.stateData = {};
        } else {
          c.state = STATES.SPAWNING;
          c.stateData = {};
        }
        c.stateTimer = 0;
      }
      break;

    case STATES.RECOVERING:
      c.stateData.flipped = false;
      c.speed = SPEED[STATES.RECOVERING];
      c.angle = Math.random() * Math.PI * 2;
      if (c.stateTimer > 1) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
      }
      break;

    case STATES.FLYING: {
      const tx = c.stateData.targetX || screenW / 2;
      const ty = c.stateData.targetY || screenH / 2;
      const fdx = tx - c.x;
      const fdy = ty - c.y;
      const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
      c.angle = Math.atan2(fdy, fdx);
      c.speed = SPEED[STATES.FLYING];
      c.stateData.flying = true;
      if (fdist < 30) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
        c.stateData = {};
      }
      break;
    }

    case STATES.DRAGGED:
      c.speed = 0;
      c.x = cursor.x;
      c.y = cursor.y;
      c.stateData.dragged = true;
      break;

    case STATES.DROPPED:
      c.speed = 0;
      c.stateData.dropVelocity = (c.stateData.dropVelocity || 0) + dt * 800;
      c.y += c.stateData.dropVelocity * dt;
      // Hit ground (bottom of screen or original position)
      if (c.y > screenH - 50) {
        c.y = screenH - 50;
        c.state = STATES.FLIPPED;
        c.stateTimer = 0;
        c.stateData = {};
      }
      break;

    case STATES.DEAD:
      c.speed = 0;
      // stateTimer used for fade-out
      break;

    case STATES.BABY:
      // Baby behaves like patrol but faster
      c.speed = SPEED[STATES.BABY];
      c.angle += (Math.random() - 0.5) * 0.15;
      if (c.stateTimer > 2 + Math.random() * 3) {
        c.state = STATES.IDLE;
        c.stateTimer = 0;
      }
      if (dist < 100) {
        c.state = STATES.ALERT;
        c.stateTimer = 0;
      }
      break;

    case STATES.SPAWNING:
      c.speed = 0;
      // Handled by manager (spawn babies, remove parent)
      break;
  }

  // Move
  if (c.speed > 0 && c.state !== STATES.DRAGGED && c.state !== STATES.DROPPED) {
    c.x += Math.cos(c.angle) * c.speed;
    c.y += Math.sin(c.angle) * c.speed;
  }

  // Keep on screen (except flying)
  if (c.state !== STATES.FLYING && c.state !== STATES.DROPPED) {
    c.x = Math.max(20, Math.min(screenW - 20, c.x));
    c.y = Math.max(20, Math.min(screenH - 20, c.y));
  }
}

module.exports = { updateAI };
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay/ai.js
git commit -m "feat: add AI state machine with 16 states and transitions"
```

---

### Task 6: Input handler with hit-testing

**Files:**
- Create: `src/overlay/input.js`

- [ ] **Step 1: Create input.js**

```js
const { ipcRenderer } = require('electron');
const { STATES } = require('./cockroach');

class InputHandler {
  constructor(canvas, manager) {
    this.canvas = canvas;
    this.manager = manager;
    this.cursor = { x: 0, y: 0 };
    this.mouseDown = false;
    this.mouseDownTime = 0;
    this.dragTarget = null;
    this.lastClickTime = 0;

    this.setupCursorTracking();
    this.setupMouseEvents();
  }

  setupCursorTracking() {
    // Receive cursor position from main process
    ipcRenderer.on('cursor-position', (event, pos) => {
      this.cursor.x = pos.x;
      this.cursor.y = pos.y;
    });
  }

  setupMouseEvents() {
    // These events fire when mouse is over a cockroach
    // (main process toggles setIgnoreMouseEvents based on hit-test)
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.mouseDownTime = Date.now();

      const hit = this.hitTest(e.clientX, e.clientY);
      if (hit) {
        this.dragTarget = hit;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const holdDuration = Date.now() - this.mouseDownTime;
      const now = Date.now();

      if (this.dragTarget && this.dragTarget.state === STATES.DRAGGED) {
        // Was dragging -> drop
        this.dragTarget.state = STATES.DROPPED;
        this.dragTarget.stateTimer = 0;
        this.dragTarget.stateData = { dropVelocity: 0 };
      } else if (holdDuration < 300) {
        // Click
        const hit = this.hitTest(e.clientX, e.clientY);
        if (hit) {
          const isDoubleClick = now - this.lastClickTime < 400;
          if (isDoubleClick) {
            this.onDoubleClick(hit);
          } else {
            this.onClick(hit);
          }
          this.lastClickTime = now;
        }
      }

      this.mouseDown = false;
      this.dragTarget = null;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.mouseDown && this.dragTarget) {
        const holdDuration = Date.now() - this.mouseDownTime;
        if (holdDuration > 200) {
          // Long press -> drag
          if (this.dragTarget.state !== STATES.DRAGGED) {
            this.dragTarget.state = STATES.DRAGGED;
            this.dragTarget.stateTimer = 0;
            this.dragTarget.stateData = {};
          }
        }
      }
    });
  }

  hitTest(mx, my) {
    // Check cockroaches in reverse order (top-most first)
    const alive = this.manager.getAlive();
    for (let i = alive.length - 1; i >= 0; i--) {
      const c = alive[i];
      const dx = mx - c.x;
      const dy = my - c.y;
      if (dx * dx + dy * dy < c.radius * c.radius) {
        return c;
      }
    }
    return null;
  }

  onClick(cockroach) {
    if (cockroach.state === STATES.DEAD) return;
    cockroach.state = STATES.FLIPPED;
    cockroach.stateTimer = 0;
    cockroach.stateData = {};
  }

  onDoubleClick(cockroach) {
    if (cockroach.state === STATES.DEAD) return;
    cockroach.state = STATES.SPAWNING;
    cockroach.stateTimer = 0;
    cockroach.stateData = {};
  }
}

module.exports = { InputHandler };
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay/input.js
git commit -m "feat: add input handler with hit-testing, click, double-click, drag"
```

---

### Task 7: Main animation loop + overlay integration

**Files:**
- Modify: `src/overlay/overlay.js`
- Modify: `main.js` (add cursor polling + IPC)

- [ ] **Step 1: Update overlay.js — full integration**

```js
const { ipcRenderer } = require('electron');
const { drawCockroach } = require('./renderer');
const { CockroachManager } = require('./manager');
const { InputHandler } = require('./input');
const { updateAI } = require('./ai');
const { STATES } = require('./cockroach');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const manager = new CockroachManager();
const input = new InputHandler(canvas, manager);

// Spawn initial cockroach
manager.spawn(
  canvas.width / 2 + (Math.random() - 0.5) * 200,
  canvas.height / 2 + (Math.random() - 0.5) * 200
);

// IPC: receive settings
ipcRenderer.on('settings-updated', (event, settings) => {
  manager.setSettings(settings.maxCount, settings.babyGrowthMinutes);
});

ipcRenderer.on('summon', () => {
  manager.spawn(
    100 + Math.random() * (canvas.width - 200),
    100 + Math.random() * (canvas.height - 200)
  );
});

ipcRenderer.on('kill-all', () => {
  manager.killAll();
});

// Tell main process about cockroach positions for hit-testing
function sendPositions() {
  const positions = manager.getAlive().map(c => ({
    x: c.x,
    y: c.y,
    radius: c.radius,
  }));
  ipcRenderer.send('cockroach-positions', positions);
}

// Animation loop
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1); // cap delta
  lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update growth
  manager.updateGrowth();

  // Update AI for each cockroach
  manager.cockroaches.forEach(c => {
    updateAI(c, dt, input.cursor, canvas.width, canvas.height);
  });

  // Handle spawning
  manager.cockroaches.forEach(c => {
    if (c.state === STATES.SPAWNING && c.stateTimer > 0.5) {
      manager.spawnBabies(c.x, c.y);
      manager.remove(c.id);
    }
  });

  // Cleanup dead
  manager.cleanup();

  // Render
  manager.cockroaches.forEach(c => {
    const opts = {
      angle: c.angle - Math.PI / 2, // renderer expects 0=up
      legPhase: c.legPhase,
      antennaPhase: c.antennaPhase,
      isBaby: c.isBaby,
      isFlipped: c.state === STATES.FLIPPED || c.stateData.flipped,
      isFlying: c.state === STATES.FLYING || c.stateData.flying,
      alertAngle: c.stateData.alertAngle ?? null,
    };

    // Dead fade-out
    if (c.state === STATES.DEAD) {
      ctx.globalAlpha = Math.max(0, 1 - c.stateTimer);
    }

    const scale = c.isBaby ? 0.35 : 1.0;
    drawCockroach(ctx, c.x, c.y, scale, opts);

    if (c.state === STATES.DEAD) {
      ctx.globalAlpha = 1;
    }
  });

  // Send positions to main process for hit-testing
  sendPositions();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Save state periodically
setInterval(() => {
  ipcRenderer.send('save-state', manager.toJSON());
}, 10000);

// Load state on start
ipcRenderer.send('request-state');
ipcRenderer.on('load-state', (event, data) => {
  if (data && data.cockroaches) {
    manager.loadFromJSON(data.cockroaches);
    if (data.settings) {
      manager.setSettings(data.settings.maxCount, data.settings.babyGrowthMinutes);
    }
  }
});
```

- [ ] **Step 2: Update main.js — cursor polling + IPC**

Add to `main.js` after `createOverlay()`:

```js
const { ipcMain, screen: electronScreen, Tray, Menu, globalShortcut } = require('electron');

// Cursor polling — 16ms interval
let cursorInterval = null;
function startCursorPolling() {
  cursorInterval = setInterval(() => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      const point = electronScreen.getCursorScreenPoint();
      overlayWindow.webContents.send('cursor-position', point);
    }
  }, 16);
}

// Hit-test based mouse event toggling
let cockroachPositions = [];
ipcMain.on('cockroach-positions', (event, positions) => {
  cockroachPositions = positions;
});

// Check if cursor is over any cockroach
function updateMousePassthrough() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const cursor = electronScreen.getCursorScreenPoint();
  const isOverCockroach = cockroachPositions.some(p => {
    const dx = cursor.x - p.x;
    const dy = cursor.y - p.y;
    return dx * dx + dy * dy < p.radius * p.radius;
  });
  overlayWindow.setIgnoreMouseEvents(!isOverCockroach, { forward: true });
}

// Poll mouse passthrough at 16ms
setInterval(updateMousePassthrough, 16);
```

- [ ] **Step 3: Test full integration**

```bash
npx electron .
```

Expected: One cockroach spawns at center, idles, patrols around. Moving cursor near it triggers alert (antennae point toward cursor). Fast cursor movement triggers flee. Clicking flips it.

- [ ] **Step 4: Commit**

```bash
git add src/overlay/overlay.js main.js
git commit -m "feat: integrate animation loop, AI, input, and cursor tracking"
```

---

## Chunk 3: System Tray, Settings, Persistence, Packaging

### Task 8: Persistence with electron-store

**Files:**
- Create: `src/store.js`
- Modify: `main.js` (add save/load IPC)

- [ ] **Step 1: Create store.js**

```js
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
```

- [ ] **Step 2: Add save/load IPC to main.js**

```js
const { saveCockroaches, loadCockroaches, saveSettings, loadSettings } = require('./src/store');

ipcMain.on('save-state', (event, cockroachData) => {
  saveCockroaches(cockroachData);
});

ipcMain.on('request-state', (event) => {
  const data = {
    cockroaches: loadCockroaches(),
    settings: loadSettings(),
  };
  event.reply('load-state', data);
});
```

- [ ] **Step 3: Commit**

```bash
git add src/store.js main.js
git commit -m "feat: add electron-store persistence for cockroaches and settings"
```

---

### Task 9: System tray

**Files:**
- Modify: `main.js` (add Tray)
- Create: `assets/` directory with tray icon

- [ ] **Step 1: Generate tray icon**

Use the existing `APP-logo.png` if present, otherwise create a simple 22×22 PNG. For now, create a placeholder:

```bash
mkdir -p /Users/joyuen/Desktop/project/Pet-Electron/assets
```

We need a 22×22 tray icon. Use a Canvas-based script or copy APP-logo.png. For now, reference a template icon and generate at build time. Create a simple inline icon generation in main.js using `nativeImage`.

- [ ] **Step 2: Add tray to main.js**

Add after `createOverlay()` call:

```js
const { Tray, Menu, nativeImage, globalShortcut } = require('electron');

let tray = null;

function createTray() {
  // Create a simple cockroach emoji tray icon
  // On macOS, use a 22x22 template image
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');

  // Fallback: create icon from text if file doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(iconPath)) {
    // Use a minimal 16x16 brown dot as placeholder
    const img = nativeImage.createEmpty();
    tray = new Tray(img);
  } else {
    tray = new Tray(iconPath);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Summon Cockroach',
      accelerator: 'CmdOrCtrl+N',
      click: () => {
        overlayWindow?.webContents.send('summon');
      },
    },
    {
      label: 'Kill All',
      accelerator: 'CmdOrCtrl+K',
      click: () => {
        overlayWindow?.webContents.send('kill-all');
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      accelerator: 'CmdOrCtrl+,',
      click: () => {
        createSettingsWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('CockroachPet');
  tray.setContextMenu(contextMenu);
}

// Register global shortcuts
function registerShortcuts() {
  globalShortcut.register('CmdOrCtrl+N', () => {
    overlayWindow?.webContents.send('summon');
  });
  globalShortcut.register('CmdOrCtrl+K', () => {
    overlayWindow?.webContents.send('kill-all');
  });
}
```

Update `app.whenReady()`:
```js
app.whenReady().then(() => {
  createOverlay();
  createTray();
  registerShortcuts();
  startCursorPolling();
});
```

- [ ] **Step 3: Commit**

```bash
git add main.js assets/
git commit -m "feat: add system tray with menu and global shortcuts"
```

---

### Task 10: Settings window

**Files:**
- Create: `src/settings/settings.html`
- Create: `src/settings/settings.js`
- Modify: `main.js` (add settings window creation)

- [ ] **Step 1: Create settings.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CockroachPet Settings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #2a2a2e;
      color: #e0e0e0;
      padding: 24px;
    }
    h1 { font-size: 18px; margin-bottom: 20px; }
    .field { margin-bottom: 16px; }
    label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; }
    input[type="number"] {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #555;
      border-radius: 6px;
      background: #1a1a1e;
      color: #e0e0e0;
      font-size: 14px;
    }
    .hint { font-size: 11px; color: #777; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Settings</h1>
  <div class="field">
    <label for="maxCount">Max Cockroach Count</label>
    <input type="number" id="maxCount" min="1" max="99" value="30">
    <div class="hint">Range: 1-99</div>
  </div>
  <div class="field">
    <label for="growthTime">Baby Growth Time (minutes)</label>
    <input type="number" id="growthTime" min="1" max="60" value="10">
    <div class="hint">Range: 1-60 minutes</div>
  </div>
  <script src="settings.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create settings.js**

```js
const { ipcRenderer } = require('electron');

const maxCountInput = document.getElementById('maxCount');
const growthTimeInput = document.getElementById('growthTime');

// Load current settings
ipcRenderer.send('get-settings');
ipcRenderer.on('current-settings', (event, settings) => {
  maxCountInput.value = settings.maxCount;
  growthTimeInput.value = settings.babyGrowthMinutes;
});

// Save on change
function onSettingsChange() {
  const settings = {
    maxCount: Math.max(1, Math.min(99, parseInt(maxCountInput.value) || 30)),
    babyGrowthMinutes: Math.max(1, Math.min(60, parseInt(growthTimeInput.value) || 10)),
  };
  ipcRenderer.send('update-settings', settings);
}

maxCountInput.addEventListener('change', onSettingsChange);
growthTimeInput.addEventListener('change', onSettingsChange);
```

- [ ] **Step 3: Add settings window to main.js**

```js
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

// Settings IPC
ipcMain.on('get-settings', (event) => {
  event.reply('current-settings', loadSettings());
});

ipcMain.on('update-settings', (event, settings) => {
  saveSettings(settings);
  // Forward to overlay
  overlayWindow?.webContents.send('settings-updated', settings);
});
```

- [ ] **Step 4: Test settings**

```bash
npx electron .
```

Expected: Click tray icon → Settings opens a small window. Changing values persists and updates cockroach behavior in real-time.

- [ ] **Step 5: Commit**

```bash
git add src/settings/ main.js
git commit -m "feat: add settings window with max count and growth time"
```

---

### Task 11: Packaging with electron-builder

**Files:**
- Create: `electron-builder.yml`
- Modify: `package.json` (build config)

- [ ] **Step 1: Create electron-builder.yml**

```yaml
appId: com.cockroachpet.app
productName: CockroachPet
directories:
  output: dist

mac:
  category: public.app-category.entertainment
  target:
    - dmg
  icon: assets/icon.png

win:
  target:
    - nsis
  icon: assets/icon.png

nsis:
  oneClick: true
  allowToChangeInstallationDirectory: false

files:
  - "**/*"
  - "!.superpowers/**"
  - "!docs/**"
  - "!dist/**"
```

- [ ] **Step 2: Update package.json build field**

Ensure `"main": "main.js"` is set and scripts include:
```json
{
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win"
  }
}
```

- [ ] **Step 3: Create app icon**

If `APP-logo.png` exists in project root, copy it:
```bash
cp APP-logo.png assets/icon.png 2>/dev/null || echo "No APP-logo.png found, will need manual icon"
```

Generate tray icon (22×22) from the app icon. Can be done with `sips` on macOS:
```bash
sips -z 22 22 assets/icon.png --out assets/tray-icon.png 2>/dev/null || echo "Generate tray icon manually"
```

- [ ] **Step 4: Test build**

```bash
npm run build:mac
```

Expected: `dist/` contains a `.dmg` file. For Windows, use `npm run build:win` (requires Windows or Wine).

- [ ] **Step 5: Commit**

```bash
git add electron-builder.yml package.json assets/
git commit -m "feat: add electron-builder config for macOS dmg and Windows exe"
```

---

### Task 12: Night mode (minimal — tray icon swap)

**Files:**
- Modify: `main.js`

- [ ] **Step 1: Add night mode check to main.js**

```js
function isNightMode() {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 7;
}

// Check every minute and swap tray icon
setInterval(() => {
  if (tray) {
    const tooltip = isNightMode() ? 'CockroachPet 🌙' : 'CockroachPet';
    tray.setToolTip(tooltip);
  }
}, 60000);
```

- [ ] **Step 2: Commit**

```bash
git add main.js
git commit -m "feat: add minimal night mode with tray tooltip change"
```

---

### Task 13: Changelog and final cleanup

**Files:**
- Create: `docs/changelog-1.0.0.md`
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
.superpowers/
*.log
```

- [ ] **Step 2: Create changelog**

```markdown
# Changelog v1.0.0

## 2026-03-10

- Initial release of CockroachPet Electron
- Single fullscreen transparent overlay architecture
- Canvas vector-rendered cockroaches (v6 design): large body, short legs, long curved antennae
- 16-state AI behavior: idle, patrol, wander, freeze, dash, alert, flee, curious, flipped, recovering, flying, dragged, dropped, dead, baby, spawning
- User interaction: click (flip), double-click (spawn babies), long-press drag, cursor proximity reactions
- Breeding: ootheca mechanic with 3-5 nymphs, configurable growth time
- System tray with Summon, Kill All, Settings, Quit
- Settings window: max count (1-99), baby growth time (1-60 min)
- Persistence via electron-store
- Minimal night mode (tray tooltip)
- Packaging: electron-builder for macOS (.dmg) and Windows (.exe)
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore docs/changelog-1.0.0.md
git commit -m "chore: add gitignore and changelog for v1.0.0"
```

---

## Task Dependency Graph

```
Task 1 (scaffold) → Task 2 (renderer) → Task 7 (integration)
Task 1 → Task 3 (cockroach model) → Task 4 (manager) → Task 7
Task 1 → Task 5 (AI) → Task 7
Task 1 → Task 6 (input) → Task 7
Task 7 → Task 8 (persistence)
Task 7 → Task 9 (tray)
Task 8 + Task 9 → Task 10 (settings)
Task 10 → Task 11 (packaging)
Task 11 → Task 12 (night mode)
Task 12 → Task 13 (cleanup)
```

**Parallelizable groups:**
- After Task 1: Tasks 2, 3, 5, 6 can run in parallel
- Task 4 depends on Task 3 only
- Task 7 is the integration point
- After Task 7: Tasks 8, 9 can run in parallel
