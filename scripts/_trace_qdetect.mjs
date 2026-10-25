// Debug: trace exactly which questions get found/lost for a given paper
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

const paperId = process.argv[2] || '0606_w18_qp_11';
const pdfPath = join(ROOT, 'public', 'pdfs', `${paperId}.pdf`);
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

const erFile = join(ROOT, 'public', 'er-cache', `${paperId.replace(/^(\d{4})_([msw]\d{2})_qp_(\d)(\d)$/, '$1_$2_er_$3$4')}.json`);
const er = JSON.parse(readFileSync(erFile, 'utf8'));
const notes = er.notes ?? er;
const META = new Set(['key_messages','general_comments']);
const erKeys = new Set(Object.keys(notes).filter(k => !META.has(k)));
const qNums = [...new Set([...erKeys].map(k => { const m = k.match(/^(\d+)/); return m ? parseInt(m[1]) : null; }).filter(Boolean))].sort((a,b)=>a-b);
console.log('qNums to find:', qNums);

const pageItems = [];
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1.0 });
  const tc = await page.getTextContent();
  const items = [];
  for (const item of tc.items) {
    const str = item.str?.trim();
    if (!str) continue;
    const topPx = Math.round(vp.height - item.transform[5]);
    items.push({ text: str, topPx, x: item.transform[4] });
  }
  pageItems.push({ items, pageWidth: vp.width, pageHeight: vp.height });
}
await pdf.destroy();

const qCandidates = new Map();
for (let pi = 0; pi < pageItems.length; pi++) {
  const { items, pageWidth, pageHeight } = pageItems[pi];
  const page = pi + 1;
  const FOOTER_THRESHOLD = pageHeight - 80;
  for (const it of items) {
    if (it.topPx > FOOTER_THRESHOLD) continue;
    const qm = it.text.match(/^Question\s+(\d+)$/i);
    if (qm && it.topPx >= 60) {
      const n = parseInt(qm[1]);
      if (qNums.includes(n) && it.topPx < pageHeight * 0.80) {
        const entry = qCandidates.get(n) ?? {};
        if (!entry.label) entry.label = { qNum: n, page, topPx: it.topPx };
        qCandidates.set(n, entry);
      }
      continue;
    }
    if (/^\d+$/.test(it.text) && it.x < pageWidth * 0.10 && it.topPx >= 60) {
      const n = parseInt(it.text);
      if (qNums.includes(n)) {
        const entry = qCandidates.get(n) ?? {};
        if (!entry.digit) { entry.digit = { qNum: n, page, topPx: it.topPx }; console.log(`  Found digit "${n}" at p${page} y=${it.topPx} x=${it.x.toFixed(0)} (${(it.x/pageWidth*100).toFixed(1)}%)`); }
        qCandidates.set(n, entry);
      }
    }
  }
}

console.log('\nqCandidates:', [...qCandidates.entries()].map(([n,e]) => `Q${n}: label=${e.label ? 'p'+e.label.page+'y'+e.label.topPx : 'none'} digit=${e.digit ? 'p'+e.digit.page+'y'+e.digit.topPx : 'none'}`));

// Cluster detection
const allDigitItems = [];
for (let pi = 0; pi < pageItems.length; pi++) {
  const { items, pageWidth, pageHeight } = pageItems[pi];
  const page = pi + 1;
  const FT = pageHeight - 80;
  for (const it of items) {
    if (it.topPx < 60 || it.topPx > FT) continue;
    if (/^\d+$/.test(it.text) && it.x < pageWidth * 0.12) allDigitItems.push({ page, topPx: it.topPx });
  }
}
const clusterY = new Set();
const byPage = new Map();
for (const it of allDigitItems) {
  if (!byPage.has(it.page)) byPage.set(it.page, []);
  byPage.get(it.page).push(it.topPx);
}
for (const [pg, ys] of byPage) {
  ys.sort((a,b)=>a-b);
  const topmostY = ys[0];
  let rs = 0;
  for (let i = 1; i <= ys.length; i++) {
    const gap = i < ys.length ? ys[i]-ys[i-1] : Infinity;
    if (gap > 80) {
      const run = ys.slice(rs, i);
      if (run.length >= 4) { run.forEach(y => { if (y !== topmostY) clusterY.add(`${pg}:${y}`); }); console.log(`  Cluster on p${pg}: [${run}] topmost=${topmostY} protected`); }
      rs = i;
    }
  }
}

console.log('\nFinal qList after cluster filter:');
const qCoords = [];
for (const [n, entry] of qCandidates) qCoords.push(entry.label ?? entry.digit);
const qList = qCoords.filter(q => {
  if (!q) return false;
  const entry = qCandidates.get(q.qNum);
  if (entry?.label && entry.label === q) return true;
  const inCluster = clusterY.has(`${q.page}:${q.topPx}`);
  if (inCluster) console.log(`  FILTERED Q${q.qNum} at p${q.page}y${q.topPx} — in cluster`);
  return !inCluster;
}).sort((a,b)=>a.page-b.page||a.topPx-b.topPx);
qList.forEach(q => console.log(`  Q${q.qNum} at p${q.page} y=${q.topPx}`));
