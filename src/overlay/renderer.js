'use strict';

const COLORS = {
  body: '#8B4513',
  bodyHighlight: '#A0582A',
  bodyDark: '#6B3410',
  head: '#6A3010',
  leg: '#6B3812',
  legDetail: '#5A2D0E',
  antenna: '#4A2508',
  eye: '#CC2200',
  pronotum: '#7A3B15',
  pronotumHighlight: '#9A5530',
  wingCase: '#9B5523',
  wingCaseHighlight: '#B06A35',
  wingCaseEdge: '#6A3510',
  wing: 'rgba(180, 140, 100, 0.3)',
  abdomenTip: '#C4956A',
  babyBody: '#C4956A',
  babyLeg: '#A07050',
  belly: '#C49060',
  bellySegment: '#A07848',
};

// Legs: very short, compact, barely extend past body edge
// 2-segment: body-attach → knee → foot
function drawLeg(ctx, ax, ay, kx, ky, fx, fy, color, width) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawAllLegs(ctx, bodyLen, bodyW, color, phase, isBaby) {
  const lw = isBaby ? 0.7 : 1.2;
  const s = isBaby ? 0.5 : 1.0;

  const swA = Math.sin(phase) * 2.5;
  const swB = Math.sin(phase + Math.PI) * 2.5;
  const hw = bodyW * 0.45;

  // Legs are VERY short — knees barely past body edge, feet just a bit further
  // Reference: legs are compact, segmented, with tiny spurs
  const legs = [
    // FRONT pair: short, angled slightly forward
    { side: -1, ay: -bodyLen * 0.24,
      kox: -3.5 * s, koy: -2.5 * s,
      fox: -2 * s, foy: -3 * s,
      group: 'A' },
    { side: 1, ay: -bodyLen * 0.24,
      kox: 3.5 * s, koy: -2.5 * s,
      fox: 2 * s, foy: -3 * s,
      group: 'B' },
    // MID pair: sideways, slightly longer
    { side: -1, ay: -bodyLen * 0.1,
      kox: -5 * s, koy: -0.5 * s,
      fox: -2.5 * s, foy: 2 * s,
      group: 'B' },
    { side: 1, ay: -bodyLen * 0.1,
      kox: 5 * s, koy: -0.5 * s,
      fox: 2.5 * s, foy: 2 * s,
      group: 'A' },
    // REAR pair: angled back, ~90° knee, long downward segment
    { side: -1, ay: bodyLen * 0.02,
      kox: -5 * s, koy: 1 * s,
      fox: 0 * s, foy: 12 * s,
      group: 'A' },
    { side: 1, ay: bodyLen * 0.02,
      kox: 5 * s, koy: 1 * s,
      fox: 0 * s, foy: 12 * s,
      group: 'B' },
  ];

  legs.forEach(leg => {
    const sw = leg.group === 'A' ? swA : swB;
    const ax = leg.side * hw;
    const ay = leg.ay;
    const kx = ax + leg.kox;
    const ky = ay + leg.koy;
    const fx = kx + leg.fox + sw * leg.side * 2;
    const fy = ky + leg.foy + sw * 1.5;
    drawLeg(ctx, ax, ay, kx, ky, fx, fy, color, lw);

    // Tiny leg hairs/spines on tibia (2nd segment)
    if (!isBaby) {
      const mx = (kx + fx) / 2;
      const my = (ky + fy) / 2;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + leg.side * 1.2 * s, my - 0.8 * s);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  });
}

function drawFlippedLegs(ctx, bodyLen, bodyW, color, phase) {
  const pairs = [
    { ay: -bodyLen * 0.24 },
    { ay: -bodyLen * 0.1 },
    { ay: bodyLen * 0.02 },
  ];
  pairs.forEach((p, i) => {
    [-1, 1].forEach(side => {
      const t = phase * 3 + i * 1.2 + side * 0.8;
      const ax = side * bodyW * 0.4;
      const kx = ax + side * (4 + Math.sin(t * 1.3) * 2);
      const ky = p.ay - 2 + Math.cos(t) * 2;
      const fx = kx + side * (2 + Math.sin(t * 0.9) * 2);
      const fy = ky - 4 + Math.sin(t * 1.7) * 3;
      drawLeg(ctx, ax, p.ay, kx, ky, fx, fy, color, 1.2);
    });
  });
}

