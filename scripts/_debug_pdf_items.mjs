/**
 * Debug: print all left-margin text items from a PDF to diagnose coord detection issues
 * Usage: node scripts/_debug_pdf_items.mjs <paperId>
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url
).href;

const paperId = process.argv[2];
if (!paperId) { console.error('Usage: node scripts/_debug_pdf_items.mjs <paperId>'); process.exit(1); }

const pdfPath = join(ROOT, 'public', 'pdfs', paperId+'.pdf');
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

for (let p = 1; p <= Math.min(pdf.numPages, 6); p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  console.log(`\n--- Page ${p}  width=${Math.round(vp.width)}  height=${Math.round(vp.height)} ---`);
  for (const item of tc.items) {
    const str = item.str?.trim();
    if (!str) continue;
    const x = item.transform[4];
    const topPx = Math.round(vp.height - item.transform[5]);
    // Only show items in the left 25% of the page
    if (x < vp.width * 0.25) {
      console.log(`  x=${String(Math.round(x)).padStart(4)}  y=${String(topPx).padStart(4)}  |${str}|`);
    }
  }
}
await pdf.destroy();
