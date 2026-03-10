# CockroachPet

A desktop cockroach pet that roams your screen as a transparent overlay. Built with Electron and HTML5 Canvas — no sprites, fully vector-rendered.

## Features

- **Vector-rendered cockroaches** — anatomically accurate with 6 legs (alternating tripod gait), long whip-like antennae, wing cases, and cerci
- **16-state AI** — idle, patrol, wander, freeze, dash, alert, flee, curious, flipped, recovering, flying, dragged, dropped, dead, baby, spawning
- **Cursor interaction** — cockroaches react to your mouse: alert when near, flee from fast movement, approach when cursor is still
- **Breeding** — click to flip (20% chance to spawn babies), double-click for guaranteed breeding. Nymphs grow into adults over time
- **Drag & drop** — long-press to pick up, release to drop (with gravity)
- **Flying** — corner a cockroach near a screen edge and it takes flight
- **System tray** — summon, kill all, settings, quit
- **Global shortcuts** — `Cmd/Ctrl+N` summon, `Cmd/Ctrl+K` kill all
- **Persistence** — cockroach positions and states saved across restarts
- **Settings** — max cockroach count (1-99), baby growth time (1-60 min)

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
│   │   ├── cockroach.js     # Data model & state enum
│   │   ├── manager.js       # Population lifecycle management
│   │   ├── ai.js            # 16-state AI behavior system
│   │   └── input.js         # Mouse interaction & hit-testing
│   └── settings/
│       ├── settings.html    # Settings window UI
│       └── settings.js      # Settings form logic
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

ISC
