// debug-raw-text.mjs
// Extracts and prints raw text from a PDF for diagnosis
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDFS_DIR = join(__dirname, 'pastpapers');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url
).href;

async function extractText(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc   = await page.getTextContent();
    const rows = {};
    for (const item of tc.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x: item.transform[4], w: item.width ?? 0, str: item.str });
    }
    const ys = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const y of ys) {
      const sorted = rows[y].sort((a, b) => a.x - b.x);
      let line = '';
      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        if (i === 0) {
          line += item.str;
        } else {
          const prev = sorted[i - 1];
          const gap  = item.x - (prev.x + prev.w);
          line += gap < 1.5 ? item.str : ' ' + item.str;
        }
      }
      line = line.replace(/  +/g, ' ').trim();
      if (line) text += line + '\n';
    }
    text += '<<<PAGE_BREAK>>>\n';
  }
  await pdf.destroy();
  return text;
}

const paperId = process.argv[2];
if (!paperId) { console.error('Usage: node debug-raw-text.mjs <paperId>'); process.exit(1); }

const pdfPath = join(PDFS_DIR, `${paperId}.pdf`);
if (!existsSync(pdfPath)) { console.error('PDF not found:', pdfPath); process.exit(1); }

const raw = await extractText(pdfPath);
const lines = raw.split('\n');
lines.forEach((l, i) => {
  if (l === '<<<PAGE_BREAK>>>') {
    console.log(`\n--- PAGE BREAK (after line ${i-1}) ---`);
  } else {
    console.log(`${String(i).padStart(4,' ')} | ${l}`);
  }
});
