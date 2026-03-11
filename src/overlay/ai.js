'use strict';

const { STATES } = require('./cockroach');
const {
  SPEED_PATROL, SPEED_WANDER, SPEED_DASH, SPEED_FLEE, SPEED_CURIOUS,
  SPEED_RECOVERING, SPEED_FLYING, SPEED_BABY, SPEED_WALL_CRAWL,
  DIST_ALERT_ENTER, DIST_ALERT_LEAVE, DIST_CURIOUS_STOP,
  EDGE_MARGIN, FLY_EDGE_MARGIN, WALL_CRAWL_MARGIN, PLAYING_DEAD_TRIGGER_DIST,
  CURSOR_FAST_THRESHOLD, CURSOR_STILL_THRESHOLD,
} = require('./constants');
const { rand, dist, angleTo, normalizeAngle, isNearEdge } = require('./helpers');

// Night mode state
let nightMode = false;

function setNightMode(val) {
  nightMode = val;
}

function isNightActive() {
  return nightMode;
}

function nightMultiplier() {
  return nightMode ? 1.5 : 1.0;
}

// ─── State transition helpers ────────────────────────────────────────────────

function enterState(cockroach, state) {
  cockroach.state = state;
  cockroach.stateTimer = 0;
  cockroach.stateData = {};
}

function transitionIdle(cockroach) {
  enterState(cockroach, STATES.IDLE);
  cockroach.stateData.duration = rand(1, 3);
  cockroach.speed = 0;
}

function transitionAlert(cockroach, cursor) {
  enterState(cockroach, STATES.ALERT);
  cockroach.speed = 0;
  const screenAngle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
  cockroach.stateData.alertAngle = screenAngle - cockroach.angle - Math.PI / 2;
  cockroach.stateData.stillTimer = 0;
  cockroach.stateData.flyDelayTimer = null;
}

function trackCursorSpeed(stateData, cursor, dt) {
  if (stateData.prevCursorX === undefined) {
    stateData.prevCursorX = cursor.x;
    stateData.prevCursorY = cursor.y;
    stateData.cursorSpeed = 0;
    return;
  }
  const dx = cursor.x - stateData.prevCursorX;
  const dy = cursor.y - stateData.prevCursorY;
  const moved = Math.sqrt(dx * dx + dy * dy);
  stateData.cursorSpeed = dt > 0 ? moved / dt : 0;
  stateData.prevCursorX = cursor.x;
  stateData.prevCursorY = cursor.y;
}

// ─── State handlers ──────────────────────────────────────────────────────────

function updateIdle(cockroach, cursor, screenW, screenH) {
  cockroach.speed = 0;
  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < DIST_ALERT_ENTER) {
    transitionAlert(cockroach, cursor);
    return;
  }

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(1, 3);
  }

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    const roll = Math.random();
    const nightBoost = nightMode ? 0.15 : 0;
    const nearEdge = isNearEdge(cockroach.x, cockroach.y, screenW, screenH, EDGE_MARGIN);

    if (nearEdge && Math.random() < 0.4) {
      enterState(cockroach, STATES.WALL_CRAWL);
      cockroach.stateData.duration = rand(4, 12);
      cockroach.stateData.edge = null;
    } else if (roll < 0.25) {
      enterState(cockroach, STATES.PATROL);
      cockroach.stateData.duration = rand(3, 7);
      cockroach.angle = Math.random() * Math.PI * 2;
    } else if (roll < 0.45) {
      enterState(cockroach, STATES.WANDER);
      cockroach.stateData.duration = rand(5, 10);
    } else if (roll < 0.58) {
      enterState(cockroach, STATES.FREEZE);
      cockroach.stateData.duration = rand(2, 5);
    } else if (roll < 0.70 + nightBoost) {
      enterState(cockroach, STATES.DASH);
      cockroach.stateData.duration = rand(0.5, 1);
      cockroach.angle = Math.random() * Math.PI * 2;
    } else if (roll < 0.82 + nightBoost) {
      enterState(cockroach, STATES.GROOMING);
      cockroach.stateData.duration = rand(2, 4);
    } else if (roll < 0.92) {
      enterState(cockroach, STATES.PLAYING_DEAD);
      cockroach.stateData.duration = rand(3, 8);
    } else {
      enterState(cockroach, STATES.PATROL);
      cockroach.stateData.duration = rand(3, 7);
      cockroach.angle = Math.random() * Math.PI * 2;
    }
  }
}

function updatePatrol(cockroach, cursor) {
  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < DIST_ALERT_ENTER) {
    transitionAlert(cockroach, cursor);
    return;
  }

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(3, 7);
  }

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
    return;
  }

  cockroach.speed = SPEED_PATROL * nightMultiplier();
  cockroach.angle += (Math.random() - 0.5) * 0.08;
}