// Long whip-like antenna — longer than body, graceful outward arc
function drawWhipAntenna(ctx, sx, sy, baseAngle, length, phase, color, isBaby, isAlert) {
  const segs = 14;
  const segLen = length / segs;
  const points = [{ x: sx, y: sy }];
  let x = sx, y = sy, angle = baseAngle;

  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    // Gentle outward arc that increases, then slight inward curve at tip
    const curve = t < 0.7
      ? t * 0.12          // outward curve, gentle
      : (0.7 * 0.12) - (t - 0.7) * 0.08; // slight return at tip
    // Organic sway — more at tip
    const swayAmt = 0.01 + t * t * 0.12;
    const freq = isAlert ? 2.5 : 1.2;
    const sway = Math.sin(phase * freq + i * 0.5) * swayAmt;
    angle += curve + sway;
    x += Math.cos(angle) * segLen;
    y += Math.sin(angle) * segLen;
    points.push({ x, y });
  }

  // Tapered drawing: multiple passes
  const maxW = isBaby ? 0.8 : 1.5;
  const minW = isBaby ? 0.15 : 0.25;

  // Full thin
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.strokeStyle = color;
  ctx.lineWidth = minW;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Thicker base passes
  [0.65, 0.4, 0.2].forEach((frac, pi) => {
    const endI = Math.floor(segs * frac);
    const w = minW + (maxW - minW) * ((pi + 1) / 3);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i <= endI; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.lineWidth = w;
    ctx.stroke();
  });
}

function drawAntennae(ctx, headX, headY, headR, len, phase, alertAngle, isBaby) {
  const color = isBaby ? COLORS.babyLeg : COLORS.antenna;
  const isAlert = alertAngle !== null;
  const sway = Math.sin(phase * 0.6) * 0.04;
  const sy = headY - headR + 1;

  let lA, rA;
  if (isAlert) {
    lA = alertAngle - 0.2 + sway;
    rA = alertAngle + 0.2 - sway;
  } else {
    // Forward, spreading outward — matching reference
    lA = -Math.PI / 2 - 0.35 + sway;
    rA = -Math.PI / 2 + 0.35 - sway;
  }

  drawWhipAntenna(ctx, headX - 2, sy, lA, len, phase, color, isBaby, isAlert);
  drawWhipAntenna(ctx, headX + 2, sy, rA, len, phase + 1.5, color, isBaby, isAlert);
}

function drawPoopDot(ctx, x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#4A2508';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 0.3, y - 0.3, 0.8, 0, Math.PI * 2);
  ctx.fillStyle = '#6B3812';
  ctx.globalAlpha = alpha * 0.6;
  ctx.fill();
  ctx.restore();
}

