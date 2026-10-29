export function bindInput({
  viewport,
  joystick,
  stick,
  state,
  isReady,
  onLook,
}) {
  const keys = new Set();
  const input = { right: 0, forward: 0 };
  let movePointer = null;
  let lookPointer = null;
  let lookX = 0;
  let lookY = 0;
  const allowed = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ]);
  const active = () => isReady() && state()?.mode === "walk";
  function clear() {
    keys.clear();
    input.right = 0;
    input.forward = 0;
    movePointer = null;
    lookPointer = null;
    stick.style.transform = "";
  }
  window.addEventListener("keydown", (e) => {
    if (
      !active() ||
      !allowed.has(e.code) ||
      e.target.closest("input,select,textarea,button")
    )
      return;
    e.preventDefault();
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  document.addEventListener("pointerlockchange", clear);
  viewport.addEventListener("pointerdown", (e) => {
    if (
      !active() ||
      (e.pointerType === "mouse" && e.button !== 0) ||
      lookPointer !== null
    )
      return;
    viewport.focus({ preventScroll: true });
    lookPointer = e.pointerId;
    lookX = e.clientX;
    lookY = e.clientY;
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener("pointermove", (e) => {
    if (
      !active() ||
      document.pointerLockElement === viewport ||
      lookPointer !== e.pointerId
    )
      return;
    onLook(e.clientX - lookX, e.clientY - lookY);
    lookX = e.clientX;
    lookY = e.clientY;
  });
  document.addEventListener("mousemove", (e) => {
    if (active() && document.pointerLockElement === viewport)
      onLook(e.movementX, e.movementY);
  });
  function releaseLook(e) {
    if (e.pointerId === lookPointer) lookPointer = null;
  }
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    viewport.addEventListener(event, releaseLook);
  function moveStick(e) {
    const rect = joystick.getBoundingClientRect();
    const radius = rect.width * 0.31;
    const x = (e.clientX - rect.left - rect.width / 2) / radius;
    const y = (e.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.max(1, Math.hypot(x, y));
    input.right = x / length;
    input.forward = -y / length;
    stick.style.transform = `translate(${input.right * radius}px, ${-input.forward * radius}px)`;
  }
  joystick.addEventListener("pointerdown", (e) => {
    if (!active() || movePointer !== null) return;
    e.preventDefault();
    movePointer = e.pointerId;
    viewport.focus({ preventScroll: true });
    joystick.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  joystick.addEventListener("pointermove", (e) => {
    if (e.pointerId === movePointer) moveStick(e);
  });
  function releaseMove(e) {
    if (e.pointerId !== movePointer) return;
    movePointer = null;
    input.right = 0;
    input.forward = 0;
    stick.style.transform = "";
  }
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    joystick.addEventListener(event, releaseMove);
  return {
    clear,
    axes() {
      return {
        right:
          input.right +
          Number(keys.has("KeyD") || keys.has("ArrowRight")) -
          Number(keys.has("KeyA") || keys.has("ArrowLeft")),
        forward:
          input.forward +
          Number(keys.has("KeyW") || keys.has("ArrowUp")) -
          Number(keys.has("KeyS") || keys.has("ArrowDown")),
      };
    },
  };
}