function updateWander(cockroach, dt, cursor, screenW, screenH) {
  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < DIST_ALERT_ENTER) {
    transitionAlert(cockroach, cursor);
    return;
  }

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(5, 10);
  }

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
    return;
  }

  cockroach.speed = SPEED_WANDER * nightMultiplier();

  const cx = cockroach.x;
  const cy = cockroach.y;

  let targetX = cx;
  let targetY = cy;

  const distLeft   = cx;
  const distRight  = screenW - cx;
  const distTop    = cy;
  const distBottom = screenH - cy;
  const minEdge    = Math.min(distLeft, distRight, distTop, distBottom);

  if (minEdge === distLeft) {
    targetX = EDGE_MARGIN;
    targetY = cy + (Math.random() < 0.5 ? -50 : 50);
  } else if (minEdge === distRight) {
    targetX = screenW - EDGE_MARGIN;
    targetY = cy + (Math.random() < 0.5 ? -50 : 50);
  } else if (minEdge === distTop) {
    targetX = cx + (Math.random() < 0.5 ? -50 : 50);
    targetY = EDGE_MARGIN;
  } else {
    targetX = cx + (Math.random() < 0.5 ? -50 : 50);
    targetY = screenH - EDGE_MARGIN;
  }

  const desired = angleTo(cx, cy, targetX, targetY);
  const diff = normalizeAngle(desired - cockroach.angle);
  cockroach.angle += diff * dt * 2;
}

function updateFreeze(cockroach, cursor) {
  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < DIST_ALERT_ENTER) {
    transitionAlert(cockroach, cursor);
    return;
  }

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(2, 5);
  }

  cockroach.speed = 0;

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

function updateDash(cockroach) {
  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(0.5, 1);
  }

  cockroach.speed = SPEED_DASH * nightMultiplier();

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

function updateAlert(cockroach, dt, cursor, screenW, screenH) {
  cockroach.speed = 0;
  trackCursorSpeed(cockroach.stateData, cursor, dt);

  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);

  const cursorScreenAngle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
  cockroach.stateData.alertAngle = cursorScreenAngle - cockroach.angle - Math.PI / 2;

  if (d > DIST_ALERT_LEAVE) {
    transitionIdle(cockroach);
    return;
  }

  const cursorSpeed = cockroach.stateData.cursorSpeed || 0;

  if (cursorSpeed > CURSOR_FAST_THRESHOLD) {
    enterState(cockroach, STATES.FLEE);
    cockroach.stateData.duration = rand(1, 2);
    cockroach.angle = angleTo(cursor.x, cursor.y, cockroach.x, cockroach.y);
    return;
  }

  if (cursorSpeed < CURSOR_STILL_THRESHOLD) {
    cockroach.stateData.stillTimer = (cockroach.stateData.stillTimer || 0) + dt;
  } else {
    cockroach.stateData.stillTimer = 0;
  }

  if (cockroach.stateData.stillTimer >= 3) {
    enterState(cockroach, STATES.CURIOUS);
    cockroach.stateData.duration = null;
    return;
  }

  if (isNearEdge(cockroach.x, cockroach.y, screenW, screenH, FLY_EDGE_MARGIN) && d < DIST_ALERT_ENTER) {
    if (cockroach.stateData.flyDelayTimer === null) {
      cockroach.stateData.flyDelayTimer = 0;
      cockroach.stateData.flyDelay = rand(0.5, 1.5);
    }
    cockroach.stateData.flyDelayTimer += dt;
    if (cockroach.stateData.flyDelayTimer >= cockroach.stateData.flyDelay) {
      const targetX = screenW / 2 + (Math.random() - 0.5) * screenW * 0.4;
      const targetY = screenH / 2 + (Math.random() - 0.5) * screenH * 0.4;
      enterState(cockroach, STATES.FLYING);
      cockroach.stateData.targetX = targetX;
      cockroach.stateData.targetY = targetY;
      cockroach.stateData.flying = true;
      return;
    }
  } else {
    cockroach.stateData.flyDelayTimer = null;
  }
}

function updateFlee(cockroach) {
  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(1, 2);
  }

  cockroach.speed = SPEED_FLEE * nightMultiplier();

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

