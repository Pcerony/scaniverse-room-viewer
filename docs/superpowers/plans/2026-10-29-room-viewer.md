# Room Viewer Implementation Plan

**Goal:** Deliver a locally served, textured Scaniverse room with desktop and mobile first-person navigation, eye-height presets, overview and reset.

**Architecture:** Vite serves original scan files unchanged. Three.js loads OBJ/MTL with a BVH for ray queries. Separate navigation math, scene calibration, input, and interface modules keep interactions testable.

**Tech Stack:** JavaScript ES modules, Three.js, three-mesh-bvh, lucide, Vite, Node test runner.

## Execution

- [x] Inspect bounds and real textured geometry to establish up axis, floor and safe spawn.
- [x] Write failing Node tests for presets, normalized movement, bounds, height and reset state. Run `node --test` and confirm missing implementation failure.
- [x] Implement navigation helpers and run the same tests until passing.
- [x] Add Vite entry, scene loader, BVH collision and orbit overview. Preserve scan source paths and use local dependencies.
- [x] Implement Chinese full-screen controls, eye-height slider, desktop key/drag/pointer-lock input, independent mobile joystick/look pointers, loss-of-focus clearing and fullscreen fallback.
- [x] Run `npm test` and `npm run build`. Start a retained local development server bound to LAN for optional same-Wi-Fi phone access.
- [x] Use Playwright on desktop and phone sizes, inspect screenshots and rendered canvas, exercise height, movement, overview, reset and touch. Check errors and resource failure/retry.
- [x] Document startup, LAN access, scanning limitations and test evidence; leave working preview available.

## Acceptance Evidence

Automated unit checks cover movement direction/diagonal speed, clamping, finite height and mode/reset preservation. Browser checks cover actual loaded model, actual camera changes, responsive controls, cancellation, failure states and canvas pixels. Screenshot inspection verifies framing, interior spawn and texture. No publication or source scan mutation.
