export const PRESETS = [
  { id: "wheelchair", label: "車いす", height: 1.15, icon: "accessibility" },
  { id: "child", label: "子ども", height: 1, icon: "baby" },
  { id: "woman", label: "女性", height: 1.5, icon: "person-standing" },
  { id: "man", label: "男性", height: 1.65, icon: "person-standing" },
];
export function eyeHeight(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.round(Math.max(0.6, Math.min(2.1, n)) * 100) / 100
    : 1.65;
}
export function movement(right, forward, yaw, distance) {
  const length = Math.max(1, Math.hypot(right, forward));
  const r = (right / length) * distance;
  const f = (forward / length) * distance;
  return {
    x: r * Math.cos(yaw) - f * Math.sin(yaw),
    z: -r * Math.sin(yaw) - f * Math.cos(yaw),
  };
}
export function boundPosition(p, b, margin = 0.2) {
  return {
    x: Math.max(b.minX + margin, Math.min(b.maxX - margin, p.x)),
    z: Math.max(b.minZ + margin, Math.min(b.maxZ - margin, p.z)),
  };
}
export function createState(spawn) {
  return {
    ...spawn,
    pitch: 0,
    height: 1.65,
    mode: "walk",
    spawn: { ...spawn },
  };
}
export function setMode(state, mode) {
  if (!["walk", "overview"].includes(mode))
    throw new Error("Unknown view mode");
  state.mode = mode;
}
export function resetState(state) {
  Object.assign(state, state.spawn, { pitch: 0 });
}
