import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

const pdfPath = join(ROOT, 'scripts/pastpapers/0470_m17_qp_22.pdf');
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
console.log('Pages:', pdf.numPages);

// Show ALL single/double digit numbers, first few pages
for (let p = 2; p <= Math.min(8, pdf.numPages); p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const nums = tc.items
    .filter(it => /^\d{1,2}$/.test(it.str?.trim()))
    .map(it => ({ n: it.str.trim(), x: Math.round(it.transform[4]), y: Math.round(vp.height - it.transform[5]) }))
    .filter(it => it.y >= 60)
    .slice(0, 5);
  if (nums.length) console.log(`p${p}:`, nums.map(n=>`'${n.n}'@x=${n.x},y=${n.y}`).join('  '));
}
await pdf.destroy();
