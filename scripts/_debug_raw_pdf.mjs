// Debug: dump raw extracted text from a specific ER PDF
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs').then(m => m).catch(() => {
  return import('pdfjs-dist/legacy/build/pdf.js').catch(() => require('pdfjs-dist/legacy/build/pdf.js'));
});

const pdfFile = process.argv[2];
if (!pdfFile) { console.error('Usage: node _debug_raw_pdf.mjs <pdfpath>'); process.exit(1); }

const data = new Uint8Array(readFileSync(pdfFile));
const doc = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
console.log(`Pages: ${doc.numPages}`);
for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  const text = content.items.map(i => i.str).join(' ');
  console.log(`\n=== PAGE ${p} ===`);
  console.log(text.slice(0, 3000));
}
