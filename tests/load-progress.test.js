import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadProgress, fetchBytes } from '../src/load-progress.js';

test('percentage uses actual combined bytes and reserves completion for preparation', () => {
  const events = [];
  const progress = createLoadProgress({ model: 90, texture: 10 }, value => events.push(value));
  progress.bytes('model', 45);
  assert.equal(events.at(-1), 40);
  progress.bytes('texture', 10);
  assert.equal(events.at(-1), 49);
  progress.bytes('model', 90);
  assert.equal(events.at(-1), 90);
  progress.stage(94);
  progress.bytes('model', 80);
  assert.equal(events.at(-1), 94);
  progress.stage(100);
  assert.equal(events.at(-1), 100);
  assert.ok(events.every((n, i) => n >= (events[i-1] ?? 0) && n <= 100));
});
test('stream reader reports actual bytes and preserves payload', async () => {
  const payload = 'scan-data'.repeat(200);
  const events = [];
  const bytes = await fetchBytes(`data:application/octet-stream;base64,${Buffer.from(payload).toString('base64')}`, n => events.push(n));
  assert.equal(new TextDecoder().decode(bytes), payload);
  assert.equal(events.at(-1), Buffer.byteLength(payload));
});
