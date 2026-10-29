async (page) => {
  const results = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  await page.setViewportSize({ width: 1280, height: 720 });
  const desktop = await page.context().newCDPSession(page);
  await desktop.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await page.unrouteAll();
  for (const [pattern, expected] of [
    ["**/*room-texture*", "テクスチャを読み込めませんでした"],
    ["**/*.obj*", "モデルを読み込めませんでした"],
  ]) {
    await page.route(pattern, (route) =>
      route.request().resourceType() === "script"
        ? route.continue()
        : route.abort(),
    );
    await page.goto("http://localhost:5173");
    await page
      .getByRole("button", { name: "再読み込み", exact: true })
      .waitFor({ state: "visible" });
    check(
      (await page.locator("#loading-detail").textContent()).includes(expected),
      `failed resource shows actionable ${expected} message`,
    );
    check(
      await page
        .getByRole("button", { name: "ウォーク", exact: true })
        .isDisabled(),
      "failed loading disables scene controls",
    );
    await page.unroute(pattern);
    await page.getByRole("button", { name: "再読み込み", exact: true }).click();
    await page.waitForFunction(
      () => window.__room && document.querySelector("#loading").hidden,
    );
    check(
      await page.getByRole("button", { name: "ウォーク", exact: true }).isEnabled(),
      "retry recovers actual scene",
    );
  }
  await page.evaluate(() => {
    document.querySelector("#app").requestFullscreen = undefined;
  });
  await page.getByRole("button", { name: "全画面表示", exact: true }).click();
  check(
    (await page.locator("#toast").textContent()).includes("この"),
    "unsupported fullscreen has a fallback",
  );
  await page.evaluate(() => {
    document.querySelector("#viewport").requestPointerLock = undefined;
  });
  await page.getByRole("button", { name: "マウス視点を固定", exact: true }).click();
  check(
    (await page.locator("#toast").textContent()).includes("この"),
    "unsupported pointer lock has a drag fallback",
  );
  await page.keyboard.down("w");
  await page.getByRole("button", { name: "全体表示", exact: true }).click();
  await page.getByRole("button", { name: "ウォーク", exact: true }).click();
  const before = await page.evaluate(() => ({
    x: window.__room.state.x,
    z: window.__room.state.z,
  }));
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    x: window.__room.state.x,
    z: window.__room.state.z,
  }));
  await page.keyboard.up("w");
  check(
    before.x === after.x && before.z === after.z,
    "mode switching clears held movement",
  );
  let releaseModel;
  let markRequested;
  const modelRequested = new Promise((resolve) => { markRequested = resolve; });
  const modelGate = new Promise((resolve) => { releaseModel = resolve; });
  await page.route("**/*.obj", async (route) => { markRequested(); await modelGate; await route.continue(); });
  await page.reload();
  await modelRequested;
  await page.locator("canvas").waitFor();
  await page.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    gl.getExtension("WEBGL_lose_context").loseContext();
  });
  await page.getByRole("button", { name: "再読み込み", exact: true }).waitFor({ state: "visible" });
  const response = page.waitForResponse((r) => r.url().endsWith(".obj") && r.status() === 200);
  releaseModel();
  await (await response).finished();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  check(await page.getByRole("button", { name: "再読み込み", exact: true }).isVisible(), "context loss during startup cannot be hidden by late model load");
  check(await page.getByRole("button", { name: "ウォーク", exact: true }).isDisabled(), "context loss keeps navigation disabled");
  await page.unroute("**/*.obj");
  await page.reload();
  await page.waitForFunction(
    () => window.__room && document.querySelector("#loading").hidden,
  );
  await desktop.detach();
  return { results };
}