function updateCurious(cockroach, dt, cursor) {
  trackCursorSpeed(cockroach.stateData, cursor, dt);
  const cursorSpeed = cockroach.stateData.cursorSpeed || 0;

  if (cursorSpeed > CURSOR_FAST_THRESHOLD) {
    transitionAlert(cockroach, cursor);
    return;
  }

  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);

  if (d > DIST_ALERT_LEAVE) {
    transitionIdle(cockroach);
    return;
  }

  if (d <= DIST_CURIOUS_STOP) {
    cockroach.speed = 0;
    cockroach.angle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
    return;
  }

  cockroach.speed = SPEED_CURIOUS;
  cockroach.angle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
}

function updateFlipped(cockroach) {
  cockroach.speed = 0;

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(2, 4);
  }

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    if (Math.random() < 0.8) {
      enterState(cockroach, STATES.RECOVERING);
      cockroach.stateData.duration = 1;
      cockroach.angle = Math.random() * Math.PI * 2;
    } else {
      cockroach.stateData.shouldSpawn = true;
      enterState(cockroach, STATES.SPAWNING);
    }
  }
}

function updateRecovering(cockroach) {
  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = 1;
  }

  cockroach.speed = SPEED_RECOVERING;

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

function updateFlying(cockroach) {
  const tx = cockroach.stateData.targetX;
  const ty = cockroach.stateData.targetY;
  cockroach.stateData.flying = true;

  if (tx === undefined || ty === undefined) {
    transitionIdle(cockroach);
    return;
  }

  const d = dist(cockroach.x, cockroach.y, tx, ty);

  if (d < 10) {
    cockroach.stateData.flying = false;
    transitionIdle(cockroach);
    return;
  }

  cockroach.speed = SPEED_FLYING;
  cockroach.angle = angleTo(cockroach.x, cockroach.y, tx, ty);
}

function updateDragged(cockroach, cursor) {
  cockroach.x = cursor.x;
  cockroach.y = cursor.y;
  cockroach.speed = 0;
  cockroach.stateData.dragged = true;
}

function updateDropped(cockroach, dt, screenH) {
  if (!cockroach.stateData.vy) {
    cockroach.stateData.vy = 0;
  }

  const GRAVITY = 800;
  cockroach.stateData.vy += GRAVITY * dt;
  cockroach.y += cockroach.stateData.vy * dt;
  cockroach.speed = 0;

  if (cockroach.y >= screenH - cockroach.radius) {
    cockroach.y = screenH - cockroach.radius;
    enterState(cockroach, STATES.FLIPPED);
    cockroach.stateData.duration = rand(2, 4);
  }
}

function updateDead(cockroach) {
  cockroach.speed = 0;
}

function updateBaby(cockroach, cursor) {
  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < DIST_ALERT_ENTER) {
    transitionAlert(cockroach, cursor);
    return;
  }

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(2, 5);
  }

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
    return;
  }

  cockroach.speed = SPEED_BABY * nightMultiplier();
  cockroach.angle += (Math.random() - 0.5) * 0.12;
}

function updateSpawning(cockroach) {
  cockroach.speed = 0;
}

function updateSquished(cockroach) {
  cockroach.speed = 0;
}

function updateWallCrawl(cockroach, cursor, screenW, screenH) {
  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < DIST_ALERT_ENTER) {
    transitionAlert(cockroach, cursor);
    return;
  }

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(4, 12);
  }

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
    return;
  }

  // Snap to nearest edge on first frame (already near edge when entering this state)
  if (!cockroach.stateData.edge) {
    const cx = cockroach.x;
    const cy = cockroach.y;
    const dists = [
      { edge: 'top', d: cy },
      { edge: 'bottom', d: screenH - cy },
      { edge: 'left', d: cx },
      { edge: 'right', d: screenW - cx },
    ];
    dists.sort((a, b) => a.d - b.d);
    cockroach.stateData.edge = dists[0].edge;
    cockroach.stateData.direction = Math.random() < 0.5 ? 1 : -1;
  }

  const edge = cockroach.stateData.edge;
  const dir = cockroach.stateData.direction;
  cockroach.speed = SPEED_WALL_CRAWL * nightMultiplier();

  switch (edge) {
    case 'top':
      cockroach.y = WALL_CRAWL_MARGIN;
      cockroach.angle = dir > 0 ? 0 : Math.PI;
      break;
    case 'bottom':
      cockroach.y = screenH - WALL_CRAWL_MARGIN;
      cockroach.angle = dir > 0 ? 0 : Math.PI;
      break;
    case 'left':
      cockroach.x = WALL_CRAWL_MARGIN;
      cockroach.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      break;
    case 'right':
      cockroach.x = screenW - WALL_CRAWL_MARGIN;
      cockroach.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      break;
  }

  // Slight wobble for realism
  cockroach.angle += Math.sin(cockroach.stateTimer * 3) * 0.02;
}

