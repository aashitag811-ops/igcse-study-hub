// dump-pdf-text-all.mjs — show ALL pages of raw text layer
import { readFileSync } from 'fs';
const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

const pdfPath = process.argv[2];
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const tc = await page.getTextContent();
  const lines = {};
  for (const item of tc.items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!lines[y]) lines[y] = [];
    lines[y].push({ x: Math.round(item.transform[4]), s: item.str });
  }
  console.log(`\n=== PAGE ${p} ===`);
  Object.keys(lines).map(Number).sort((a, b) => b - a).forEach(y => {
    const row = lines[y].sort((a, b) => a.x - b.x).map(i => i.s).join(' ');
    console.log(row);
  });
}
await pdf.destroy();
