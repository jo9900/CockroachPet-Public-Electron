# CockroachPet Electron — Design Spec

## Overview

Desktop cockroach pet app built with Electron, targeting macOS and Windows. Cockroaches roam the desktop as transparent overlays with full AI behavior, user interaction, and breeding mechanics.

## Architecture

### Single Fullscreen Overlay (chosen over multi-window)

One transparent, frameless, always-on-top `BrowserWindow` covering the entire screen. All cockroaches rendered on a single HTML5 Canvas.

```
Main Process
├── Fullscreen overlay window (transparent, click-through)
│   └── Single Canvas rendering all cockroaches @ 60fps
├── Settings window (normal, non-transparent)
├── System tray (menu + icon)
└── State manager (cockroach array, cursor tracking, persistence)
```

**Why single window over multi-window:**
- 1 window vs 30+ BrowserWindows — drastically lower memory
- No IPC bottleneck for cursor broadcast
- Smooth spawning animations without window creation latency
- Scales to 99 cockroaches without performance issues

**Mouse event handling:**
- Default: `setIgnoreMouseEvents(true, { forward: true })` — clicks pass through to desktop
- Poll cursor position via `screen.getCursorScreenPoint()` at 16ms intervals
- Hit-test cockroach positions in main process; when cursor is over a cockroach, toggle `setIgnoreMouseEvents(false)` to capture clicks
- Click/drag events handled in renderer, forwarded to cockroach AI

### Renderer Architecture

```
cockroach.html (overlay)
├── CockroachRenderer — Canvas drawing (v6 design)
├── CockroachAI — State machine per cockroach instance
├── CockroachManager — Array management, spawning, killing
├── InputHandler — Mouse events, hit-testing
└── AnimationLoop — requestAnimationFrame @ 60fps
```

## Cockroach Vector Rendering (v6 — approved)

All cockroaches drawn via Canvas API, no sprites/images.

### Adult proportions (in local units, scaled at runtime)
- **Body**: Large elongated oval, 42×20 units. Dominant visual element.
- **Head**: Small circle (r=5.5), partially under pronotum
- **Pronotum**: Shield shape, same color as wing cases (`#9B5523`), blends seamlessly
- **Wing cases**: Two overlapping ovals covering abdomen, center seam, subtle highlights
- **Abdomen tip**: Slightly lighter color (`#C4956A`, 30% opacity)
- **Eyes**: Small red dots (`#CC2200`) on head

### Legs (compact, close to body)
- 6 legs, 3 pairs, all attached to thorax region
- 2-segment design: body-attach → knee → foot
- **Front pair**: Very short, angled slightly forward
- **Middle pair**: Slightly longer, extending sideways
- **Rear pair**: Longest, 90° knee bend with long downward segment (12 units)
- Small spine/hair detail on tibia
- Alternating tripod gait animation

### Antennae
- Very long (48 units, longer than body), whip-like
- 14-segment curve with progressive curvature (outward arc, slight return at tip)
- Tapered: thick base (1.5px) → thin tip (0.25px), drawn via multi-pass rendering
- Organic sway animation, more movement at tips
- Alert mode: point toward cursor while maintaining natural sway

### Baby (nymph)
- 1/3 scale of adult
- Lighter color (`#C4956A`)
- No wing cases
- Proportionally shorter antennae

### States affecting rendering
- **Static/patrol/wander**: Normal pose, leg animation when moving
- **Alert**: Antennae track cursor direction
- **Flipped**: Belly-up view, legs flailing wildly
- **Flying**: Wings spread (translucent ovals), body hovers with shadow below
- **Dead**: Squash animation, fade out

## AI State Machine

16 states as defined in PRD. Key transitions:

```
idle → random → patrol / wander / freeze / dash
patrol/wander/freeze → cursor < 100px → alert
alert → cursor fast move → flee
alert → cursor still 3s → curious
near edge + cursor chasing → 1-2.5s delay → flying
any → click → flipped
flipped → 2-4s → 80% recovering / 20% spawning
flipped → double-click → spawning (immediate)
any → long-press → dragged → release → dropped → flipped
any → Kill All → dead
```

## Breeding (Ootheca)

- Trigger: click → 20% chance, or double-click → guaranteed
- Parent plays explosion animation, disappears
- 3-5 nymphs spawn at parent position, scatter
- Blocked when total count >= max setting
- Nymphs mature after configurable time (default 10 min), persisted across restarts

## System Tray

```
🪳 icon
├── Summon Cockroach  [Ctrl/Cmd+N]
├── Kill All          [Ctrl/Cmd+K]
├── Settings          [Ctrl/Cmd+,]
└── Quit              [Ctrl/Cmd+Q]
```

Tray icon from `APP-logo.png` (1024×1024, scaled down).

## Settings Window

Separate non-transparent `BrowserWindow`:
- Max cockroach count: 1-99 (default 30)
- Baby growth time: 1-60 minutes (default 10)
- Changes apply immediately, persisted to local JSON

## Persistence

Local JSON file via `electron-store` or direct fs:
- Cockroach array: position, state, birth time, isBaby
- User settings
- Loaded on startup, saved on changes

## Packaging

`electron-builder`:
- macOS: `.dmg`
- Windows: `.exe` (NSIS installer)
- No Dock/Taskbar icon (`skipTaskbar: true`)

## Night Mode (minimal)

- Tray icon swap between 20:00-07:00
- Full behavior changes deferred

## Out of Scope

- Sound effects
- Social behavior (cockroach-to-cockroach interaction)
- Full night mode behavior changes
