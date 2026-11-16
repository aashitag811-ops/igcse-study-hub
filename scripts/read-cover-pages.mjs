// read-cover-pages.mjs — reads cover page of each 0580/0455 QP PDF and extracts paper info
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

const PDFS_DIR = join(__dirname, 'pastpapers');
const subjects = process.argv.slice(2).length ? process.argv.slice(2) : ['0580'];

async function getPage1Text(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const page = await pdf.getPage(1);
  const tc = await page.getTextContent();
  const rows = {};
  for (const item of tc.items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!rows[y]) rows[y] = [];
    rows[y].push({ x: item.transform[4], s: item.str });
  }
  const lines = Object.keys(rows).map(Number).sort((a, b) => b - a)
    .map(y => rows[y].sort((a, b) => a.x - b.x).map(i => i.s).join(' ').trim())
    .filter(l => l);
  await pdf.destroy();
  return lines;
}

// Sample one paper per component per subject to understand the structure
const seen = new Set();
const files = readdirSync(PDFS_DIR)
  .filter(f => f.endsWith('.pdf') && f.includes('_qp_'))
  .filter(f => subjects.some(s => f.startsWith(s + '_')))
  .sort();

for (const f of files) {
  const m = f.match(/(\d{4})_[msw]\d{2}_qp_(\d\d)/);
  if (!m) continue;
  const key = m[1] + '_' + m[2]; // e.g. 0580_12
  if (seen.has(key)) continue;
  seen.add(key);

  try {
    const lines = await getPage1Text(join(PDFS_DIR, f));
    // Find the paper title line and question count hint
    const title = lines.find(l => /paper|mathematics|economics/i.test(l) && l.length > 5);
    const qcount = lines.find(l => /\d+\s+question/i.test(l));
    const marks = lines.find(l => /total.*mark|mark.*total/i.test(l));
    const duration = lines.find(l => /hour|minute/i.test(l));
    console.log(`\n${f} [comp ${m[2]}]`);
    if (title)    console.log('  title:    ', title);
    if (duration) console.log('  duration: ', duration);
    if (qcount)   console.log('  qcount:   ', qcount);
    if (marks)    console.log('  marks:    ', marks);
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
