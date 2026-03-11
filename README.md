# CockroachPet

A desktop cockroach pet that roams your screen as a transparent overlay. Built with Electron and HTML5 Canvas — no sprites, fully vector-rendered.

## Features

### Core
- **Vector-rendered cockroaches** — anatomically accurate with 6 legs (alternating tripod gait), long whip-like antennae, wing cases, and cerci
- **20-state AI** — idle, patrol, wander, freeze, dash, alert, flee, curious, flipped, recovering, flying, dragged, dropped, dead, baby, spawning, squished, wall crawl, playing dead, grooming
- **Cursor interaction** — cockroaches react to your mouse: alert when cursor is within 100px, flee from fast cursor movement (>200px/s), cautiously approach when cursor stays still for 3s
- **Drag & drop** — long-press (>200ms) to pick up, release to drop (with gravity physics)
- **Flying** — corner a cockroach near a screen edge (<100px from border), keep your cursor close (<100px) for 0.2-0.6s, and it takes flight toward the center of the screen. Fleeing cockroaches that reach an edge take off immediately
- **Persistence** — cockroach positions and states saved across restarts

### Squish & Breeding
- **Double-click to squish** — splat animation with flattening body and goo splatter, stain fades after 1.5s
- **Baby burst** — 40% chance squished cockroaches release 3-5 baby roaches after 0.5s
- **Fear scatter** — cockroaches within 200px flee in panic when one is squished
- **Baby growth** — nymphs mature into full adults over configurable time (default 10 min)
- **Click to flip** — single click flips them on their back; 80% chance to recover after 2-4s, 20% chance to spawn babies

### Behaviors
- **Night mode** — cockroaches move 1.5x faster, dash more often, auto-spawn at screen edges after dark (20:00-07:00)
- **Edge crawling** — when a cockroach is within 40px of a screen edge and idle, 40% chance to start crawling along it for 4-12s
- **Poop trails** — small brown droppings left behind while moving (0.3% chance per frame), fade over 30-40s
- **Playing dead** — fake death on their back for 3-8s; move cursor within 60px to trigger a surprise dash escape
- **Antenna grooming** — idle animation where front leg reaches up to clean antennae (2-4s duration)

### System
- **System tray** — cockroach emoji icon (with template fallback for macOS dark/light mode), summon, kill all, settings, quit
- **Global shortcuts** — `Cmd/Ctrl+N` summon, `Cmd/Ctrl+K` kill all
- **Settings** — max cockroach count (1-99), baby growth time (1-60 min)

## Roadmap

### v1.1 — Interaction Polish
- [ ] Squish sound effect (subtle crunch)
- [ ] Hissing sound when clicked or alert
- [ ] Vibration/screen shake on squish
- [ ] Improved squish animation (legs twitch after death)

### v1.2 — Smarter AI
- [ ] Group behavior — cockroaches cluster and move together occasionally
- [ ] Follow food — cockroaches attracted to a "crumb" you can place
- [ ] Territory marking — cockroaches return to familiar areas
- [ ] Cockroach fights — two adults occasionally wrestle

### v1.3 — Visual Enhancements
- [ ] Multiple cockroach species (German, American, Oriental) with different sizes/colors
- [ ] Seasonal skins (Santa hat at Christmas, pumpkin at Halloween)
- [ ] Molt animation when baby grows to adult
- [ ] Death stain persists longer on screen

### v1.4 — Advanced Features
- [ ] Multi-monitor support — cockroaches cross between screens
- [ ] Window-aware crawling — detect actual window edges, not just screen borders
- [ ] Startup mode — auto-launch on system boot (opt-in)
- [ ] Statistics panel — total squished, total spawned, biggest population

### Future Ideas (Unscheduled)
- [ ] macOS native support (currently Electron-only)
- [ ] Cockroach pheromone trails (visible under "UV" mode toggle)
- [ ] Boss cockroach — giant variant that's harder to squish
- [ ] Egg sacs — hidden eggs that hatch after random intervals
- [ ] Predator mode — introduce a spider that hunts cockroaches

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm (comes with Node.js)

## Setup

```bash
git clone <repo-url>
cd Pet-Electron
npm install
```

## Development

```bash
npm start
```

This launches the Electron app in development mode. The overlay window is transparent, always-on-top, and click-through by default. Cockroaches appear and roam your desktop.

## Building

### macOS (.dmg)

```bash
npm run build:mac
```

Output: `dist/CockroachPet-1.0.0.dmg`

### Windows (.exe)

**From macOS (cross-compile):**

```bash
# x64 (most Windows PCs)
npx electron-builder --win --x64

# ARM64 (Surface Pro X, etc.)
npx electron-builder --win --arm64

# Both architectures
npx electron-builder --win --x64 --arm64
```

**From Windows (native):**

```bash
npm run build:win
```

Output: `dist/CockroachPet Setup 1.0.0.exe` (NSIS one-click installer)

### Linux (.AppImage)

```bash
npx electron-builder --linux
```

### Build all platforms

```bash
npm run build
```

> **Note:** Cross-compiling for macOS from Windows/Linux is not supported by Apple. Build macOS targets on a Mac.

## Project Structure

```
Pet-Electron/
├── main.js                  # Electron main process
├── src/
│   ├── store.js             # Persistence (electron-store)
│   ├── overlay/
│   │   ├── overlay.html     # Transparent fullscreen overlay
│   │   ├── overlay.js       # Animation loop & system integration
│   │   ├── renderer.js      # Canvas vector rendering (v6 design)
│   │   ├── cockroach.js     # Data model & state enum (20 states)
│   │   ├── manager.js       # Population lifecycle management
│   │   ├── ai.js            # 20-state AI behavior system
│   │   ├── input.js         # Mouse interaction & hit-testing
│   │   ├── constants.js     # Shared speed, distance & timing constants
│   │   └── helpers.js       # Math utilities (dist, angle, edge detection)
│   └── settings/
│       ├── settings.html    # Settings window UI
│       └── settings.js      # Settings form logic
├── assets/                  # Tray icons (emoji + template fallback)
├── APP-logo.ico             # Windows app icon
├── APP-logo.png             # macOS app icon
├── electron-builder.yml     # Packaging configuration
└── package.json
```

## Architecture

- **Single fullscreen overlay** — one transparent `BrowserWindow` covers the entire screen, all cockroaches rendered on a single Canvas at 60fps
- **Click-through with dynamic toggling** — `setIgnoreMouseEvents(true)` by default; toggles to `false` when cursor is over a cockroach (polled at 16ms via `screen.getCursorScreenPoint()`)
- **No Dock/Taskbar icon** — runs as a tray-only app

## License

MIT
