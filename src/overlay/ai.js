'use strict';

const { STATES } = require('./cockroach');

// Speed constants
const SPEED_PATROL = 1.0;
const SPEED_WANDER = 0.8;
const SPEED_DASH = 6.0;
const SPEED_FLEE = 5.5;
const SPEED_CURIOUS = 0.5;
const SPEED_RECOVERING = 3.0;
const SPEED_FLYING = 17.5;
const SPEED_BABY = 1.2;

// Distance thresholds
const DIST_ALERT_ENTER = 100;
const DIST_ALERT_LEAVE = 150;
const DIST_CURIOUS_STOP = 30;
const EDGE_MARGIN = 40;

// Cursor speed threshold to distinguish "fast" vs "still"
const CURSOR_FAST_THRESHOLD = 200; // px/s
const CURSOR_STILL_THRESHOLD = 20;  // px/s

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function isNearEdge(x, y, screenW, screenH) {
  return (
    x < EDGE_MARGIN ||
    x > screenW - EDGE_MARGIN ||
    y < EDGE_MARGIN ||
    y > screenH - EDGE_MARGIN
  );
}

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
  // alertAngle in local space (after render rotation of angle + PI/2)
  const screenAngle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
  cockroach.stateData.alertAngle = screenAngle - cockroach.angle - Math.PI / 2;
  cockroach.stateData.stillTimer = 0;
  cockroach.stateData.flyDelayTimer = null;
}

// Update cursor tracking data stored on cockroach stateData
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

// ─── State handlers ────────────────────────────────────────────────────────────

function updateIdle(cockroach, dt, cursor) {
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
    if (roll < 0.3) {
      enterState(cockroach, STATES.PATROL);
      cockroach.stateData.duration = rand(3, 7);
      cockroach.angle = Math.random() * Math.PI * 2;
    } else if (roll < 0.55) {
      enterState(cockroach, STATES.WANDER);
      cockroach.stateData.duration = rand(5, 10);
    } else if (roll < 0.75) {
      enterState(cockroach, STATES.FREEZE);
      cockroach.stateData.duration = rand(2, 5);
    } else {
      enterState(cockroach, STATES.DASH);
      cockroach.stateData.duration = rand(0.5, 1);
      cockroach.angle = Math.random() * Math.PI * 2;
    }
  }
}

function updatePatrol(cockroach, dt, cursor) {
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

  cockroach.speed = SPEED_PATROL;
  // Random small direction changes
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

  cockroach.speed = SPEED_WANDER;

  // Follow screen edges: steer toward the nearest edge path
  const cx = cockroach.x;
  const cy = cockroach.y;
  const margin = EDGE_MARGIN;

  // Compute a target point along the nearest edge
  let targetX = cx;
  let targetY = cy;

  const distLeft   = cx;
  const distRight  = screenW - cx;
  const distTop    = cy;
  const distBottom = screenH - cy;
  const minEdge    = Math.min(distLeft, distRight, distTop, distBottom);

  if (minEdge === distLeft) {
    targetX = margin;
    targetY = cy + (Math.random() < 0.5 ? -50 : 50);
  } else if (minEdge === distRight) {
    targetX = screenW - margin;
    targetY = cy + (Math.random() < 0.5 ? -50 : 50);
  } else if (minEdge === distTop) {
    targetX = cx + (Math.random() < 0.5 ? -50 : 50);
    targetY = margin;
  } else {
    targetX = cx + (Math.random() < 0.5 ? -50 : 50);
    targetY = screenH - margin;
  }

  const desired = angleTo(cx, cy, targetX, targetY);
  const diff = normalizeAngle(desired - cockroach.angle);
  cockroach.angle += diff * dt * 2;
}

