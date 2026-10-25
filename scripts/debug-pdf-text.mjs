import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

async function readPages(pdfPath, maxPages = 3) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  console.log(`\n=== ${pdfPath} (${pdf.numPages} pages) ===`);
  for (let p = 1; p <= Math.min(maxPages, pdf.numPages); p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items
      .map(i => ({ str: i.str?.trim(), y: Math.round(vp.height - i.transform[5]), x: Math.round(i.transform[4]) }))
      .filter(i => i.str);
    console.log(`\n--- Page ${p} (h=${Math.round(vp.height)}) ---`);
    items.slice(0, 35).forEach(i => console.log(`  x=${String(i.x).padStart(3)} y=${String(i.y).padStart(3)} |${i.str}|`));
  }
  await pdf.destroy();
}

const papers = [
  'scripts/pastpapers-alevels/9700_s23_qp_31.pdf',
  'scripts/pastpapers-alevels/9709_s23_qp_11.pdf',
  'scripts/pastpapers-alevels/9708_s23_qp_11.pdf',
  'scripts/pastpapers/0610_s23_qp_31.pdf',
  'scripts/pastpapers/0580_s23_qp_41.pdf',
];

for (const p of papers) {
  try { await readPages(p, 2); } catch(e) { console.error(p, e.message); }
}
