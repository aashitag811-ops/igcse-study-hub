/**
 * audit-coords.mjs
 * Quick audit: for each paper with an ER file + PDF + coords file,
 * count how many ER keys have a matching coord.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ER_DIR     = join(ROOT, 'public', 'er-cache');
const PDF_DIR    = join(ROOT, 'public', 'pdfs');
const COORD_DIR  = join(ROOT, 'public', 'question-coords');
const META_KEYS  = new Set(['key_messages', 'general_comments']);

let full = 0, partial = 0, zero = 0, noPdf = 0, noEr = 0;
const partialList = [];
const worstList   = [];
const bySubject   = new Map();

const erFiles = readdirSync(ER_DIR).filter(f => /^(\d{4})_([msw]\d{2})_er_(\d)(\d)\.json$/.test(f));

for (const f of erFiles) {
  const m = f.match(/^(\d{4})_([msw]\d{2})_er_(\d)(\d)\.json$/);
  const [,sub,sess,comp,v] = m;
  const paperId   = `${sub}_${sess}_qp_${comp}${v}`;
  const pdfPath   = join(PDF_DIR,   `${paperId}.pdf`);
  const coordPath = join(COORD_DIR, `${paperId}_coords.json`);

  if (!existsSync(pdfPath)) { noPdf++; continue; }

  const raw     = readFileSync(join(ER_DIR, f), 'utf8').replace(/^\uFEFF/, '');
  const erData  = JSON.parse(raw);
  const erNotes = erData.notes ?? erData;
  const erKeys  = Object.keys(erNotes).filter(k => !META_KEYS.has(k));

  if (erKeys.length === 0) { noEr++; continue; }

  if (!existsSync(coordPath)) {
    zero++;
    partialList.push(`${paperId} (0/${erKeys.length})`);
    bySubject.set(sub, (bySubject.get(sub) ?? 0) + 1);
    continue;
  }

  const coord     = JSON.parse(readFileSync(coordPath, 'utf8'));
  const coordKeys = new Set((coord.coordinates ?? coord.coords ?? []).map(c => c.key));
  const found     = erKeys.filter(k => coordKeys.has(k)).length;

  if (found === erKeys.length) {
    full++;
  } else if (found === 0) {
    zero++;
    partialList.push(`${paperId} (0/${erKeys.length})`);
    bySubject.set(sub, (bySubject.get(sub) ?? 0) + 1);
  } else {
    partial++;
    const pct = Math.round(found / erKeys.length * 100);
    partialList.push(`${paperId} (${found}/${erKeys.length})`);
    if (pct < 70) worstList.push({ paperId, found, total: erKeys.length, pct });
    bySubject.set(sub, (bySubject.get(sub) ?? 0) + 1);
  }
}

partialList.sort();
worstList.sort((a,b) => a.pct - b.pct);

console.log('=== OVERALL ===');
console.log(`Full 100%  : ${full}`);
console.log(`Partial    : ${partial}`);
console.log(`Zero       : ${zero}`);
console.log(`No PDF     : ${noPdf}`);
console.log(`No ER keys : ${noEr}`);

console.log('\n=== PARTIAL BY SUBJECT ===');
const sortedSubs = [...bySubject.entries()].sort((a,b)=>b[1]-a[1]);
for (const [sub, cnt] of sortedSubs) console.log(`${sub}: ${cnt}`);

console.log('\n=== WORST PARTIAL (under 70%) ===');
for (const w of worstList) console.log(`${w.paperId} ${w.found}/${w.total} ${w.pct}%`);
