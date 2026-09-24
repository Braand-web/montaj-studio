// Rebuilds dist/index.html into the page layout the claude.ai Artifact host expects:
// <title> first (it must sit in the first 8 KB), then fonts, styles, root and script.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist/index.html', 'utf8');
const styleStart = src.indexOf('<style');
const styleEnd = src.indexOf('</style>', styleStart) + '</style>'.length;
const scriptStart = src.indexOf('<script');
const scriptEnd = src.lastIndexOf('</script>') + '</script>'.length;
const style = src.slice(styleStart, styleEnd);
const script = src.slice(scriptStart, scriptEnd);
const links = [...src.matchAll(/<link[^>]*>/g)].map((m) => m[0]).join('\n');
const out = `<meta charset="utf-8">
<title>Montaj Studio</title>
<meta name="description" content="Suite créative gratuite, locale d’abord : montage vidéo, design et assistant IA.">
${links}
${style}
<div id="root"></div>
${script}
`;
writeFileSync('dist/montaj-studio.html', out);
console.log('dist/montaj-studio.html', (out.length / 1024).toFixed(0) + ' KB', 'title at', out.indexOf('<title>'));
