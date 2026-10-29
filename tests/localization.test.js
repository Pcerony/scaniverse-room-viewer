import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { PRESETS } from '../src/navigation.js';
import sizes from '../assets/scan-sizes.json' with { type: 'json' };

test('Japanese UI removes scan title and footer labels', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /lang="ja"/);
  assert.doesNotMatch(html, /class="identity"|scene-footer|scene-status|ROOM \/ 01|房间|本地扫描/);
  assert.match(html, /目線の高さ/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /id="progress-value"/);
  assert.deepEqual(PRESETS.map(p => p.label), ['車いす', '子ども', '女性', '男性']);
});
test('download progress sizes match the actual published assets', () => {
  assert.equal(sizes.texture, statSync(new URL('../assets/room-texture.jpg', import.meta.url)).size);
  assert.equal(sizes.model, statSync(new URL('../Scaniverse 2026-10-13 210522/Scaniverse_2026_10_13_210522.obj', import.meta.url)).size);
});
