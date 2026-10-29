export function createLoadProgress(totals, onChange) {
  const loaded = Object.fromEntries(Object.keys(totals).map(key => [key, 0]));
  const total = Object.values(totals).reduce((sum, size) => sum + size, 0);
  let percent = 0;
  function report(value) {
    percent = Math.max(percent, Math.min(100, Math.floor(value)));
    onChange(percent);
  }
  return {
    bytes(key, count) {
      if (!(key in loaded)) throw new Error('Unknown download');
      loaded[key] = Math.max(loaded[key], Math.min(totals[key], count));
      report(Object.values(loaded).reduce((sum, size) => sum + size, 0) / total * 90);
    },
    stage: report,
  };
}

export async function fetchBytes(url, onBytes) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onBytes(bytes.length);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.length;
      onBytes(length);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
