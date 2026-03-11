const { Cockroach, STATES } = require('./cockroach');

const FEAR_SCATTER_RADIUS = 200;

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
    const count = 3 + Math.floor(Math.random() * 3);
    const babies = [];
    for (let i = 0; i < count; i++) {
      const baby = this.spawn(parentX, parentY, true);
      if (baby) {
        baby.angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        baby.speed = 2 + Math.random() * 2;
        baby.state = STATES.BABY;
        babies.push(baby);
      }
    }
    return babies;
  }

  // Fear scatter: nearby cockroaches flee from a squished cockroach
  fearScatter(sourceX, sourceY) {
    for (const c of this.cockroaches) {
      if (c.state === STATES.DEAD || c.state === STATES.SQUISHED) continue;
      const dx = c.x - sourceX;
      const dy = c.y - sourceY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < FEAR_SCATTER_RADIUS && d > 0) {
        c.state = STATES.FLEE;
        c.stateTimer = 0;
        c.stateData = { duration: 1 + Math.random() * 1.5 };
        c.angle = Math.atan2(dy, dx); // flee away from source
        c.speed = 5.5 + Math.random() * 2;
      }
    }
  }

  updateGrowth() {
    const now = Date.now();
    const growthMs = this.babyGrowthMinutes * 60 * 1000;
    this.cockroaches.forEach(c => {
      if (c.isBaby && now - c.birthTime >= growthMs) {
        c.isBaby = false;
        c.radius = 40;
        if (c.state === STATES.BABY) {
          c.state = STATES.IDLE;
        }
      }
    });
  }

  // Remove cockroaches that have been dead long enough or squished long enough
  cleanup() {
    this.cockroaches = this.cockroaches.filter(c => {
      if (c.state === STATES.DEAD && c.stateTimer >= 2) return false;
      if (c.state === STATES.SQUISHED && c.stateTimer >= 3) return false;
      return true;
    });
  }

  getAlive() {
    return this.cockroaches.filter(
      c => c.state !== STATES.DEAD && c.state !== STATES.SQUISHED
    );
  }

  setSettings(maxCount, babyGrowthMinutes) {
    this.maxCount = maxCount;
    this.babyGrowthMinutes = babyGrowthMinutes;
  }

  toJSON() {
    return this.cockroaches
      .filter(c => c.state !== STATES.DEAD && c.state !== STATES.SQUISHED)
      .map(c => c.toJSON());
  }

  loadFromJSON(dataArray) {
    this.cockroaches = dataArray.map(d => Cockroach.fromJSON(d));
  }
}

module.exports = { CockroachManager };