function updateFreeze(cockroach, dt, cursor) {
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

function updateDash(cockroach, dt) {
  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(0.5, 1);
  }

  cockroach.speed = SPEED_DASH;

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

function updateAlert(cockroach, dt, cursor, screenW, screenH) {
  cockroach.speed = 0;
  trackCursorSpeed(cockroach.stateData, cursor, dt);

  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);

  // Antennae track cursor (in local space)
  const cursorScreenAngle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
  cockroach.stateData.alertAngle = cursorScreenAngle - cockroach.angle - Math.PI / 2;

  // Leave alert if cursor moves far away
  if (d > DIST_ALERT_LEAVE) {
    transitionIdle(cockroach);
    return;
  }

  const cursorSpeed = cockroach.stateData.cursorSpeed || 0;

  // Fast cursor movement → flee
  if (cursorSpeed > CURSOR_FAST_THRESHOLD) {
    enterState(cockroach, STATES.FLEE);
    cockroach.stateData.duration = rand(1, 2);
    // Flee away from cursor
    cockroach.angle = angleTo(cursor.x, cursor.y, cockroach.x, cockroach.y);
    return;
  }

  // Track how long cursor has been still
  if (cursorSpeed < CURSOR_STILL_THRESHOLD) {
    cockroach.stateData.stillTimer = (cockroach.stateData.stillTimer || 0) + dt;
  } else {
    cockroach.stateData.stillTimer = 0;
  }

  // Cursor still 3s → curious
  if (cockroach.stateData.stillTimer >= 3) {
    enterState(cockroach, STATES.CURIOUS);
    cockroach.stateData.duration = null;
    return;
  }

  // Near edge + cursor is chasing → flying after delay
  if (isNearEdge(cockroach.x, cockroach.y, screenW, screenH) && d < DIST_ALERT_ENTER) {
    if (cockroach.stateData.flyDelayTimer === null) {
      cockroach.stateData.flyDelayTimer = 0;
      cockroach.stateData.flyDelay = rand(1, 2.5);
    }
    cockroach.stateData.flyDelayTimer += dt;
    if (cockroach.stateData.flyDelayTimer >= cockroach.stateData.flyDelay) {
      // Pick a target on screen away from the cursor
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

function updateFlee(cockroach, dt) {
  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = rand(1, 2);
  }

  cockroach.speed = SPEED_FLEE;

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

function updateCurious(cockroach, dt, cursor) {
  trackCursorSpeed(cockroach.stateData, cursor, dt);
  const cursorSpeed = cockroach.stateData.cursorSpeed || 0;

  // Fast cursor movement → back to alert
  if (cursorSpeed > CURSOR_FAST_THRESHOLD) {
    transitionAlert(cockroach, cursor);
    return;
  }

  const d = dist(cockroach.x, cockroach.y, cursor.x, cursor.y);

  // Cursor too far → idle
  if (d > DIST_ALERT_LEAVE) {
    transitionIdle(cockroach);
    return;
  }

  // Stop when close enough
  if (d <= DIST_CURIOUS_STOP) {
    cockroach.speed = 0;
    cockroach.angle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
    return;
  }

  cockroach.speed = SPEED_CURIOUS;
  cockroach.angle = angleTo(cockroach.x, cockroach.y, cursor.x, cursor.y);
}

function updateFlipped(cockroach, dt) {
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
      // 20% chance: spawn babies (signal to manager via stateData flag)
      cockroach.stateData.shouldSpawn = true;
      enterState(cockroach, STATES.SPAWNING);
    }
  }
}

function updateRecovering(cockroach, dt) {
  if (!cockroach.stateData.duration) {
    cockroach.stateData.duration = 1;
  }

  cockroach.speed = SPEED_RECOVERING;

  if (cockroach.stateTimer >= cockroach.stateData.duration) {
    transitionIdle(cockroach);
  }
}

function updateFlying(cockroach, dt, screenW, screenH) {
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
  // stateTimer used for fade; no transition
}

function updateBaby(cockroach, dt, cursor) {
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

  cockroach.speed = SPEED_BABY;
  // Random direction changes
  cockroach.angle += (Math.random() - 0.5) * 0.12;
}

function updateSpawning(cockroach) {
  cockroach.speed = 0;
  // Movement handled by manager
}

// ─── Movement application ──────────────────────────────────────────────────────

function applyMovement(cockroach, dt, screenW, screenH) {
  if (cockroach.speed === 0) return;

  // cockroach.angle = standard math angle (0=right, PI/2=down)
  cockroach.x += Math.cos(cockroach.angle) * cockroach.speed * 60 * dt;
  cockroach.y += Math.sin(cockroach.angle) * cockroach.speed * 60 * dt;
}

function clampToScreen(cockroach, screenW, screenH) {
  const r = cockroach.radius;
  cockroach.x = Math.max(r, Math.min(screenW - r, cockroach.x));
  cockroach.y = Math.max(r, Math.min(screenH - r, cockroach.y));
}

// ─── Animation phases ──────────────────────────────────────────────────────────

function updatePhases(cockroach, dt) {
  // Leg animation: alternating tripod gait, speed-dependent
  // No leg animation while flying
  const isFlying = cockroach.state === STATES.FLYING;
  const legSpeed = (!isFlying && cockroach.speed > 0.01) ? (8 + cockroach.speed * 25) : 0;
  cockroach.legPhase += legSpeed * dt;
  cockroach.antennaPhase += 1.5 * dt;
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Update a single cockroach's AI state for one frame.
 * @param {import('./cockroach').Cockroach} cockroach
 * @param {number} dt - Delta time in seconds
 * @param {{ x: number, y: number }} cursor - Cursor position in screen coords
 * @param {number} screenW
 * @param {number} screenH
 */
function updateAI(cockroach, dt, cursor, screenW, screenH) {
  cockroach.stateTimer += dt;

  switch (cockroach.state) {
    case STATES.IDLE:
      updateIdle(cockroach, dt, cursor);
      break;
    case STATES.PATROL:
      updatePatrol(cockroach, dt, cursor);
      break;
    case STATES.WANDER:
      updateWander(cockroach, dt, cursor, screenW, screenH);
      break;
    case STATES.FREEZE:
      updateFreeze(cockroach, dt, cursor);
      break;
    case STATES.DASH:
      updateDash(cockroach, dt);
      break;
    case STATES.ALERT:
      updateAlert(cockroach, dt, cursor, screenW, screenH);
      break;
    case STATES.FLEE:
      updateFlee(cockroach, dt);
      break;
    case STATES.CURIOUS:
      updateCurious(cockroach, dt, cursor);
      break;
    case STATES.FLIPPED:
      updateFlipped(cockroach, dt);
      break;
    case STATES.RECOVERING:
      updateRecovering(cockroach, dt);
      break;
    case STATES.FLYING:
      updateFlying(cockroach, dt, screenW, screenH);
      break;
    case STATES.DRAGGED:
      updateDragged(cockroach, cursor);
      break;
    case STATES.DROPPED:
      updateDropped(cockroach, dt, screenH);
      break;
    case STATES.DEAD:
      updateDead(cockroach);
      break;
    case STATES.BABY:
      updateBaby(cockroach, dt, cursor);
      break;
    case STATES.SPAWNING:
      updateSpawning(cockroach);
      break;
    default:
      break;
  }

  // Apply movement (skip for states where position is externally controlled)
  const skipMovement =
    cockroach.state === STATES.DRAGGED ||
    cockroach.state === STATES.DROPPED ||
    cockroach.state === STATES.DEAD ||
    cockroach.state === STATES.SPAWNING;

  if (!skipMovement) {
    applyMovement(cockroach, dt, screenW, screenH);
  }

  // Clamp to screen, except when flying or dropped (allow off-screen arc)
  const skipClamp =
    cockroach.state === STATES.FLYING ||
    cockroach.state === STATES.DROPPED ||
    cockroach.state === STATES.DEAD;

  if (!skipClamp) {
    clampToScreen(cockroach, screenW, screenH);
  }

  updatePhases(cockroach, dt);
}

module.exports = { updateAI };
