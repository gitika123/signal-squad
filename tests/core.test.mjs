import test from "node:test";
import assert from "node:assert/strict";
import {
  circlesOverlap,
  deliveryScore,
  formatScore,
  formatTime,
  generatePartyCode,
  normalize,
  streakMultiplier,
} from "../dist/core.js";

test("formats round time without exposing negative values", () => {
  assert.equal(formatTime(75), "01:15");
  assert.equal(formatTime(-2), "00:00");
});

test("normalizes movement vectors for consistent diagonal speed", () => {
  const vector = normalize({ x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(vector.x, vector.y) - 1) < 0.00001);
  assert.deepEqual(normalize({ x: 0, y: 0 }), { x: 0, y: 0 });
});

test("detects circle collisions at the gameplay boundary", () => {
  assert.equal(circlesOverlap({ x: 0, y: 0, radius: 10 }, { x: 15, y: 0, radius: 6 }), true);
  assert.equal(circlesOverlap({ x: 0, y: 0, radius: 10 }, { x: 30, y: 0, radius: 6 }), false);
});

test("caps the delivery streak multiplier to keep scoring balanced", () => {
  assert.equal(streakMultiplier(0), 1);
  assert.equal(streakMultiplier(8), 5);
  assert.equal(streakMultiplier(50), 5);
  assert.equal(deliveryScore(3, 4), 900);
  assert.equal(formatScore(35), "0035");
});

test("generates readable deterministic party codes", () => {
  assert.equal(generatePartyCode(() => 0), "AAAA");
  assert.match(generatePartyCode(() => 0.999), /^[A-HJ-NP-Z2-9]{4}$/);
});
