// Full walkthrough with a scripted stand-in for the claude.ai runtime (tests only):
// the fake `sample` really calls the page's tools, so the agent plumbing is exercised.
import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: 'fr-FR' });
await ctx.addInitScript(() => {
  const findTool = (opts, n) => (opts.tools || []).find((t) => t.name === n);
  const run = async (opts, n, input) => { const t = findTool(opts, n); if (!t) throw new Error('missing tool ' + n); return await t.execute(input, { signal: new AbortController().signal }); };
  window.__imgs = [];
  const sample = async (input, opts = {}) => {
    const last = Array.isArray(input) ? input[input.length - 1].content : input;
    window.__imgs.push((opts.images || []).length);
    let text = 'OK';
    if (findTool(opts, 'create_design') && /affiche|poster/i.test(last)) {
      const r = await run(opts, 'create_design', { title: 'Affiche test', format: 'story' });
      await run(opts, 'set_page', { page: 1, bg: '#0F1115' });
      await run(opts, 'add_element', { page: 1, type: 'text', text: 'SOIRÉE DE LANCEMENT', size: 140, color: '#FFD23F', x: 80, y: 300, w: 920, h: 400 });
      await run(opts, 'check_design', {});
      text = 'J’ai créé l’affiche « Affiche test » (id ' + r.id + ').';
    } else if (findTool(opts, 'create_video') && /tiktok/i.test(last)) {
      await run(opts, 'create_video', { title: 'TikTok test', format: 'v-tiktok' });
      await run(opts, 'add_title', { text: 'ACCROCHE', start: 0, dur: 3 });
      await run(opts, 'set_captions', { text: 'Trois astuces pour économiser la batterie de ton téléphone', start: 0 });
      text = 'Projet TikTok créé avec un titre et des sous-titres.';
    } else if (findTool(opts, 'add_element')) {
      const d = await run(opts, 'get_document', {});
      await run(opts, 'add_element', { page: 1, type: 'text', text: 'Ajout assistant', size: 60, color: '#0F1115', x: 40, y: 40, w: 600, h: 100 });
      await run(opts, 'add_element', { page: 1, type: 'rect', x: 40, y: 200, w: 300, h: 40, fill: '#E84A2F' });
      text = `Document lu (${d.pages.length} page) : 2 éléments ajoutés.`;
    } else if (findTool(opts, 'add_title')) {
      await run(opts, 'add_title', { text: 'TITRE IA', start: 0, dur: 2 });
      text = 'Titre ajouté.';
    } else if (!opts.tools) {
      text = 'Texte généré';
    }
    if (opts.tools) text += '\nSUITE: Ajoute un logo | Change le fond | Décline en story';
    opts.onText?.({ text, delta: text });
    return { text, truncated: false, modelTierApplied: 'default' };
  };
  sample.limits = async () => ({ maxPromptBytes: 65536, tools: { maxCount: 40 }, images: { maxCount: 5, maxInputBytes: 20e6, mediaTypes: ['image/png', 'image/jpeg'] } });
  sample.json = async (input, opts = {}) => {
    const s = String(input);
    window.__imgs.push((opts.images || []).length);
    if (/alternative short copies/.test(s)) return ['Accroche A', 'Accroche B', 'Accroche C'];
    if (/senior graphic designer/.test(s)) return { score: 62, summary: 'Bonne base, titre trop petit.', issues: [{ sev: 'high', text: 'Titre trop petit', fix: 'Passe le titre à 140 px' }, { sev: 'low', text: 'Marges inégales', fix: 'Aligne à 80 px' }] };
    if (/5-color design palette/.test(s)) return { name: 'Coucher de soleil', colors: ['#1B1B3A', '#F5F0E6', '#FF7A59', '#FFC857', '#2EC4B6'], note: 'Fond sombre, accents chauds.' };
    if (/caption to publish/.test(s)) return { caption: 'Samedi, on lance tout 🚀', hashtags: ['#lancement', 'soirée'] };
    if (/publishing kit/.test(s)) return { title: 'Trois astuces batterie', description: 'Tout ce qu’il faut savoir.', hashtags: ['#tech'], chapters: [{ t: 0, title: 'Intro' }, { t: 2, title: 'Astuce 1' }] };
    const m = s.match(/\{[\s\S]*\}$/); const o = m ? JSON.parse(m[0]) : {}; for (const k of Object.keys(o)) o[k] = '[EN] ' + o[k]; return o;
  };
  const user = { me: async () => ({ id: 'u_test', name: 'Awa Test', avatarUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', color: '#0A84FF', email: null, isOwner: true, canEdit: true }) };
  window.claude = { use: async (n) => (n === 'sample' ? sample : n === 'user' ? user : null) };
});
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:4173/montaj-studio.html', { waitUntil: 'domcontentloaded' });
let ok = 0, fail = 0;
const step = async (name, fn) => { try { await fn(); ok++; console.log('OK  ', name); } catch (e) { fail++; console.log('FAIL', name, '—', e.message.split('\n')[0]); } };
const shot = (n) => page.screenshot({ path: `scripts/shot2-${n}.png` });
const side = (label) => page.locator('aside nav button', { hasText: label }).first().click();

await step('skip onboarding', async () => { await page.getByRole('button', { name: 'Commencer' }).first().click(); await page.getByRole('button', { name: 'Passer' }).click(); await page.getByText('on crée quoi aujourd’hui').waitFor(); });
await step('identity from Claude account in sidebar', () => page.getByText('Connecté via claude.ai').waitFor());
await shot('home');
const screens = [['Studio Chat', 'Que veux-tu créer aujourd’hui ?'], ['Crédits', 'Abonnement et crédits'], ['Templates', 'Modèles'], ['Idées & bugs', 'Propose une fonctionnalité'], ['Médiathèque', 'Médiathèque'], ['Planning', 'Planifie tes contenus'], ['Création en masse', 'Colle un tableau'], ['Équipe', 'Espaces d’équipe : bientôt'], ['Kit de marque', 'Nom de la marque'], ['Fournisseurs IA', 'Catalogue'], ['Utilisation IA', 'Requêtes maximum par jour'], ['Corbeille', 'restaurables pendant 30 jours'], ['Paramètres', 'Nom affiché dans l’application'], ['Admin', 'Contenu, stockage']];
for (const [label, marker] of screens) {
  await step('sidebar → ' + label, async () => {
    if (await page.locator('aside nav').count() === 0) await page.locator('.logo-btn').first().click();
    await side(label);
    await page.getByText(marker).first().waitFor();
  });
}
await step('sidebar → Éditeur vidéo opens an editor', async () => { await page.locator('.logo-btn').first().click(); await side('Éditeur vidéo'); await page.getByText('Dépose tes vidéos').waitFor(); });
await step('palette from editor → Accueil', async () => { await page.getByTitle('Aller à… (⌘K)').click(); await page.locator('#palette-q').fill('accueil'); await page.keyboard.press('Enter'); await page.getByText('on crée quoi aujourd’hui').waitFor(); });
await step('sidebar → Éditeur design opens an editor', async () => { await side('Éditeur design'); await page.getByText('Ajouter un titre').waitFor(); });
await step('design composer (Assist) → proposal → apply', async () => {
  await page.locator('.tabs button', { hasText: 'Assistant' }).click();
  await page.locator('#composer-design').fill('Ajoute un titre');
  await page.keyboard.press('Enter');
  await page.getByText('Proposition prête').waitFor();
  await page.getByText('image(s) envoyée(s) à Claude').waitFor();
  await page.getByRole('button', { name: 'Change le fond' }).waitFor();
  if (await page.getByText('SUITE:').count()) throw new Error('follow-up marker shown');
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await page.locator('.dots [data-id]').nth(1).waitFor();
});
await shot('design-agent');
await step('AI tab: write + translate', async () => {
  await page.locator('.rail button', { hasText: /^IA$/ }).click();
  await page.locator('#ai-write').fill('accroche promo');
  await page.getByRole('button', { name: 'Proposer 3 versions' }).click();
  await page.getByRole('button', { name: 'Accroche B' }).click();
  await page.getByText('Texte placé').waitFor();
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByText('Page traduite').waitFor();
});
await step('AI critique sees the page and hands fixes to the assistant', async () => {
  await page.getByRole('button', { name: 'Analyser cette page' }).click();
  await page.getByText('Titre trop petit').first().waitFor();
  const imgs = await page.evaluate(() => window.__imgs[window.__imgs.length - 1]);
  if (imgs !== 1) throw new Error('critique sent ' + imgs + ' images');
  await page.getByRole('button', { name: 'Corriger avec l’assistant' }).click();
  await page.getByText('Applique ces corrections').waitFor();
  await page.getByText('Proposition prête').last().waitFor();
  await page.getByRole('button', { name: 'Refuser' }).click();
});
await step('AI palette from a photo + social caption', async () => {
  await page.locator('.rail button', { hasText: /^IA$/ }).click();
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 60; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#FF7A59'; x.fillRect(0, 0, 60, 40); return c.toDataURL('image/png').split(',')[1]; });
  await page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByText('Coucher de soleil').waitFor();
  await page.getByRole('button', { name: 'Ajouter au kit de marque' }).click();
  await page.getByRole('button', { name: 'Écrire la légende' }).click();
  await page.locator('textarea').filter({ hasText: 'Samedi, on lance tout' }).waitFor();
  const v = await page.locator('textarea').filter({ hasText: 'Samedi' }).inputValue();
  if (!v.includes('#soirée')) throw new Error('hashtags not normalized: ' + v);
});
await step('export PNG → notification', async () => {
  await page.getByRole('button', { name: 'Exporter' }).first().click();
  await page.locator('.modal-f button', { hasText: 'Exporter' }).click();
  await page.getByText('Export terminé').waitFor({ timeout: 20000 });
  await page.locator('.modal-h button').click();
});
await step('studio chat creates a design', async () => {
  await page.getByTitle('Aller à… (⌘K)').click(); await page.locator('#palette-q').fill('studio'); await page.keyboard.press('Enter');
  await page.locator('#chat-input').fill('Crée une affiche pour ma soirée');
  await page.keyboard.press('Enter');
  await page.getByText('J’ai créé l’affiche').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Ouvrir dans l’éditeur' }).first().waitFor();
  await page.getByRole('button', { name: 'Décline en story' }).waitFor();
});
await step('studio chat: render check sends the design back to Claude', async () => {
  await page.getByRole('button', { name: 'Vérifier le rendu' }).click();
  await page.getByText('Vérifie le rendu de').waitFor();
  await page.getByText('1 image(s) vue(s) par Claude').waitFor();
});
await step('studio chat: attach a photo', async () => {
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 40; c.getContext('2d').fillRect(0, 0, 40, 40); return c.toDataURL('image/png').split(',')[1]; });
  await page.locator('input[type=file][multiple]').last().setInputFiles({ name: 'ma-photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.locator('.att-chip[data-status="ready"]', { hasText: 'ma-photo.png' }).waitFor();
  await page.locator('#chat-input').fill('Que vois-tu sur cette photo ?');
  await page.keyboard.press('Enter');
  await page.getByText('Que vois-tu sur cette photo').waitFor();
  await page.waitForTimeout(500);
  const imgs = await page.evaluate(() => window.__imgs[window.__imgs.length - 1]);
  if (imgs !== 1) throw new Error('chat sent ' + imgs + ' images');
});
await shot('chat');
await step('studio chat creates a TikTok project', async () => {
  await page.locator('#chat-input').fill('Prépare un projet TikTok');
  await page.keyboard.press('Enter');
  await page.getByText('Projet TikTok créé').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Ouvrir dans l’éditeur' }).last().click();
  await page.locator('section div[title="Titre"]').first().waitFor();
});
await step('video composer (Agent) adds a title', async () => {
  await page.locator('.tabs button', { hasText: 'Assistant' }).click();
  await page.locator('.seg button', { hasText: 'Agent' }).click();
  await page.locator('#composer-video').fill('Ajoute un titre');
  await page.keyboard.press('Enter');
  await page.getByText(/Terminé — /).waitFor();
  await page.getByRole('button', { name: 'Tout annuler' }).click();
});
await step('video publishing kit', async () => {
  await page.keyboard.press('Escape');
  await page.locator('.tabs button', { hasText: 'Inspecteur' }).click();
  await page.getByRole('button', { name: 'Préparer la publication' }).click();
  await page.locator('textarea').filter({ hasText: 'Trois astuces batterie' }).waitFor();
  await page.getByRole('button', { name: 'Chapitres → marqueurs' }).click();
  await page.getByText('Chapitres ajoutés comme marqueurs').waitFor();
});
await shot('video');
await step('notifications panel lists events', async () => {
  await page.getByTitle('Aller à… (⌘K)').click(); await page.locator('#palette-q').fill('accueil'); await page.keyboard.press('Enter');
  await page.locator('aside button', { hasText: 'Notifications' }).click();
  await page.getByText(/Export terminé|Studio Chat a créé/).first().waitFor();
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
  await page.keyboard.press('Escape'); await page.mouse.click(1300, 850);
});
await step('feedback: post, vote, reply, admin status', async () => {
  await page.locator('aside button', { hasText: 'Suggérer une idée' }).click();
  await page.locator('#fb-title').fill('Ajouter un export GIF animé');
  await page.locator('#fb-body').fill('Pour les stickers.');
  await page.getByRole('button', { name: 'Publier' }).click();
  await page.locator('#fb-reply').fill('Merci !');
  await page.getByRole('button', { name: 'Répondre' }).click();
  await page.getByText('Merci !').waitFor();
  await page.getByRole('button', { name: 'Vue admin' }).click();
  await page.getByRole('button', { name: 'Planifié' }).last().click();
});
await shot('feedback');
await step('usage log has rows', async () => { await side('Utilisation IA'); await page.getByText('Studio Chat').nth(1).waitFor(); await page.getByText('Assistant · design').first().waitFor(); });
await step('templates: video template opens the video editor', async () => { await side('Templates'); await page.getByRole('button', { name: 'Vidéo', exact: true }).click(); await page.getByRole('button', { name: 'Utiliser' }).first().click(); await page.locator('section div[title="Titre"]').first().waitFor(); });
await step('templates: 20+ available', async () => { await page.getByTitle('Aller à… (⌘K)').click(); await page.locator('#palette-q').fill('templates'); await page.keyboard.press('Enter'); await page.getByRole('button', { name: 'Utiliser' }).nth(19).waitFor(); const n = await page.getByRole('button', { name: 'Utiliser' }).count(); if (n < 20) throw new Error('only ' + n); });
await step('settings tabs', async () => { await side('Paramètres'); for (const t of ['Sécurité', 'Notifications', 'Données', 'Profil']) await page.getByRole('button', { name: t, exact: true }).click(); });
await step('legal tabs', async () => { await page.getByRole('button', { name: 'Données', exact: true }).click(); await page.getByRole('button', { name: 'Consulter' }).click(); for (const t of ['Confidentialité', 'IA et données', 'Licences']) await page.getByRole('button', { name: t }).click(); await page.getByText('SIL Open Font License').waitFor(); });
await step('credits: no fake purchase', async () => { await side('Crédits'); await page.getByRole('button', { name: 'Bientôt' }).nth(1).waitFor(); const n = await page.getByRole('button', { name: 'Bientôt' }).count(); if (n < 2) throw new Error('expected disabled paid plans'); });
await step('providers: Claude connected', async () => { await side('Fournisseurs IA'); await page.getByText('Connecté · outils actifs').waitFor(); });
await page.setViewportSize({ width: 390, height: 844 });
await step('phone width: home renders without horizontal scroll', async () => {
  await page.locator('.tabbar .tab', { hasText: 'Accueil' }).click();
  await page.getByText('on crée quoi aujourd’hui').waitFor();
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 400) throw new Error('scrollWidth ' + sw);
});
await shot('phone');
await step('phone: drawer opens and navigates', async () => {
  await page.locator('.tabbar .tab', { hasText: 'Plus' }).click();
  await page.locator('.drawer .nav-item', { hasText: 'Kit de marque' }).click();
  await page.locator('.drawer').waitFor({ state: 'detached' });
  await page.getByRole('heading', { name: 'Kit de marque' }).waitFor();
});
await step('browser back returns to previous screen', async () => {
  await page.goBack(); await page.getByText('on crée quoi aujourd’hui').waitFor();
  await page.goForward(); await page.getByRole('heading', { name: 'Kit de marque' }).waitFor();
  if (!(await page.evaluate(() => location.hash)).startsWith('#/brand')) throw new Error('hash ' + (await page.evaluate(() => location.hash)));
});
await step('deep link after reload', async () => { await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('heading', { name: 'Kit de marque' }).waitFor(); });
await shot('phone-brand');
console.log(`\n${ok} OK, ${fail} FAIL`);
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
