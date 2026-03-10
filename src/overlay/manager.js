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

  // Spawn 3-5 baby cockroaches at the parent's position, spreading outward
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

  // Check all babies and graduate them to adults if growth time has elapsed
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

  // Remove cockroaches that have been dead long enough (stateTimer >= 2)
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
