# Changelog — v1.0.0

## 2026-03-10

### Initialize Electron project

- Set up npm project with `cockroach-pet` package name.
- Installed `electron`, `electron-store` as runtime dependencies.
- Installed `electron-builder` as a dev dependency.
- Created `main.js`: Electron main process that opens a transparent, frameless, always-on-top fullscreen overlay window with mouse event pass-through.
- Created `src/overlay/overlay.html`: minimal HTML shell with a full-screen transparent canvas.
- Created `src/overlay/overlay.js`: placeholder renderer that draws a brown test circle on the canvas.
- Added `.gitignore` to exclude `node_modules/`, `dist/`, and OS artifacts.

### Add cockroach renderer (v6)

- Created `src/overlay/renderer.js` as a CommonJS module ported from the approved v6 prototype.
- Exports `drawCockroach(ctx, x, y, scale, opts)` and `COLORS` object.
- Includes all drawing functions: `drawLeg`, `drawAllLegs`, `drawFlippedLegs`, `drawWhipAntenna`, `drawAntennae`.
- Supports all render modes: walking, flying, flipped (belly-up), baby, and alert (antenna tracking).
- Updated `src/overlay/overlay.js` to use the renderer with an animated `requestAnimationFrame` loop.

### Add Cockroach data model

- Created `src/overlay/cockroach.js` with `STATES` enum (16 states) and `Cockroach` class.
- `Cockroach` constructor auto-increments id, assigns random angle/legPhase/antennaPhase, and sets radius based on baby/adult flag.
- `toJSON()` serializes x, y, angle, state, isBaby, birthTime for persistence.
- `static fromJSON(data)` deserializes a saved cockroach back into a live instance.

### Add CockroachManager

- Created `src/overlay/manager.js` with `CockroachManager` class.
- Manages the cockroach array with spawn cap (`maxCount = 30`), removal, and kill-all.
- `spawnBabies(parentX, parentY)` spawns 3–5 babies fanning out from the given position.
- `updateGrowth()` graduates babies to adults after `babyGrowthMinutes` (default 10).
- `cleanup()` removes dead cockroaches once their `stateTimer` reaches 2.
- `toJSON()` / `loadFromJSON()` delegate to the `Cockroach` serialization methods for persistence.

### Add InputHandler

- Created `src/overlay/input.js` with `InputHandler` class.
- Tracks global cursor position via `ipcRenderer` `cursor-position` events.
- `setupMouseEvents()` registers mousedown, mouseup, and mousemove listeners on the canvas.
- `hitTest(mx, my)` does reverse-order radius hit detection against alive cockroaches.
- Single click transitions a cockroach to `FLIPPED`; double click (< 400 ms) transitions to `SPAWNING`.
- Hold > 200 ms then drag transitions to `DRAGGED`; releasing a dragged cockroach transitions to `DROPPED`.

### Add AI state machine

- Created `src/overlay/ai.js` exporting `updateAI(cockroach, dt, cursor, screenW, screenH)`.
- Implements all 16 cockroach states: idle, patrol, wander, freeze, dash, alert, flee, curious, flipped, recovering, flying, dragged, dropped, dead, baby, spawning.
- `idle`: waits 1–3 s then randomly picks patrol / wander / freeze / dash. Cursor within 100 px triggers alert.
- `patrol` / `wander` / `freeze`: each has its own duration and speed; all yield to alert on cursor proximity.
- `alert`: tracks cursor speed each frame; fast movement → flee, still for 3 s → curious, near edge + cursor close → flying after a 1–2.5 s delay, cursor beyond 150 px → idle.
- `flee` / `curious` / `recovering`: short-lived states that return to idle when their timer or distance condition is met.
- `flipped`: stays still 2–4 s then 80 % → recovering, 20 % → spawning (sets `stateData.shouldSpawn` flag for the manager).
- `flying`: sets `stateData.flying = true`, steers toward `stateData.targetX/Y` at 2 speed, lands (idle) when within 10 px.
- `dragged`: snaps cockroach position to cursor each frame and sets `stateData.dragged = true`.
- `dropped`: applies 800 px/s² gravity; transitions to flipped on ground contact.
- `dead`: freezes movement; `stateTimer` drives the fade in the renderer.
- `baby`: faster patrol-like behavior (0.7 speed), 2–5 s, cursor proximity → alert.
- Movement is applied as `speed × 60 × dt` px per frame; screen clamping skipped for flying and dropped states.
- `legPhase` and `antennaPhase` are advanced each frame proportional to speed and a fixed antenna rate respectively.