function drawSquished(ctx, cx, cy, scale, angle, progress) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Flatten over time: scaleY goes from 1.0 to 0.2
  const squishY = Math.max(0.15, 1.0 - progress * 2.5);
  const squishX = 1.0 + (1.0 - squishY) * 0.6; // wider as it flattens
  ctx.scale(scale * squishX, scale * squishY);

  // Splat body
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 40, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5A2D0E';
  ctx.fill();

  // Goo splatter
  if (progress > 0.2) {
    const splatAlpha = Math.min(1, (progress - 0.2) * 2);
    ctx.globalAlpha = splatAlpha * 0.7;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + 0.3;
      const r = 18 + Math.sin(i * 2.7) * 8;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3 + Math.sin(i) * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#8B4513';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Legs sticking out (flattened)
  ctx.strokeStyle = '#6B3812';
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const yOff = (i % 3 - 1) * 14;
    ctx.beginPath();
    ctx.moveTo(side * 10, yOff);
    ctx.lineTo(side * (20 + Math.sin(i) * 4), yOff + Math.cos(i) * 3);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCockroach(ctx, cx, cy, scale, opts = {}) {
  const {
    angle = 0, legPhase = 0, antennaPhase = 0,
    isBaby = false, isFlipped = false, isFlying = false,
    alertAngle = null, isPlayingDead = false, isGrooming = false,
    groomPhase = 0,
  } = opts;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  if (isFlipped) ctx.scale(-1, 1);

  // Body proportions: large body, small legs
  const bodyLen = 42, bodyW = 20, headR = 5.5;
  const legColor = isBaby ? COLORS.babyLeg : COLORS.leg;

  // Flying shadow
  if (isFlying) {
    ctx.save();
    ctx.translate(3, 7);
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(0, 2, bodyW * 0.6, bodyLen * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
  }

  // === LEGS (behind body) ===
  if (isPlayingDead) {
    // Legs curled inward (playing dead posture)
    drawFlippedLegs(ctx, bodyLen, bodyW, legColor, 0);
  } else if (!isFlipped) {
    drawAllLegs(ctx, bodyLen, bodyW, legColor, legPhase, isBaby);
    // Grooming: front leg reaches up to antenna
    if (isGrooming && !isBaby) {
      const gp = groomPhase;
      const reach = Math.sin(gp) * 0.5 + 0.5; // 0-1
      const side = Math.sin(gp * 0.3) > 0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(side * bodyW * 0.35, -bodyLen * 0.24);
      ctx.quadraticCurveTo(
        side * (bodyW * 0.2 + reach * 4), -bodyLen * 0.35 - reach * 8,
        side * 3, -bodyLen * 0.42 - reach * 6
      );
      ctx.strokeStyle = legColor;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // === CERCI ===
  if (!isBaby) {
    ctx.strokeStyle = legColor;
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, bodyLen * 0.42);
    ctx.quadraticCurveTo(-4, bodyLen * 0.50, -3, bodyLen * 0.56);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, bodyLen * 0.42);
    ctx.quadraticCurveTo(4, bodyLen * 0.50, 3, bodyLen * 0.56);
    ctx.stroke();
  }

  // === BODY ===
  if (isFlipped) {
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyW * 0.46, bodyLen * 0.46, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.belly;
    ctx.fill();
    for (let i = -3; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.38, i * 4.5);
      ctx.lineTo(bodyW * 0.38, i * 4.5);
      ctx.strokeStyle = COLORS.bellySegment;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    drawFlippedLegs(ctx, bodyLen, bodyW, legColor, legPhase);
  } else {
    // Abdomen — large oval
    ctx.beginPath();
    ctx.ellipse(0, 4, bodyW * 0.47, bodyLen * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = isBaby ? COLORS.babyBody : COLORS.body;
    ctx.fill();

    // Abdomen tip lighter color
    if (!isBaby) {
      ctx.beginPath();
      ctx.ellipse(0, bodyLen * 0.32, bodyW * 0.25, bodyLen * 0.12, 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.abdomenTip;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Flying wings
    if (isFlying) {
      const spread = 0.7 + Math.sin(Date.now() * 0.02) * 0.12;
      ctx.save();
      ctx.translate(-2, -bodyLen * 0.08);
      ctx.rotate(-spread * 0.5);
      ctx.beginPath();
      ctx.ellipse(-bodyW * 0.2, bodyLen * 0.05, bodyW * 0.6, bodyLen * 0.4, -0.1, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.wing;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(2, -bodyLen * 0.08);
      ctx.rotate(spread * 0.5);
      ctx.beginPath();
      ctx.ellipse(bodyW * 0.2, bodyLen * 0.05, bodyW * 0.6, bodyLen * 0.4, 0.1, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.wing;
      ctx.fill();
      ctx.restore();
    }

    // Wing cases — two overlapping ovals with seam
    if (!isBaby) {
      // Left case
      ctx.beginPath();
      ctx.ellipse(-0.8, 6, bodyW * 0.35, bodyLen * 0.36, -0.03, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.wingCase;
      ctx.fill();
      // Highlight on left case
      ctx.beginPath();
      ctx.ellipse(-3, 0, bodyW * 0.12, bodyLen * 0.22, -0.05, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.wingCaseHighlight;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Right case
      ctx.beginPath();
      ctx.ellipse(0.8, 6, bodyW * 0.35, bodyLen * 0.36, 0.03, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.wingCase;
      ctx.fill();
      // Highlight on right case
      ctx.beginPath();
      ctx.ellipse(3, 0, bodyW * 0.12, bodyLen * 0.22, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.wingCaseHighlight;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Center seam
      ctx.beginPath();
      ctx.moveTo(0, -bodyLen * 0.12);
      ctx.lineTo(0, bodyLen * 0.36);
      ctx.strokeStyle = COLORS.wingCaseEdge;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Pronotum — blends into wing cases, same color family
    ctx.beginPath();
    ctx.ellipse(0, -bodyLen * 0.18, bodyW * 0.42, bodyLen * 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = isBaby ? COLORS.babyBody : COLORS.wingCase;
    ctx.fill();
    // Subtle highlight only
    if (!isBaby) {
      ctx.beginPath();
      ctx.ellipse(0, -bodyLen * 0.21, bodyW * 0.18, bodyLen * 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.wingCaseHighlight;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // === HEAD (partially under pronotum) ===
  const headY = -bodyLen * 0.38;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = isBaby ? COLORS.babyBody : COLORS.head;
  ctx.fill();

  // Eyes — small
  ctx.fillStyle = COLORS.eye;
  ctx.beginPath(); ctx.arc(-3, headY - 0.5, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, headY - 0.5, 1, 0, Math.PI * 2); ctx.fill();

  // === ANTENNAE — very long, whip-like ===
  // Longer than body length
  const aLen = isBaby ? 22 : 48;
  drawAntennae(ctx, 0, headY, headR, aLen, antennaPhase, alertAngle, isBaby);

  ctx.restore();
}

module.exports = { drawCockroach, drawSquished, drawPoopDot, COLORS };
