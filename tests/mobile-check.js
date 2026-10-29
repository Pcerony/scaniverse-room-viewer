async (page) => {
  const results = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:5173");
  await page.waitForFunction(
    () => window.__room && document.querySelector("#loading").hidden,
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const tap = async (locator) => {
    const b = await locator.boundingBox();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 4 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  const pose = () => page.evaluate(() => ({ ...window.__room.state }));
  const rect = await page.locator("#joystick").boundingBox();
  const start = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    id: 1,
  };
  const before = await pose();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  });
  const moving = { ...start, y: start.y - 32 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [moving],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [moving, { x: 280, y: 300, id: 2 }],
  });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [moving, { x: 280 - i * 9, y: 300 + i * 3, id: 2 }],
    });
    await page.waitForTimeout(40);
  }
  const during = await pose();
  check(
    Math.hypot(during.x - before.x, during.z - before.z) > 0.1,
    "real touch joystick moves camera",
  );
  check(
    Math.abs(during.yaw - before.yaw) > 0.1 && Math.abs(during.pitch) > 0.02,
    "second touch turns view while moving",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await page.waitForTimeout(100);
  const cancelled = await pose();
  await page.waitForTimeout(200);
  const stopped = await pose();
  check(
    cancelled.x === stopped.x && cancelled.z === stopped.z,
    "touch cancellation stops movement",
  );
  await tap(page.getByRole("button", { name: "子ども", exact: true }));
  check((await pose()).height === 1, "mobile preset tap works");
  await tap(page.getByRole("button", { name: "開始位置に戻る", exact: true }));
  await page.screenshot({ path: "output/playwright/mobile-portrait.png" });
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    const layout = await page.evaluate(() => {
      const visible = (e) =>
        e.getBoundingClientRect().width > 0 &&
        e.getBoundingClientRect().height > 0;
      const outside = [
        ...document.querySelectorAll(
          ".topbar button,.height-panel button,.height-panel input,.joystick",
        ),
      ]
        .filter(visible)
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.left < 0 ||
            r.right > innerWidth + 1 ||
            r.top < 0 ||
            r.bottom > innerHeight + 1
          );
        })
        .map((e) => e.id || e.textContent);
      const overlap = (a, b) => {
        const x = a.getBoundingClientRect(),
          y = b.getBoundingClientRect();
        return (
          visible(a) &&
          visible(b) &&
          x.left < y.right &&
          x.right > y.left &&
          x.top < y.bottom &&
          x.bottom > y.top
        );
      };
      const headings = [...document.querySelector(".topbar").children];
      const topOverlaps = headings.some((a, i) =>
        headings.slice(i + 1).some((b) => overlap(a, b)),
      );
      return {
        outside,
        overlap: overlap(
          document.querySelector("#joystick"),
          document.querySelector(".height-panel"),
        ),
        topOverlaps,
        scroll: document.documentElement.scrollWidth > innerWidth,
      };
    });
    check(
      !layout.outside.length &&
        !layout.overlap &&
        !layout.topOverlaps &&
        !layout.scroll,
      `layout ${width}x${height} is within viewport without overlapping controls: ${JSON.stringify(layout)}`,
    );
    const colors = await page.evaluate(() => {
      const { renderer, scene, camera } = window.__room;
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      const pixels = new Uint8Array(32 * 32 * 4);
      gl.readPixels(Math.floor(gl.drawingBufferWidth / 2) - 16, Math.floor(gl.drawingBufferHeight / 2) - 16, 32, 32, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const unique = new Set();
      for (let i = 0; i < pixels.length; i += 4) unique.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      return unique.size;
    });
    check(colors > 100, `textured canvas ${width}x${height} has ${colors} distinct center pixels`);
    await page.screenshot({
      path: `output/playwright/viewport-${width}x${height}.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await tap(page.getByRole("button", { name: "全体表示", exact: true }));
  const cameraBefore = await page.evaluate(() =>
    window.__room.camera.position.toArray(),
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 170, y: 360, id: 3 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 260, y: 420, id: 3 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(200);
  const cameraAfter = await page.evaluate(() =>
    window.__room.camera.position.toArray(),
  );
  check(
    cameraAfter.some((n, i) => Math.abs(n - cameraBefore[i]) > 0.1),
    "mobile overview touch rotation works",
  );
  await tap(page.getByRole("button", { name: "開始位置に戻る", exact: true }));
  await page.screenshot({ path: "output/playwright/mobile-overview.png" });
  await tap(page.getByRole("button", { name: "ウォーク", exact: true }));
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.detach();
  return { results };
}
