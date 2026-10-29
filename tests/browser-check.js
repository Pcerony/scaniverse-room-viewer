async (page) => {
  const results = [];
  const errors = [];
  const onError = (error) => errors.push(error.message);
  const onConsole = (message) => { if (message.type() === "error") errors.push(message.text()); };
  page.on("pageerror", onError);
  page.on("console", onConsole);
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  await page.setViewportSize({ width: 1280, height: 720 });
  const desktop = await page.context().newCDPSession(page);
  await desktop.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await page.goto("http://localhost:5173");
  await page.waitForFunction(
    () => window.__room && document.querySelector("#loading").hidden,
  );
  const pose = () => page.evaluate(() => ({ ...window.__room.state }));
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  const initial = await pose();
  const render = await page.evaluate(() => {
    const { renderer, scene, camera, room } = window.__room;
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const pixels = new Uint8Array(64 * 64 * 4);
    gl.readPixels(
      Math.floor(gl.drawingBufferWidth / 2) - 32,
      Math.floor(gl.drawingBufferHeight / 2) - 32,
      64,
      64,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 4)
      colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    return {
      colors: colors.size,
      triangles: renderer.info.render.triangles,
      texture: room.meshes[0].material.map.image.width,
      error: gl.getError(),
    };
  });
  check(
    render.colors > 100 &&
      render.triangles > 100000 &&
      render.texture === 4096 &&
      render.error === 0,
    "actual textured canvas renders nonblank pixels",
  );
  for (const [label, height] of [
    ["車いす", 1.15],
    ["子ども", 1],
    ["女性", 1.5],
    ["男性", 1.65],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await settle();
    const actual = await page.evaluate(() => ({
      height: window.__room.state.height,
      y: window.__room.camera.position.y,
      floor: window.__room.state.floor,
      x: window.__room.state.x,
      z: window.__room.state.z,
    }));
    check(
      actual.height === height &&
        Math.abs(actual.y - actual.floor - height) < 1e-8 &&
        actual.x === initial.x &&
        actual.z === initial.z,
      `${label} changes only eye height`,
    );
  }
  await page.getByRole("slider").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  check((await pose()).height === 0.61, "custom slider keyboard input works");
  await page.getByRole("button", { name: "男性", exact: true }).click();
  for (const key of [
    "w",
    "s",
    "a",
    "d",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ]) {
    await page.getByRole("button", { name: "開始位置に戻る", exact: true }).click();
    const before = await pose();
    await page.keyboard.down(key);
    await page.waitForTimeout(250);
    await page.keyboard.up(key);
    const after = await pose();
    check(
      Math.hypot(after.x - before.x, after.z - before.z) > 0.08,
      `keyboard ${key} moves camera`,
    );
  }
  await page.getByRole("button", { name: "開始位置に戻る", exact: true }).click();
  const beforeDrag = await pose();
  await page.mouse.move(620, 300);
  await page.mouse.down();
  await page.mouse.move(740, 350, { steps: 8 });
  await page.mouse.up();
  const afterDrag = await pose();
  check(
    Math.abs(afterDrag.yaw - beforeDrag.yaw) > 0.2 &&
      Math.abs(afterDrag.pitch) > 0.05,
    "mouse drag turns yaw and pitch",
  );
  await page.getByRole("button", { name: "全体表示", exact: true }).click();
  check(
    (await pose()).mode === "overview" &&
      !(await page.getByRole("slider").isVisible()),
    "overview hides walk controls",
  );
  const overviewBefore = await page.evaluate(() =>
    window.__room.camera.position.toArray(),
  );
  await page.mouse.move(600, 300);
  await page.mouse.down();
  await page.mouse.move(750, 380, { steps: 8 });
  await page.mouse.up();
  await settle();
  const overviewAfter = await page.evaluate(() =>
    window.__room.camera.position.toArray(),
  );
  check(
    overviewAfter.some((n, i) => Math.abs(n - overviewBefore[i]) > 0.1),
    "orbit drag changes overview camera",
  );
  await page.mouse.wheel(0, -250);
  await page.waitForTimeout(200);
  const zoomed = await page.evaluate(() =>
    window.__room.camera.position.toArray(),
  );
  check(
    zoomed.some((n, i) => Math.abs(n - overviewAfter[i]) > 0.1),
    "overview zoom works",
  );
  await page.getByRole("button", { name: "ウォーク", exact: true }).click();
  const resumed = await pose();
  check(
    resumed.x === afterDrag.x &&
      resumed.z === afterDrag.z &&
      resumed.yaw === afterDrag.yaw,
    "mode switching restores walk pose",
  );
  await page.getByRole("button", { name: "車いす", exact: true }).click();
  await page.getByRole("button", { name: "開始位置に戻る", exact: true }).click();
  const reset = await pose();
  check(
    reset.x === initial.x &&
      reset.z === initial.z &&
      reset.yaw === initial.yaw &&
      reset.pitch === 0 &&
      reset.height === 1.15,
    "reset restores spawn while preserving height",
  );
  await page.keyboard.down("w");
  await page.waitForTimeout(80);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurred = await pose();
  await page.waitForTimeout(200);
  await page.keyboard.up("w");
  const stopped = await pose();
  check(
    blurred.x === stopped.x && blurred.z === stopped.z,
    "focus loss stops movement",
  );
  await page.getByRole("button", { name: "目線の高さ", exact: true }).click();
  check(
    !(await page.getByRole("slider").isVisible()),
    "height panel collapses",
  );
  await page.getByRole("button", { name: "目線の高さ", exact: true }).click();
  await page.getByRole("button", { name: "マウス視点を固定", exact: true }).click();
  await page.waitForFunction(() => document.pointerLockElement);
  const locked = await pose();
  await page.keyboard.down("w");
  await page.waitForTimeout(150);
  await page.keyboard.up("w");
  const lockedMoved = await pose();
  check(
    Math.hypot(lockedMoved.x - locked.x, lockedMoved.z - locked.z) > 0.03,
    "pointer lock supports keyboard movement",
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.pointerLockElement);
  await page.getByRole("button", { name: "全画面表示", exact: true }).click();
  await page.waitForFunction(() => document.fullscreenElement);
  check(
    await page.evaluate(() => !!document.fullscreenElement),
    "fullscreen enters",
  );
  await page.evaluate(() => document.exitFullscreen());
  await page.getByRole("button", { name: "男性", exact: true }).click();
  await page.getByRole("button", { name: "開始位置に戻る", exact: true }).click();
  await desktop.detach();
  page.off("pageerror", onError);
  page.off("console", onConsole);
  check(errors.length === 0, `normal navigation has no console or page errors: ${JSON.stringify(errors)}`);
  return { results, render };
}
