import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { jsPDF } from 'jspdf';
import { docxText, xlsxText, zipSummary, kindOf, extractText, looksScanned, fmtSize } from '../lib/attach/extract';

describe('attachment extraction', () => {
  it('detects kinds from names and mime types', () => {
    expect(kindOf('Cahier.PDF')).toBe('pdf');
    expect(kindOf('clip.mov')).toBe('video');
    expect(kindOf('main.tsx')).toBe('code');
    expect(kindOf('logo.svg')).toBe('svg');
    expect(kindOf('x', 'image/webp')).toBe('image');
    expect(kindOf('app.exe', 'application/octet-stream')).toBeNull();
  });
  it('reads Word paragraphs and tables', () => {
    const xml = '<w:document><w:body><w:p><w:r><w:t>Cahier des charges</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Couleurs : </w:t></w:r><w:r><w:t>bleu &amp; or</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
    const t = docxText(zipSync({ 'word/document.xml': strToU8(xml) }));
    expect(t).toContain('Cahier des charges');
    expect(t).toContain('Couleurs : bleu & or');
  });
  it('reads Excel sheets with shared strings', () => {
    const files = {
      'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="Prix" sheetId="1"/></sheets></workbook>'),
      'xl/sharedStrings.xml': strToU8('<sst><si><t>Produit</t></si><si><t>Crème</t></si></sst>'),
      'xl/worksheets/sheet1.xml': strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Prix</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="C2"><v>12.5</v></c></row></sheetData></worksheet>'),
    };
    const t = xlsxText(zipSync(files));
    expect(t).toContain('## Prix');
    expect(t).toContain('Produit;Prix');
    expect(t).toContain('Crème;;12.5');
  });
  it('lists a ZIP tree and includes small text files', () => {
    const z = zipSync({ 'site/index.html': strToU8('<h1>Hello</h1>'), 'site/logo.png': new Uint8Array(3000), '__MACOSX/x': strToU8('junk') });
    const r = zipSummary(z);
    expect(r.tree.map((e) => e.path)).toEqual(['site/index.html', 'site/logo.png']);
    expect(r.text).toContain('<h1>Hello</h1>');
  });
  it('extracts PDF text and flags scans', async () => {
    const doc = new jsPDF();
    doc.text('Brief : affiche pour la soirée de lancement', 10, 20);
    doc.addPage();
    doc.text('Page deux', 10, 20);
    const r = await extractText('pdf', new Uint8Array(doc.output('arraybuffer')));
    expect(r.pages).toBe(2);
    expect(r.text).toContain('affiche pour la soir');
    expect(r.scanned).toBe(false);
    expect(looksScanned(['', ' '])).toBe(true);
  });
  it('formats sizes in French', () => {
    expect(fmtSize(2.5 * 1024 * 1024)).toBe('2,5 Mo');
  });
});