### Integrate animation loop and wire all modules

- Rewrote `src/overlay/overlay.js` with the full animation loop integrating renderer, manager, input handler, AI, and cockroach modules.
- Canvas resizes on window resize; spawns 1 initial cockroach at a random position on load.
- `requestAnimationFrame` loop: calculates delta time (capped at 0.1 s), updates growth, runs `updateAI` for each cockroach, handles spawning state (babies + parent removal), cleans up dead cockroaches, and renders all with correct angle offset and state-based flags.
- Dead cockroaches rendered with `globalAlpha` fade over 2 s based on `stateTimer`.
- Sends cockroach positions to main process every frame for hit-testing; saves state via IPC every 10 s.
- Listens for IPC events: `settings-updated`, `summon`, `kill-all`, `load-state`, `request-state`.
- Updated `main.js`: added `ipcMain` import, cursor polling at 16 ms intervals, cockroach-position-based hit-test polling to toggle `setIgnoreMouseEvents`, placeholder `save-state` / `request-state` IPC handlers, and exported `overlayWindow` for tray use.

### Add persistence layer

- Created `src/store.js`: thin `electron-store` wrapper with default values for `cockroaches` (empty array) and `settings` (`maxCount: 30`, `babyGrowthMinutes: 10`). Exports `saveCockroaches`, `loadCockroaches`, `saveSettings`, `loadSettings`.
- Updated `main.js`: replaced placeholder `save-state` and `request-state` IPC handlers with real implementations that delegate to `src/store.js`. `request-state` now replies with `{ cockroaches, settings }` instead of an empty array.

### Add system tray and global shortcuts

- Added `Tray`, `Menu`, `nativeImage`, `globalShortcut` to the Electron imports in `main.js`.
- Added `fs` (Node built-in) import for icon file existence check.
- Created `assets/` directory for future tray icon assets.
- Added `createTray()`: loads `assets/tray-icon.png` if present, otherwise falls back to a 16x16 RGBA brown square via `nativeImage.createFromBuffer`. Builds a context menu with Summon Cockroach (CmdOrCtrl+N), Kill All (CmdOrCtrl+K), Settings (CmdOrCtrl+,), and Quit (CmdOrCtrl+Q). Sets tooltip "CockroachPet".
- Added `registerShortcuts()`: registers global CmdOrCtrl+N and CmdOrCtrl+K shortcuts that send `summon` and `kill-all` IPC events to the overlay window.
- Added placeholder `createSettingsWindow()` (logs only; Task 10 will implement the full UI).
- Wired `createTray()` and `registerShortcuts()` into `app.whenReady()`.
- Added `app.on('will-quit')` handler that calls `globalShortcut.unregisterAll()` for clean teardown.

### Add settings window

- Created `src/settings/settings.html`: dark-themed settings window with two fields — Max Cockroach Count (1–99) and Baby Growth Time in minutes (1–60).
- Created `src/settings/settings.js`: renderer script that sends `get-settings` on load, populates inputs from `current-settings` reply, and sends `update-settings` with clamped values on input change.
- Replaced placeholder `createSettingsWindow()` in `main.js` with a real implementation: opens a 320x240 non-resizable `BrowserWindow`; re-focuses if already open; nulls `settingsWindow` on close.
- Added `get-settings` IPC handler: replies with `loadSettings()` result.
- Added `update-settings` IPC handler: calls `saveSettings()` and forwards `settings-updated` to the overlay window.

### Add electron-builder packaging config

- Created `electron-builder.yml` with appId `com.cockroachpet.app`, DMG target for macOS and NSIS one-click installer for Windows, and file exclusion rules for `.superpowers/`, `docs/`, and `dist/`.
- Updated `.gitignore` to include `.superpowers/` and `*.log` entries.
- `package.json` build scripts (`build`, `build:mac`, `build:win`) were already correct — no changes needed.

