import { chromium } from 'playwright';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.setDefaultTimeout(8000);
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:4173/montaj-studio.html', { waitUntil: 'domcontentloaded' });
const step = async (name, fn) => { try { await fn(); console.log('OK  ', name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); } };

await step('marketing site visible', () => page.getByText('Questions fréquentes').waitFor({ timeout: 5000 }));
await step('site: features menu + FAQ + pricing', async () => {
  await page.getByRole('button', { name: /Fonctionnalités/ }).click();
  await page.locator('.site-menu-card', { hasText: 'Tarifs' }).click();
  await page.getByText('Les éditeurs sont gratuits').waitFor();
  if (!(await page.getByRole('button', { name: 'Bientôt' }).first().isDisabled())) throw new Error('paid plan not disabled');
  await page.getByRole('button', { name: 'Faut-il créer un compte ?' }).click();
  await page.getByText('Tu peux tout utiliser tout de suite').waitFor();
});
await page.screenshot({ path: 'scripts/shot-site.png' });
await step('site CTA -> onboarding', async () => { await page.getByRole('button', { name: 'Commencer' }).first().click(); await page.getByText('Qu’est-ce que tu crées le plus souvent ?').waitFor(); });
await step('skip onboarding', async () => { await page.getByRole('button', { name: 'Passer' }).click(); await page.getByText('on crée quoi aujourd’hui').waitFor(); });
await page.screenshot({ path: 'scripts/shot-home.png' });
await step('create story', async () => { await page.getByRole('button', { name: /Story/ }).first().click(); await page.getByText('Ajouter un titre').waitFor(); });
await step('add title + drag', async () => {
  await page.getByRole('button', { name: 'Ajouter un titre' }).click();
  const el = page.locator('.dots [data-id]').last();
  const b = await el.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2 + 60, { steps: 5 }); await page.mouse.up();
  const b2 = await el.boundingBox();
  if (Math.abs(b2.y - b.y) < 20) throw new Error('did not move');
});
await step('undo', async () => { await page.keyboard.press('Control+z'); });
await step('add shapes/chart/qr', async () => {
  await page.getByRole('button', { name: 'Éléments' }).click();
  await page.getByRole('button', { name: /Rectangle/ }).click();
  await page.getByRole('button', { name: /Graphique/ }).click();
  await page.getByRole('button', { name: /QR code/ }).click();
});
await step('layers tab', async () => { await page.getByRole('button', { name: 'Calques' }).click(); await page.getByText('QR code').first().waitFor(); });
await step('resize dialog', async () => { await page.getByRole('button', { name: 'Décliner' }).click(); await page.getByRole('button', { name: /Post carré|Instagram carré/ }).first().click(); await page.getByRole('button', { name: /^Décliner \(1\)/ }).click(); });
await page.screenshot({ path: 'scripts/shot-design.png' });
await step('export png', async () => {
  await page.getByRole('button', { name: 'Exporter' }).click();
  await page.getByRole('button', { name: 'Exporter', exact: true }).last().click();
  await page.getByText('Export terminé').waitFor({ timeout: 20000 });
  const dl = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: 'Télécharger' }).click();
  const d = await dl; console.log('     download:', d.suggestedFilename());
  await page.keyboard.press('Escape');
  await page.locator('.modal-h button').click().catch(() => {});
});
await step('back home, doc listed', async () => { await page.locator('.logo-btn').first().click(); await page.getByText('Story — sans titre').first().waitFor(); });

// Video
await step('create tiktok video', async () => { await page.getByRole('button', { name: /TikTok \/ Reels/ }).click(); await page.getByText('Dépose tes vidéos').waitFor(); });
const b64 = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d');
  const s = c.captureStream(30); const r = new MediaRecorder(s, { mimeType: 'video/webm' }); const ch = [];
  r.ondataavailable = (e) => ch.push(e.data); r.start(100);
  const t0 = performance.now();
  await new Promise((res) => { const f = () => { const t = performance.now() - t0; x.fillStyle = `hsl(${t / 10},80%,50%)`; x.fillRect(0, 0, 320, 240); x.fillStyle = '#fff'; x.font = '40px sans-serif'; x.fillText((t / 1000).toFixed(1), 100, 130); if (t < 2500) requestAnimationFrame(f); else { r.stop(); res(); } }; f(); });
  await new Promise((res) => (r.onstop = res));
  const buf = await new Blob(ch).arrayBuffer(); let bin = ''; new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin);
});
await step('import video', async () => {
  await page.locator('input[type=file][accept^="video"]').first().setInputFiles({ name: 'test.webm', mimeType: 'video/webm', buffer: Buffer.from(b64, 'base64') });
  await page.locator('section div[title="test.webm"]').first().waitFor({ timeout: 10000 });
});
await step('add title clip + split', async () => {
  await page.getByRole('button', { name: 'Texte', exact: true }).click();
  await page.getByRole('button', { name: 'Accroche' }).click();
  await page.locator('section div[title="test.webm"]').first().click();
  await page.keyboard.press('ArrowRight'); for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('s');
});
await step('play', async () => { await page.keyboard.press(' '); await page.waitForTimeout(1200); await page.keyboard.press(' '); });
await page.screenshot({ path: 'scripts/shot-video.png' });
await step('export video', async () => {
  await page.getByRole('button', { name: 'Exporter' }).first().click();
  await page.getByRole('button', { name: 'Exporter', exact: true }).last().click();
  await page.getByText('Export terminé').waitFor({ timeout: 30000 });
  const size = await page.locator('.modal .mono').last().textContent(); console.log('     ', size);
});
await step('composer without claude', async () => {
  await page.locator('.modal-h button').click();
  await page.getByRole('button', { name: 'Assistant' }).click();
  await page.locator('#composer-video').fill('Ajoute un titre');
  await page.keyboard.press('Enter');
  await page.getByText('ouvre cette application depuis claude.ai').waitFor({ timeout: 15000 });
});
for (const s of ['Médiathèque', 'Templates', 'Création en masse', 'Planning', 'Kit de marque', 'Fournisseurs IA', 'Corbeille', 'Paramètres']) {
  await step('screen ' + s, async () => { await page.locator('.logo-btn').first().click().catch(() => {}); await page.getByRole('button', { name: s }).first().click(); await page.waitForTimeout(300); });
}
await step('sidebar -> site and back', async () => { await page.getByRole('button', { name: 'Site', exact: true }).click(); await page.getByText('Questions fréquentes').waitFor(); await page.getByRole('button', { name: 'Ouvrir l’app' }).click(); await page.getByText('on crée quoi aujourd’hui').waitFor(); });
await page.getByRole('button', { name: 'Médiathèque' }).first().click().catch(() => {});
await page.screenshot({ path: 'scripts/shot-library.png' });
console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
