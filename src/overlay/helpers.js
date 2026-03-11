'use strict';

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

function isNearEdge(x, y, screenW, screenH, margin) {
  return (
    x < margin ||
    x > screenW - margin ||
    y < margin ||
    y > screenH - margin
  );
}

module.exports = { rand, dist, angleTo, normalizeAngle, isNearEdge };
