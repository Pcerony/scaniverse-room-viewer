import { Box3, Vector3, Raycaster, DoubleSide } from "three";
import { computeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { boundPosition } from "./navigation.js";

const ray = new Raycaster();
ray.firstHitOnly = true;
const down = new Vector3(0, -1, 0);
const direction = new Vector3();
const origin = new Vector3();

function hit(room, x, y, z, dir, distance) {
  ray.set(origin.set(x, y, z), dir);
  ray.far = distance;
  return ray.intersectObjects(room.meshes, false)[0];
}

export function prepareRoom(object) {
  const meshes = [];
  const histogram = new Map();
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    meshes.push(mesh);
    for (const material of [].concat(mesh.material)) material.side = DoubleSide;
    mesh.raycast = acceleratedRaycast;
    computeBoundsTree.call(mesh.geometry);
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      if (y > box.min.y + (box.max.y - box.min.y) * 0.4) continue;
      const bin = Math.round(y / 0.04);
      histogram.set(bin, (histogram.get(bin) || 0) + 1);
    }
  });
  const floor = [...histogram].sort((a, b) => b[1] - a[1])[0][0] * 0.04;
  const room = {
    object,
    meshes,
    box,
    floor,
    bounds: {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
    },
  };
  // Score open floor rather than the capture origin, which can be next to a wall.
  const candidates = [];
  for (let x = box.min.x + 0.4; x < box.max.x - 0.4; x += 0.35) {
    for (let z = box.min.z + 0.4; z < box.max.z - 0.4; z += 0.35) {
      if (!canOccupy(room, x, z, 1.65, 0.4)) continue;
      const clearances = [];
      for (let i = 0; i < 8; i++) {
        direction.set(
          Math.cos((i * Math.PI) / 4),
          0,
          Math.sin((i * Math.PI) / 4),
        );
        clearances.push(
          hit(room, x, floor + 1, z, direction, 2)?.distance ?? 2,
        );
      }
      const score =
        Math.min(...clearances) * 0.7 +
        (clearances.reduce((a, b) => a + b, 0) / 8) * 0.3;
      candidates.push({ x, z, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) throw new Error("安全な開始位置が見つかりませんでした");
  const spawn = candidates[0];
  let yaw = 0,
    bestView = -1;
  for (let i = 0; i < 32; i++) {
    const angle = (i * Math.PI) / 16;
    direction.set(-Math.sin(angle), 0, -Math.cos(angle));
    const distance =
      hit(room, spawn.x, floor + 1.4, spawn.z, direction, 6)?.distance ?? 6;
    const hasPath = [0.3, 0.6, 0.9, 1.1].every((d) =>
      canOccupy(
        room,
        spawn.x - Math.sin(angle) * d,
        spawn.z - Math.cos(angle) * d,
        1.65,
      ),
    );
    if (hasPath && distance > bestView) {
      bestView = distance;
      yaw = angle;
    }
  }
  room.spawn = { x: spawn.x, z: spawn.z, floor, yaw };
  return room;
}

export function canOccupy(room, x, z, height, radius = 0.19) {
  const b = room.bounds;
  if (
    x < b.minX + radius ||
    x > b.maxX - radius ||
    z < b.minZ + radius ||
    z > b.maxZ - radius
  )
    return false;
  const ground = hit(room, x, room.floor + 0.22, z, down, 0.42);
  if (!ground || Math.abs(ground.point.y - room.floor) > 0.18) return false;
  for (const y of [0.28, Math.min(0.75, height), height]) {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      direction.set(Math.cos(angle), 0, Math.sin(angle));
      if (hit(room, x, room.floor + y, z, direction, radius)) return false;
    }
  }
  return true;
}

export function moveInRoom(room, position, delta, height) {
  const next = boundPosition(
    { x: position.x + delta.x, z: position.z + delta.z },
    room.bounds,
  );
  if (canOccupy(room, next.x, next.z, height)) return next;
  if (canOccupy(room, next.x, position.z, height))
    return { x: next.x, z: position.z };
  if (canOccupy(room, position.x, next.z, height))
    return { x: position.x, z: next.z };
  return { x: position.x, z: position.z };
}
