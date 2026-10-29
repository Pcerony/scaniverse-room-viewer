import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  eyeHeight,
  movement,
  boundPosition,
  createState,
  setMode,
  resetState,
} from "../src/navigation.js";

test("presets are eye heights in meters", () => {
  assert.deepEqual(
    PRESETS.map((p) => p.height),
    [1.15, 1, 1.5, 1.65],
  );
});
test("height is finite and clamped", () => {
  assert.equal(eyeHeight("1.23"), 1.23);
  assert.equal(eyeHeight(9), 2.1);
  assert.equal(eyeHeight(-1), 0.6);
  assert.equal(eyeHeight(NaN), 1.65);
});
test("forward is negative z and diagonal speed is normalized", () => {
  assert.deepEqual(movement(0, 1, 0, 1), { x: 0, z: -1 });
  const d = movement(1, 1, 0, 1);
  assert.ok(Math.abs(Math.hypot(d.x, d.z) - 1) < 1e-9);
  const r = movement(0, 1, Math.PI / 2, 1);
  assert.ok(Math.abs(r.x + 1) < 1e-9);
});
test("bounds retain margin", () => {
  assert.deepEqual(
    boundPosition(
      { x: 5, z: -4 },
      { minX: -2, maxX: 2, minZ: -2, maxZ: 2 },
      0.2,
    ),
    { x: 1.8, z: -1.8 },
  );
});
test("overview preserves walk pose and reset preserves height", () => {
  const s = createState({ x: 1, z: 2, floor: -1, yaw: 0.5 });
  s.height = 1.15;
  s.x = 3;
  s.pitch = 0.4;
  setMode(s, "overview");
  setMode(s, "walk");
  assert.equal(s.x, 3);
  resetState(s);
  assert.equal(s.x, 1);
  assert.equal(s.height, 1.15);
  assert.equal(s.yaw, 0.5);
  assert.equal(s.pitch, 0);
});
