import "./style.css";
import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createIcons,
  Scan,
  Footprints,
  Box,
  LocateFixed,
  MousePointer2,
  Maximize,
  Ruler,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Accessibility,
  Baby,
  PersonStanding,
  CircleHelp, Keyboard, Mouse, Move, Hand, ArrowRight,
} from "lucide";
import objUrl from "../Scaniverse 2026-10-13 210522/Scaniverse_2026_10_13_210522.obj?url";
import mtlSource from "../Scaniverse 2026-10-13 210522/Scaniverse_2026_10_13_210522.mtl?raw";
import textureUrl from "../assets/room-texture.jpg";
import {
  PRESETS,
  eyeHeight,
  movement,
  createState,
  setMode,
  resetState,
} from "./navigation.js";
import { prepareRoom, moveInRoom } from "./room.js";
import { bindInput } from "./input.js";
import { createLoadProgress, fetchBytes } from "./load-progress.js";
import scanSizes from "../assets/scan-sizes.json";

const $ = (id) => document.getElementById(id);
const app = $("app");
const viewport = $("viewport");
const icons = {
  Scan,
  Footprints,
  Box,
  LocateFixed,
  MousePointer2,
  Maximize,
  Ruler,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Accessibility,
  Baby,
  PersonStanding,
  CircleHelp, Keyboard, Mouse, Move, Hand, ArrowRight,
};
$("presets").innerHTML = PRESETS.map(
  (p) =>
    `<button class="preset" data-preset="${p.id}" aria-pressed="${p.id === "man"}" title="${p.label} · 目線の高さ ${p.height.toFixed(2)} m"><i data-lucide="${p.icon}"></i><span>${p.label}</span></button>`,
).join("");
createIcons({ icons });

let renderer,
  orbit,
  room,
  state,
  ready = false;
let roomMaterial;
let startupFailed = false;
let toastTimer;
const loadProgress = createLoadProgress(scanSizes, percent => {
  if (startupFailed) return;
  $("progress").style.width = `${percent}%`;
  $("progress-value").textContent = `${percent}%`;
  $("load-progress").setAttribute("aria-valuenow", String(percent));
});
const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const scene = new THREE.Scene();
scene.background = new THREE.Color("#dce2df");
const camera = new THREE.PerspectiveCamera(72, 1, 0.04, 100);
camera.rotation.order = "YXZ";
const buttons = [
  ...document.querySelectorAll(
    ".topbar button, .height-panel button, .height-panel input",
  ),
];
buttons.forEach((b) => (b.disabled = true));
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3500);
}
function fail(error) {
  startupFailed = true;
  ready = false;
  input.clear();
  buttons.forEach((b) => (b.disabled = true));
  $("loading").hidden = false;
  $("loading").setAttribute("role", "alert");
  $("loading-title").textContent = "読み込めませんでした";
  $("loading-detail").textContent =
    error.message || "ブラウザの3D表示への対応をご確認ください";
  $("retry").hidden = false;
  console.error(error);
}
const input = bindInput({
  viewport,
  joystick: $("joystick"),
  stick: $("stick"),
  state: () => state,
  isReady: () => ready,
  onLook(dx, dy) {
    state.yaw -= dx * 0.003;
    state.pitch = THREE.MathUtils.clamp(state.pitch - dy * 0.003, -1.35, 1.35);
  },
});
const tutorial = $("tutorial");
function selectGuide(mobile) {
  $("desktop-guide").hidden = mobile;
  $("mobile-guide").hidden = !mobile;
  $("guide-desktop").setAttribute("aria-pressed", String(!mobile));
  $("guide-mobile").setAttribute("aria-pressed", String(mobile));
}
function showGuide() {
  input.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  selectGuide(matchMedia("(pointer: coarse)").matches || innerWidth <= 700);
  tutorial.showModal();
  $("start-guide").focus();
}
$("guide-desktop").onclick = () => selectGuide(false);
$("guide-mobile").onclick = () => selectGuide(true);
$("help").onclick = showGuide;
$("start-guide").onclick = () => tutorial.close();
tutorial.addEventListener("close", () => { input.clear(); viewport.focus({ preventScroll: true }); });

