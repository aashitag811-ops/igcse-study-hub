// Debug: show ALL lines that match TOP_LEVEL_Q_RE pattern
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

const data = new Uint8Array(readFileSync(join(ROOT, 'public/pdfs/0580_s22_qp_42.pdf')));
const pdf = await pdfjsLib.getDocument({data, disableWorker: true}).promise;
let text = '';
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const tc = await page.getTextContent();
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
      if (i === 0) { line += item.str; }
      else { const prev = sorted[i-1]; const gap = item.x - (prev.x + prev.w); line += gap < 1.5 ? item.str : ' ' + item.str; }
    }
    line = line.replace(/  +/g, ' ').trim();
    if (line) text += line + '\n';
  }
}
await pdf.destroy();

const TOP_LEVEL_Q_RE = /^(\d+)\s{1,5}(.*)/;
const lines = text.split('\n');
console.log(`Total lines: ${lines.length}`);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const m = TOP_LEVEL_Q_RE.exec(l);
  if (m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= 15) {
    console.log(`L${i} Q-candidate(${m[1]}): ${JSON.stringify(l.substring(0, 80))}`);
  }
}
process.exit(0);
