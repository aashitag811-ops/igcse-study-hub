// Debug why roman sub-parts are missing for 0606_s18_qp_21
// Missing: '1i', '2iii', '4iii', '7iii', '11i', '11iii', '12i', '12iii'

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

const paperId = process.argv[2] || '0606_s18_qp_21';
const pdfPath = join(ROOT, 'public', 'pdfs', `${paperId}.pdf`);
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

console.log(`\n=== ${paperId} (${pdf.numPages} pages) ===`);

for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1.0 });
  const tc = await page.getTextContent();
  const pw = vp.width;
  
  for (const item of tc.items) {
    const str = item.str?.trim();
    if (!str) continue;
    const x = item.transform[4];
    const topPx = Math.round(vp.height - item.transform[5]);
    if (topPx < 50) continue;
    
    // Show question-level items and roman/letter sub-parts
    const isQ = /^(Question\s+\d+|\d+)$/.test(str) && x < pw * 0.15;
    const isLetter = /^\([a-hj-np-uwz]\)$/.test(str) && x < pw * 0.35;
    const isRoman = /^\((i{1,3}|iv|vi{0,3}|ix|x)\)$/i.test(str) && x < pw * 0.40;
    
    if (isQ || isLetter || isRoman) {
      const xpct = (x / pw * 100).toFixed(1);
      console.log(`  p${p} x=${x.toFixed(0)} (${xpct}%) y=${topPx} ${JSON.stringify(str)}`);
    }
  }
}

await pdf.destroy();
