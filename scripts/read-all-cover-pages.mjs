// read-all-cover-pages.mjs — reads cover page of EVERY QP PDF for a subject to map structure by year
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

const files = readdirSync(PDFS_DIR)
  .filter(f => f.endsWith('.pdf') && f.includes('_qp_'))
  .filter(f => subjects.some(s => f.startsWith(s + '_')))
  .sort();

// Group by comp, collect (year, marks, duration, description) per comp
const byComp = {};

for (const f of files) {
  const m = f.match(/(\d{4})_([msw])(\d{2})_qp_(\d\d)/);
  if (!m) continue;
  const [, subj, sess, yr, comp] = m;
  const year = parseInt(yr) + (parseInt(yr) < 50 ? 2000 : 1900);

  try {
    const lines = await getPage1Text(join(PDFS_DIR, f));
    const marks  = (lines.find(l => /total.*mark|mark.*\d{2,3}/i.test(l)) || '').match(/(\d{2,3})/)?.[1];
    const dur    = lines.find(l => /^\d+\s+hour/i.test(l) || /hour.*minute/i.test(l));
    const paperN = lines.find(l => /paper\s+\d/i.test(l));

    const key = subj + '_' + comp;
    if (!byComp[key]) byComp[key] = [];
    byComp[key].push({ year, sess, marks, dur: dur?.trim(), paperN: paperN?.trim() });
  } catch(e) { /* skip */ }
}

// Print: for each comp, show if marks/duration changed over years
for (const key of Object.keys(byComp).sort()) {
  const entries = byComp[key].sort((a,b) => a.year - b.year || a.sess.localeCompare(b.sess));
  // Detect changes
  const unique = [...new Set(entries.map(e => `${e.marks}m_${e.dur}`))];
  const changed = unique.length > 1 ? ' *** CHANGED ***' : '';
  console.log(`\n[${key}]${changed}`);
  let prev = null;
  for (const e of entries) {
    const sig = `${e.marks}m_${e.dur}`;
    if (sig !== prev) {
      console.log(`  ${e.year}${e.sess}: ${e.marks} marks | ${e.dur} | ${e.paperN||''}`);
      prev = sig;
    }
  }
}
