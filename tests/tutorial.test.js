import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('tutorial offers both device instructions and a reopen control', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const text of ['W', 'A', 'S', 'D', '方向キー', 'スティック', 'ドラッグ', 'はじめる', '操作ガイド']) assert.ok(html.includes(text), text);
  assert.match(html, /id="tutorial"/);
  assert.match(html, /id="help"/);
});
