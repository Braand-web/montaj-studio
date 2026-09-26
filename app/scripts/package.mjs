// Rebuild dist/index.html as a self-contained document for Claude Artifacts and Workers.
// Keep crawlable metadata and the first-load SEO page ahead of the app bundle.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist/index.html', 'utf8');
const template = readFileSync('index.html', 'utf8');
const styleStart = src.indexOf('<style');
const styleEnd = src.indexOf('</style>', styleStart) + '</style>'.length;
const metadataEnd = template.indexOf('<link rel="preconnect"');
const metadata = template.slice(0, metadataEnd).trim();
const links = [...template.matchAll(/<link[^>]*>/g)].map((m) => m[0]).join('\n');
const rootStart = src.indexOf('<div id="root"');
const scriptMatch = src.match(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/);
const style = src.slice(styleStart, styleEnd);
const root = src.slice(rootStart).trim();
const script = scriptMatch?.[0] ?? '';

if (styleStart < 0 || metadataEnd < 0 || rootStart < 0 || !script) {
  throw new Error('Impossible d’assembler le document HTML SEO.');
}

const out = `<!doctype html>
<html lang="fr">
<head>
${metadata}
${links}
${style}
</head>
<body>
${root}
${script}
</body>
</html>`;

writeFileSync('dist/montaj-studio.html', out);
console.log('dist/montaj-studio.html', (out.length / 1024).toFixed(0) + ' KB', 'title at', out.indexOf('<title>'), 'canonical at', out.indexOf('rel="canonical"'));
