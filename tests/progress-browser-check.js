async page => {
  await page.addInitScript(() => {
    window.__progressSamples = [];
    new MutationObserver(records => {
      for (const record of records) {
        if (record.target.id === 'load-progress') window.__progressSamples.push(Number(record.target.getAttribute('aria-valuenow')));
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['aria-valuenow'] });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 50, downloadThroughput: 1024 * 1024, uploadThroughput: 1024 * 1024 });
  await page.reload();
  await page.waitForFunction(() => {
    const percent = Number(document.querySelector('#load-progress')?.getAttribute('aria-valuenow'));
    return percent > 2 && percent < 85;
  });
  const during = await page.locator('#progress-value').textContent();
  await page.screenshot({ path: 'output/playwright/japanese-progress.png' });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.waitForFunction(() => window.__room && document.querySelector('#loading').hidden);
  const samples = await page.evaluate(() => window.__progressSamples);
  if (!samples.some(p => p > 0 && p < 90) || samples.at(-1) !== 100 || !samples.every((p, i) => p >= (samples[i - 1] ?? 0))) throw new Error(JSON.stringify(samples));
  const ui = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, titleBlock: !!document.querySelector('.identity'), footer: !!document.querySelector('.scene-footer'), progress: document.querySelector('#progress-value').textContent }));
  if (ui.lang !== 'ja' || ui.titleBlock || ui.footer || ui.progress !== '100%') throw new Error(JSON.stringify(ui));
  await cdp.detach();
  return { during, samples: [...new Set(samples)], ui };
}