### Add minimal night mode (initial)

- Added `isNightMode()` helper in `main.js`: returns `true` when the local hour is >= 20 or < 7.
- Added a `setInterval` (60 s) immediately after `createTray()` definition that updates the tray tooltip to `'CockroachPet 🌙'` during night hours and `'CockroachPet'` during the day.
- The tooltip is also applied immediately on startup inside `app.whenReady()` after `createTray()` is called, so the correct label shows without waiting for the first tick.

## 2026-03-11

### Enhanced night active mode

- Night mode (20:00–07:00) now affects cockroach behavior in the renderer: all movement speeds are multiplied by 1.5× during night hours.
- IDLE state transitions weighted toward more DASH at night (+15% probability).
- Auto-spawns a new cockroach every 45 seconds at screen edges during night mode.
- Night mode detected in the overlay process via `setNightMode()` / `isNightActive()` exported from `ai.js`.

### Double-click squish kill (SQUISHED state)

- Double-clicking a cockroach now triggers a new `SQUISHED` state instead of `SPAWNING`.
- Squish animation: cockroach body flattens (scaleY 1.0→0.15) with widening (scaleX +60%), goo splatter particles appear, and flattened legs stick out.
- Squished cockroach fades out over 1.5 seconds after the initial 1.5s display, then is cleaned up.
- 40% chance the squished cockroach spawns 3–5 baby cockroaches 0.5 seconds after being squished.

### Fear scatter

- When a cockroach is squished, all cockroaches within a 200px radius enter `FLEE` state.
- Fleeing cockroaches scatter away from the squish point at 5.5–7.5 speed for 1–2.5 seconds.
- Implemented via `CockroachManager.fearScatter(sourceX, sourceY)` called from the `InputHandler.onSquish` callback.

### Edge/wall crawling (WALL_CRAWL state)

- New `WALL_CRAWL` state: cockroach picks a random screen edge (top/bottom/left/right) and crawls along it.
- Smoothly gravitates toward the edge margin (15px from border) while moving along the chosen direction.
- Duration 4–12 seconds with slight sinusoidal wobble for organic feel.
- Transitions from IDLE with ~12% probability; cursor proximity interrupts to ALERT.

### Poop trails

- Cockroaches now have a small chance (0.3% per frame) to drop tiny brown droppings while moving.
- Droppings are rendered as small brown dots (1.8px radius) with a lighter highlight.
- Each dropping fades out over 30–40 seconds.
- Maximum 150 droppings on screen; oldest removed when limit exceeded.
- No droppings while flying, dragged, dead, or squished.

### Playing dead (PLAYING_DEAD state)

- New `PLAYING_DEAD` state: cockroach flips on its back and lies completely still, mimicking death.
- If cursor approaches within 60px after the first second, cockroach "revives" with a surprise DASH away.
- Otherwise, after 3–8 seconds, spontaneously revives and scurries away.
- Transitions from IDLE with ~8% probability.
- Rendered using the flipped/belly-up pose with no leg movement.

### Antenna grooming (GROOMING state)

- New `GROOMING` state: cockroach stops moving and uses a front leg to clean its antennae.
- One front leg animates reaching up to the antennae area with a smooth sinusoidal motion.
- The grooming leg alternates sides based on the groom phase.
- Duration 2–4 seconds; cursor proximity interrupts to ALERT.
- Transitions from IDLE with ~10% probability.

### State machine expansion

- Added 4 new states to `STATES` enum in `cockroach.js`: `SQUISHED`, `WALL_CRAWL`, `PLAYING_DEAD`, `GROOMING`.
- Total states increased from 16 to 20.
- All new states properly handled in `ai.js` switch statement, movement skip list, and phase update logic.
- `manager.js` updated: `getAlive()` and `toJSON()` exclude squished cockroaches; `cleanup()` removes squished cockroaches after 3 seconds.
- `input.js` updated: double-click now triggers `SQUISHED` with `onSquish` callback; single click still triggers `FLIPPED`.
- `overlay.js` updated: load-state handler now properly parses `{ cockroaches, settings }` object format; integrates poop system, night mode, squish baby spawning, and new render flags.
