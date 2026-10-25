import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

const paperId = process.argv[2] || '0610_w14_qp_63';
const pdfPath = join(ROOT, 'public', 'pdfs', `${paperId}.pdf`);
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

console.log(`\n=== ${paperId} page heights ===`);
for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1.0 });
  console.log(`  p${p}: ${vp.width.toFixed(0)} x ${vp.height.toFixed(0)}`);
}

// Show all items on last few pages to find the "Question 2" footer
console.log('\n=== All items near bottom of pages ===');
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1.0 });
  const tc = await page.getTextContent();
  for (const item of tc.items) {
    const str = item.str?.trim();
    if (!str) continue;
    const topPx = Math.round(vp.height - item.transform[5]);
    const x = item.transform[4];
    if (topPx > vp.height * 0.75) { // bottom 25% of page
      if (/Question|^\d+$/.test(str) && x < vp.width * 0.20) {
        console.log(`  p${p} x=${x.toFixed(0)} y=${topPx} height=${vp.height.toFixed(0)} ${JSON.stringify(str)} (${(topPx/vp.height*100).toFixed(1)}% from top)`);
      }
    }
  }
}

await pdf.destroy();
