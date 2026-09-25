// Studio Chat attachments & links, in both setups:
//   A. inside claude.ai (fake window.claude that records what the model receives)
//   B. hosted by the Montaj Worker (real local worker for upload/extract; Claude and remote
//      sites are mocked because this sandbox has no API key and no direct internet access)
import { chromium } from 'playwright';
import { zipSync, strToU8 } from 'fflate';
import { jsPDF } from 'jspdf';

const A_URL = process.env.A_URL ?? 'http://localhost:4173/montaj-studio.html';
const B_URL = process.env.B_URL ?? 'http://127.0.0.1:8787/';
let ok = 0, fail = 0;
const step = async (n, f) => { try { await f(); ok++; console.log('OK  ', n); } catch (e) { fail++; console.log('FAIL', n, '—', e.message.split('\n')[0]); } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });

const pdf = () => { const d = new jsPDF(); d.text('Brief : affiche bleu nuit et or pour le gala du 12 octobre, logo en haut', 10, 20); return Buffer.from(d.output('arraybuffer')); };
const docx = () => Buffer.from(zipSync({ 'word/document.xml': strToU8('<w:document><w:body><w:p><w:r><w:t>Charte : couleurs #0B1F3A et #D4AF37, police Playfair</w:t></w:r></w:p></w:body></w:document>') }));
const zip = () => Buffer.from(zipSync({ 'site/index.html': strToU8('<h1>Accueil</h1>'), 'site/style.css': strToU8('body{color:#123456}') }));
const png = async (page, color) => Buffer.from(await page.evaluate((c) => { const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 320, 200); return cv.toDataURL('image/png').split(',')[1]; }, color), 'base64');
const webm = async (page) => Buffer.from(await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d');
  const ac = new AudioContext(); const osc = ac.createOscillator(); const dst = ac.createMediaStreamDestination(); osc.frequency.value = 440; osc.connect(dst); osc.start(); await ac.resume();
  const stream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...dst.stream.getAudioTracks()]);
  const r = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' }); const ch = []; r.ondataavailable = (e) => ch.push(e.data); r.start(100);
  const t0 = performance.now(); await new Promise((res) => { const f = () => { const t = performance.now() - t0; x.fillStyle = `hsl(${t / 8},80%,50%)`; x.fillRect(0, 0, 320, 240); if (t < 4500) requestAnimationFrame(f); else { r.stop(); res(); } }; f(); });
  await new Promise((res) => (r.onstop = res));
  const buf = await new Blob(ch).arrayBuffer(); let bin = ''; new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin);
}), 'base64');

async function openChat(page, url) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Commencer' }).first().click();
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.getByRole('button', { name: 'Essayer Studio Chat' }).count().catch(() => 0);
  await page.evaluate(() => { location.hash = '#/chat'; });
  await page.locator('#chat-input').waitFor();
}
const fileInput = (page) => page.locator('input[type=file][multiple]').last();