function updatePlayingDead(cockroach, cursor) {
  cockroach.speed = 0;

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(3, 8);
  }

  // If cursor gets close, surprise flee
  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < PLAYING_DEAD_TRIGGER_DIST && cockroach.stateTimer > 1.0) {
    enterState(cockroach, STATES.DASH);
    cockroach.stateData.duration = rand(1, 2);
    cockroach.angle = angleTo(cursor.x, cursor.y, cockroach.x, cockroach.y);
    return;
  }

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    enterState(cockroach, STATES.DASH);
    cockroach.stateData.duration = rand(0.5, 1);
    cockroach.angle = Math.random() * Math.PI * 2;
  }
}

function updateGrooming(cockroach, dt, cursor) {
  cockroach.speed = 0;

  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);
  if (d < DIST_ALERT_ENTER) {
    transitionAlert(cockroach, cursor);
    return;
  }

  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(2, 4);
  }

  cockroach.stateData.groomPhase = (cockroach.stateData.groomPhase || 0) + dt * 4;

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

// ─── Movement application ────────────────────────────────────────────────────

function applyMovement(cockroach, dt) {
  if (cockroach.speed === 0) return;
  cockroach.x += Math.cos(cockroach.angle) * cockroach.speed * 60 * dt;
  cockroach.y += Math.sin(cockroach.angle) * cockroach.speed * 60 * dt;
}

function clampToScreen(cockroach, screenW, screenH) {
  const r = cockroach.radius;
  cockroach.x = Math.max(r, Math.min(screenW - r, cockroach.x));
  cockroach.y = Math.max(r, Math.min(screenH - r, cockroach.y));
}

// ─── Animation phases ────────────────────────────────────────────────────────

function updatePhases(cockroach, dt) {
  const isFlying = cockroach.state === STATES.FLYING;
  const isGrooming = cockroach.state === STATES.GROOMING;
  const legSpeed = (!isFlying && !isGrooming && cockroach.speed > 0.01) ? (8 + cockroach.speed * 25) : 0;
  cockroach.legPhase += legSpeed * dt;
  cockroach.antennaPhase += 1.5 * dt;
}

// ─── Main export ─────────────────────────────────────────────────────────────

const SKIP_MOVEMENT = new Set([STATES.DRAGGED, STATES.DROPPED, STATES.DEAD, STATES.SPAWNING, STATES.SQUISHED]);
const SKIP_CLAMP = new Set([STATES.FLYING, STATES.DROPPED, STATES.DEAD]);

function updateAI(cockroach, dt, cursor, screenW, screenH) {
  cockroach.stateTimer += dt;

  switch (cockroach.state) {
    case STATES.IDLE:       updateIdle(cockroach, cursor, screenW, screenH); break;
    case STATES.PATROL:     updatePatrol(cockroach, cursor); break;
    case STATES.WANDER:     updateWander(cockroach, dt, cursor, screenW, screenH); break;
    case STATES.FREEZE:     updateFreeze(cockroach, cursor); break;
    case STATES.DASH:       updateDash(cockroach); break;
    case STATES.ALERT:      updateAlert(cockroach, dt, cursor, screenW, screenH); break;
    case STATES.FLEE:       updateFlee(cockroach); break;
    case STATES.CURIOUS:    updateCurious(cockroach, dt, cursor); break;
    case STATES.FLIPPED:    updateFlipped(cockroach); break;
    case STATES.RECOVERING: updateRecovering(cockroach); break;
    case STATES.FLYING:     updateFlying(cockroach); break;
    case STATES.DRAGGED:    updateDragged(cockroach, cursor); break;
    case STATES.DROPPED:    updateDropped(cockroach, dt, screenH); break;
    case STATES.DEAD:       updateDead(cockroach); break;
    case STATES.BABY:       updateBaby(cockroach, cursor); break;
    case STATES.SPAWNING:   updateSpawning(cockroach); break;
    case STATES.SQUISHED:   updateSquished(cockroach); break;
    case STATES.WALL_CRAWL: updateWallCrawl(cockroach, cursor, screenW, screenH); break;
    case STATES.PLAYING_DEAD: updatePlayingDead(cockroach, cursor); break;
    case STATES.GROOMING:   updateGrooming(cockroach, dt, cursor); break;
    default: break;
  }

  if (!SKIP_MOVEMENT.has(cockroach.state)) {
    applyMovement(cockroach, dt);
  }

  if (!SKIP_CLAMP.has(cockroach.state)) {
    clampToScreen(cockroach, screenW, screenH);
  }

  updatePhases(cockroach, dt);
}

module.exports = { updateAI, setNightMode, isNightActive };
