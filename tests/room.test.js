import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { prepareRoom, canOccupy, moveInRoom } from "../src/room.js";

const source = readFileSync(
  new URL(
    "../Scaniverse 2026-10-13 210522/Scaniverse_2026_10_13_210522.obj",
    import.meta.url,
  ),
  "utf8",
);
test("real scan has a floor-level, unobstructed spawn and stable collision", () => {
  const object = new OBJLoader().parse(source);
  const room = prepareRoom(object);
  assert.ok(Math.abs(room.floor - 0.03) < 0.08, `floor ${room.floor}`);
  assert.ok(canOccupy(room, room.spawn.x, room.spawn.z, 1.65));
  let forward = { ...room.spawn };
  for (let i = 0; i < 25; i++)
    forward = moveInRoom(
      room,
      forward,
      {
        x: -Math.sin(room.spawn.yaw) * 0.04,
        z: -Math.cos(room.spawn.yaw) * 0.04,
      },
      1.65,
    );
  assert.ok(
    Math.hypot(forward.x - room.spawn.x, forward.z - room.spawn.z) > 0.8,
    "spawn faces a walkable open area",
  );
  assert.ok(!canOccupy(room, 100, 100, 1.65));
  let p = { ...room.spawn };
  for (let i = 0; i < 1000; i++)
    p = moveInRoom(room, p, { x: 0.04, z: 0 }, 1.65);
  assert.ok(p.x < room.bounds.maxX);
  assert.ok(p.x > room.spawn.x, "room allows actual movement");
  assert.ok(canOccupy(room, p.x, p.z, 1.65));
  console.log(
    "calibration",
    JSON.stringify({
      floor: room.floor,
      spawn: room.spawn,
      bounds: room.bounds,
      final: p,
    }),
  );
});
