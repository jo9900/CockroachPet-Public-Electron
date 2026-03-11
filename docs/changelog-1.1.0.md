# Changelog — v1.1.0

## 2026-03-11

### Code refactoring and module extraction

- Extracted shared speed, distance, and timing constants into `src/overlay/constants.js`.
- Extracted math utilities (`dist`, `angleTo`, `normalizeAngle`, `rand`, `isNearEdge`) into `src/overlay/helpers.js`.
- Refactored `ai.js` to import from `constants.js` and `helpers.js`, reducing inline definitions.
- Removed unused function parameters (`dt`, `screenW`, `screenH`) from 10+ state handler functions.
- Removed unused `dist` export from `ai.js` module.
- Replaced repeated conditional checks with `Set`-based lookups (`SKIP_MOVEMENT`, `SKIP_CLAMP`).
- Extracted all magic numbers in `overlay.js` into named constants at module top (17 constants).

### Restore production speed values

- Restored all speed constants from 1/5 testing values back to production values.
- Affected constants: SPEED_PATROL (0.2→1.0), SPEED_WANDER (0.16→0.8), SPEED_DASH (1.2→6.0), SPEED_FLEE (1.1→5.5), SPEED_CURIOUS (0.1→0.5), SPEED_RECOVERING (0.6→3.0), SPEED_FLYING (3.5→17.5), SPEED_BABY (0.24→1.2), SPEED_WALL_CRAWL (0.12→0.6).

### Improve flight trigger conditions

- Added `FLY_EDGE_MARGIN` constant (100px) separate from `EDGE_MARGIN` (40px) so flying triggers more easily near screen edges.
- Reduced fly delay from 1–2.5s to 0.5–1.5s for faster response.

### Documentation updates

- Updated README with detailed trigger conditions for all interactions (cursor distances, timing, probabilities).
- Updated project structure in README to include new `constants.js` and `helpers.js` files.
- Bumped version to 1.1.0.