// ---------- A. claude.ai ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  await ctx.addInitScript(() => {
    window.__calls = [];
    const sample = async (input, opts = {}) => {
      const last = Array.isArray(input) ? input[input.length - 1].content : input;
      window.__calls.push({ prompt: last, images: (opts.images || []).length, documents: opts.documents || [] });
      const text = 'Bien reçu.\nSUITE: Crée l’affiche | Autre idée | Plus tard';
      opts.onText?.({ text, delta: text });
      return { text, truncated: false, modelTierApplied: 'default' };
    };
    sample.limits = async () => ({ maxPromptBytes: 65536, tools: { maxCount: 40 }, images: { maxCount: 8 } });
    sample.json = async () => ({});
    window.claude = { use: async (n) => (n === 'sample' ? sample : null) };
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openChat(page, A_URL);
  const last = () => page.evaluate(() => window.__calls[window.__calls.length - 1]);
  await step('A: attach image, PDF, Word, ZIP and video (browser processing)', async () => {
    await fileInput(page).setInputFiles([
      { name: 'logo.png', mimeType: 'image/png', buffer: await png(page, '#D4AF37') },
      { name: 'brief.pdf', mimeType: 'application/pdf', buffer: pdf() },
      { name: 'charte.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docx() },
      { name: 'site.zip', mimeType: 'application/zip', buffer: zip() },
      { name: 'clip.webm', mimeType: 'video/webm', buffer: await webm(page) },
    ]);
    await page.locator('.att-chip[data-status="ready"]').nth(4).waitFor({ timeout: 30000 });
    const n = await page.locator('.att-chip').count();
    if (n !== 5) throw new Error(n + ' chips');
  });
  await step('A: size limit error is explicit', async () => {
    await fileInput(page).setInputFiles({ name: 'enorme.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(21 * 1024 * 1024) });
    await page.getByText(/enorme\.pdf.*limite est 20,0 Mo par fichier/).first().waitFor();
    await page.locator('.att-chip[data-status="error"] button').click();
  });
  await step('A: paste an image from the clipboard', async () => {
    const b64 = (await png(page, '#0B1F3A')).toString('base64');
    await page.locator('#chat-input').evaluate((el, b) => {
      const bin = atob(b); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const dt = new DataTransfer(); dt.items.add(new File([u8], 'capture.png', { type: 'image/png' }));
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, b64);
    await page.locator('.att-chip[data-status="ready"]', { hasText: 'capture.png' }).waitFor();
  });
  await step('A: link card says analysis is unavailable here', async () => {
    await page.locator('#chat-input').fill('Fais une affiche dans le style de https://atelier.example/boutique avec ces fichiers');
    await page.getByText('Analyse impossible ici').first().waitFor();
  });
  await step('A: the AI receives files, text, images and the link failure', async () => {
    await page.keyboard.press('Enter');
    await page.getByText('Bien reçu.').waitFor();
    const c = await last();
    for (const s of ['#1 « logo.png »', 'content of #2', 'gala du 12 octobre', 'Charte : couleurs #0B1F3A', 'site/index.html', 'clip.webm', 'images clés', 'could not be fetched']) if (!c.prompt.includes(s)) throw new Error('missing in prompt: ' + s);
    if (c.images < 4) throw new Error('images sent: ' + c.images);
    await page.getByRole('button', { name: 'Crée l’affiche' }).waitFor();
  });
  await step('A: attachments stay available later in the conversation', async () => {
    await page.locator('#chat-input').fill('Reprends les couleurs de #3 et le logo de tout à l’heure');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__calls.length >= 2);
    const c = await last();
    if (!c.prompt.includes('Charte : couleurs #0B1F3A')) throw new Error('#3 text not re-sent');
    if (c.images < 1) throw new Error('no image re-sent');
    await page.locator('.side-tab-files, button', { hasText: /^Fichiers/ }).first().click().catch(() => undefined);
  });
  await page.screenshot({ path: 'scripts/shot3-chat-claudeai.png' });
  console.log('A errors:', errors.length ? errors.join(' | ') : 'none');
  await ctx.close();
}

// ---------- B. hosted by the Worker ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const seen = [];
  await page.route('**/api/health', (r) => r.fulfill({ json: { ok: true, ai: true, upload: true, scrape: true, browser: true, transcribe: true, maxVideoMb: 100, maxFileMb: 20, billing: true, payments: { stripe: true, packs: true, mobileMoney: false, plans: { creator: { month: true, year: true }, pro: { month: true, year: true }, team: { month: true, year: true } } } } }));
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { text: 'Bonjour, voici notre nouvelle collection.' } }));
  await page.route('**/api/scrape', async (r) => {
    const b = r.request().postDataJSON();
    if (b.url.includes('prive')) return r.fulfill({ status: 422, json: { code: 'login', error: 'Cette page demande une connexion : elle est ignorée' } });
    return r.fulfill({ json: { url: b.url, finalUrl: b.url, title: 'Atelier Nomade', description: 'Céramique faite main', text: 'Bols et tasses faits main.', headings: ['H1 Céramique'], colors: ['#2B2118', '#F4EDE4'], fonts: ['Playfair Display'], images: [], links: [], rendered: true, screenshot: b.preview ? undefined : (await png(page, '#F4EDE4')).toString('base64') } });
  });
  // Claude API mocked: first round calls a tool, second round answers (exercises the loop).
  await page.route('**/api/claude', async (r) => {
    const b = r.request().postDataJSON();
    b.wallet = r.request().headers()['x-montaj-wallet'];
    seen.push(b);
    const tools = b.tools.map((t) => t.name);
    const hasResult = JSON.stringify(b.messages[b.messages.length - 1]).includes('tool_result');
    const lines = hasResult || !tools.includes('list_formats')
      ? [{ t: 'd', d: 'J’ai lu le PDF et analysé le lien.' }, { t: 'd', d: '\nSUITE: Crée l’affiche | Autre | Stop' }, { t: 'end', content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', billing: { credits: 12, balance: 4321 } }]
      : [{ t: 'd', d: 'Je regarde les formats…' }, { t: 'end', content: [{ type: 'text', text: 'Je regarde les formats…' }, { type: 'tool_use', id: 'tu_1', name: 'list_formats', input: {} }], stop_reason: 'tool_use' }];
    await r.fulfill({ headers: { 'content-type': 'application/x-ndjson' }, body: lines.map((l) => JSON.stringify(l)).join('\n') + '\n' });
  });
  await openChat(page, B_URL);
  await step('B: upload to the server with progress, extraction on the server', async () => {
    await fileInput(page).setInputFiles([
      { name: 'brief.pdf', mimeType: 'application/pdf', buffer: pdf() },
      { name: 'charte.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docx() },
      { name: 'clip.webm', mimeType: 'video/webm', buffer: await webm(page) },
    ]);
    await page.locator('.att-chip[data-status="ready"]').nth(2).waitFor({ timeout: 30000 });
    const docxSummary = await page.locator('.att-chip', { hasText: 'charte.docx' }).getAttribute('title');
    if (!/caractères extraits/.test(docxSummary)) throw new Error('docx: ' + docxSummary);
  });
  await step('B: link preview card from the server', async () => {
    await page.locator('#chat-input').fill('Dans le style de https://atelier.example/ et https://prive.example/compte : crée une affiche');
    await page.locator('.link-card', { hasText: 'Atelier Nomade' }).waitFor();
  });
  await step('B: send — PDF native, transcript, link text + screenshot, failed link told, tool loop', async () => {
    await page.keyboard.press('Enter');
    await page.getByText('J’ai lu le PDF et analysé le lien.').waitFor({ timeout: 20000 });
    const first = seen[0];
    const text = JSON.stringify(first.messages);
    if (!first.documents?.length) throw new Error('PDF not sent as document');
    for (const s of ['Bonjour, voici notre nouvelle collection', 'Atelier Nomade', 'Playfair Display', 'screenshot of link 1', 'the analysis failed: Cette page demande une connexion', 'Charte : couleurs']) if (!text.includes(s)) throw new Error('missing: ' + s);
    const imgs = (text.match(/"type":"image"/g) ?? []).length;
    if (imgs < 3) throw new Error('images: ' + imgs);
    if (seen.length < 2 || !JSON.stringify(seen[1].messages).includes('tool_result')) throw new Error('tool loop did not run');
    await page.locator('.link-card', { hasText: 'Échec' }).first().waitFor();
  });
  await page.screenshot({ path: 'scripts/shot3-chat-hosted.png' });
  await step('B: every AI call carries the device wallet id', async () => {
    if (!seen.every((b) => /^[a-f0-9-]{36}$/.test(b.wallet ?? ''))) throw new Error('wallet header missing');
  });
  await step('B: credits page — real wallet from D1, plans, pack checkout, return toast', async () => {
    await page.route('**/api/billing/checkout', (r) => r.fulfill({ json: { url: B_URL + '?from=stripe#/credits?checkout=success' } }));
    await page.goto(B_URL + '#/credits');
    await page.getByTestId('balance').filter({ hasText: /^\d/ }).waitFor();
    const bal = Number((await page.getByTestId('balance').innerText()).replace(/\D/g, ''));
    if (!(bal > 0)) throw new Error('balance ' + bal);
    await page.locator('[data-plan="pro"] button').filter({ hasText: 'Choisir' }).waitFor();
    await page.locator('[data-pack="pack_1100"] button').click();
    await page.waitForURL(/from=stripe/);
    await page.getByText('Paiement reçu').waitFor();
    await page.screenshot({ path: 'scripts/shot3-credits.png', fullPage: true });
  });
  await step('B: insufficient credits explained in the chat', async () => {
    await page.unroute('**/api/claude');
    await page.route('**/api/claude', (r) => r.fulfill({ status: 402, json: { code: 'insufficient_credits', error: 'Crédits insuffisants' } }));
    await page.evaluate(() => { location.hash = '#/chat'; });
    await page.locator('#chat-input').fill('Un titre pour mon affiche');
    await page.keyboard.press('Enter');
    await page.getByText('recharge ou change de formule').first().waitFor();
  });
  console.log('B errors:', errors.length ? errors.join(' | ') : 'none');
  await ctx.close();
}
console.log(`\n${ok} OK, ${fail} FAIL`);
await browser.close();
