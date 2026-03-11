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
    this.onSquish = null; // callback for fear scatter

    this.setupCursorTracking();
    this.setupMouseEvents();
  }

  setupCursorTracking() {
    ipcRenderer.on('cursor-position', (event, pos) => {
      this.cursor.x = pos.x;
      this.cursor.y = pos.y;
    });
  }

  setupMouseEvents() {
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
        this.dragTarget.state = STATES.DROPPED;
        this.dragTarget.stateTimer = 0;
        this.dragTarget.stateData = { dropVelocity: 0 };
      } else if (holdDuration < 300) {
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
    if (cockroach.state === STATES.DEAD || cockroach.state === STATES.SQUISHED) return;
    cockroach.state = STATES.FLIPPED;
    cockroach.stateTimer = 0;
    cockroach.stateData = {};
  }

  onDoubleClick(cockroach) {
    if (cockroach.state === STATES.DEAD || cockroach.state === STATES.SQUISHED) return;
    // SQUISH! Splat the cockroach flat
    cockroach.state = STATES.SQUISHED;
    cockroach.stateTimer = 0;
    cockroach.stateData = {};
    // Trigger fear scatter callback
    if (this.onSquish) {
      this.onSquish(cockroach);
    }
  }
}

module.exports = { InputHandler };
