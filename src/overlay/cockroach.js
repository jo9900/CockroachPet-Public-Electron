const STATES = {
  IDLE: 'idle',
  PATROL: 'patrol',
  WANDER: 'wander',
  FREEZE: 'freeze',
  DASH: 'dash',
  ALERT: 'alert',
  FLEE: 'flee',
  CURIOUS: 'curious',
  FLIPPED: 'flipped',
  RECOVERING: 'recovering',
  FLYING: 'flying',
  DRAGGED: 'dragged',
  DROPPED: 'dropped',
  DEAD: 'dead',
  BABY: 'baby',
  SPAWNING: 'spawning',
  SQUISHED: 'squished',
  WALL_CRAWL: 'wall_crawl',
  PLAYING_DEAD: 'playing_dead',
  GROOMING: 'grooming',
};

let nextId = 1;

class Cockroach {
  constructor(x, y, isBaby = false) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.state = isBaby ? STATES.BABY : STATES.IDLE;
    this.isBaby = isBaby;
    this.birthTime = Date.now();
    this.legPhase = Math.random() * Math.PI * 2;
    this.antennaPhase = Math.random() * Math.PI * 2;
    this.stateTimer = 0;
    this.stateData = {};
    this.radius = isBaby ? 18 : 40;
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      state: this.state,
      isBaby: this.isBaby,
      birthTime: this.birthTime,
    };
  }

  static fromJSON(data) {
    const cockroach = new Cockroach(data.x, data.y, data.isBaby);
    cockroach.angle = data.angle;
    cockroach.state = data.state;
    cockroach.birthTime = data.birthTime;
    return cockroach;
  }
}

module.exports = { Cockroach, STATES };