function walkCamera() {
  camera.position.set(state.x, state.floor + state.height, state.z);
  camera.rotation.set(state.pitch, state.yaw, 0, "YXZ");
}
function overviewCamera() {
  const center = room.box.getCenter(new THREE.Vector3());
  const size = room.box.getSize(new THREE.Vector3());
  const radius = size.length() / 2;
  const fov = Math.min(
    (camera.fov * Math.PI) / 180,
    2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect),
  );
  const distance = (radius / Math.sin(fov / 2)) * 1.08;
  orbit.target.copy(center);
  camera.position
    .copy(center)
    .addScaledVector(new THREE.Vector3(0.75, 1.1, 1).normalize(), distance);
  camera.lookAt(center);
  orbit.minDistance = 1;
  orbit.maxDistance = distance * 2.5;
  orbit.update();
}
function switchMode(mode) {
  if (!ready) return;
  input.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  setMode(state, mode);
  app.dataset.mode = mode;
  $("walk").setAttribute("aria-pressed", String(mode === "walk"));
  $("overview").setAttribute("aria-pressed", String(mode === "overview"));
  orbit.enabled = mode === "overview";
  roomMaterial.clippingPlanes =
    mode === "overview"
      ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), room.floor + 1.8)]
      : [];
  if (mode === "overview") overviewCamera();
  else walkCamera();
  viewport.focus({ preventScroll: true });
}
function updateHeight(value) {
  state.height = eyeHeight(value);
  $("height").value = state.height;
  $("height-value").innerHTML = `${state.height.toFixed(2)} <small>m</small>`;
  $("height").setAttribute("aria-valuetext", `${state.height.toFixed(2)} メートル`);
  document
    .querySelectorAll("[data-preset]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(
          PRESETS.find((p) => p.id === button.dataset.preset).height ===
            state.height,
        ),
      ),
    );
}
$("walk").onclick = () => switchMode("walk");
$("overview").onclick = () => switchMode("overview");
$("reset").onclick = () => {
  input.clear();
  resetState(state);
  if (state.mode === "overview") overviewCamera();
  else walkCamera();
  toast("開始位置に戻りました");
  viewport.focus({ preventScroll: true });
};
$("height-toggle").onclick = () => {
  const expanded = $("height-toggle").getAttribute("aria-expanded") === "true";
  $("height-toggle").setAttribute("aria-expanded", String(!expanded));
  $("height-body").hidden = expanded;
};
$("height").oninput = (e) => updateHeight(e.target.value);
$("presets").onclick = (e) => {
  const preset = PRESETS.find(
    (p) => p.id === e.target.closest("[data-preset]")?.dataset.preset,
  );
  if (preset) {
    updateHeight(preset.height);
    viewport.focus({ preventScroll: true });
  }
};
$("lock").onclick = async () => {
  if (document.pointerLockElement) return document.exitPointerLock();
  if (!viewport.requestPointerLock || !window.isSecureContext)
    return toast("この環境ではマウス視点を固定できません。ドラッグで操作してください");
  viewport.focus({ preventScroll: true });
  try {
    await viewport.requestPointerLock();
  } catch {
    toast("マウス視点を固定できませんでした。ドラッグで操作してください");
  }
};
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === viewport;
  app.classList.toggle("immersive", locked);
  $("lock").setAttribute("aria-pressed", String(locked));
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && document.pointerLockElement)
    document.exitPointerLock();
});
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (app.requestFullscreen) await app.requestFullscreen();
    else toast("このブラウザは全画面表示に対応していません。横向きでも閲覧できます");
    viewport.focus({ preventScroll: true });
  } catch {
    toast("全画面表示に切り替えられませんでした");
  }
};
document.addEventListener("fullscreenchange", () =>
  $("fullscreen").setAttribute(
    "aria-pressed",
    String(Boolean(document.fullscreenElement)),
  ),
);
$("retry").onclick = () => location.reload();

function resize() {
  if (!renderer) return;
  const { width, height } = viewport.getBoundingClientRect();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (ready && state.mode === "overview") overviewCamera();
}
new ResizeObserver(resize).observe(viewport);

async function start() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  viewport.append(renderer.domElement);
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fail(new Error("3D表示が中断されました。再読み込みしてください"));
  });
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enabled = false;
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  resize();
  const [textureBytes, modelBytes] = await Promise.all([
    fetchBytes(textureUrl, bytes => loadProgress.bytes('texture', bytes)).catch(() => {
      throw new Error("テクスチャを読み込めませんでした。接続を確認して再試行してください");
    }),
    fetchBytes(objUrl, bytes => loadProgress.bytes('model', bytes)).catch(() => {
      throw new Error("モデルを読み込めませんでした。接続を確認して再試行してください");
    }),
  ]);
  if (startupFailed) return;
  $("loading-detail").textContent = "テクスチャを展開しています";
  loadProgress.stage(92);
  await paint();
  const blobUrl = URL.createObjectURL(new Blob([textureBytes], { type: 'image/jpeg' }));
  let texture;
  try {
    texture = await new THREE.TextureLoader().loadAsync(blobUrl);
  } catch {
    throw new Error("テクスチャを展開できませんでした。再読み込みしてください");
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
  if (startupFailed) return;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  $("loading-detail").textContent = "3Dモデルを解析しています";
  loadProgress.stage(94);
  await paint();
  if (startupFailed) return;
  const object = new OBJLoader().parse(new TextDecoder().decode(modelBytes));
  if (startupFailed) return;
  $("loading-detail").textContent = "床面と開始位置を準備しています";
  loadProgress.stage(97);
  await paint();
  if (startupFailed) return;
  const materials = new MTLLoader().parse(
    mtlSource.replace(/^map_Kd\s+.*$/m, ""),
    "",
  );
  const original = materials.create("main");
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: original.color,
    side: THREE.DoubleSide,
  });
  roomMaterial = material;
  original.dispose();
  object.traverse((mesh) => {
    if (mesh.isMesh) {
      mesh.material.dispose();
      mesh.material = material;
    }
  });
  room = prepareRoom(object);
  scene.add(object);
  state = createState(room.spawn);
  ready = true;
  updateHeight(state.height);
  walkCamera();
  buttons.forEach((b) => (b.disabled = false));
  loadProgress.stage(100);
  $("loading").hidden = true;
  showGuide();
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.04);
    last = now;
    if (!ready) return;
    if (state.mode === "walk") {
      const { right, forward } = input.axes();
      if (right || forward)
        Object.assign(
          state,
          moveInRoom(
            room,
            state,
            movement(right, forward, state.yaw, 1.2 * dt),
            state.height,
          ),
        );
      walkCamera();
    } else orbit.update();
    renderer.render(scene, camera);
  });
  // Local diagnostics expose state without adding controls to the visitor interface.
  if (import.meta.env.DEV)
    window.__room = { state, camera, room, renderer, input, scene };
}
start().catch(fail);
