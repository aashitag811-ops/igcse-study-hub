/**
 * Debug: trace question-number detection for a specific paper
 * Usage: node scripts/_debug_q_detect.mjs <paperId>
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
const erFile  = process.argv[3]; // optional: path to er-cache json

const pdfPath = join(ROOT, 'public', 'pdfs', paperId + '.pdf');
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

// Load ER keys if provided
let erKeys = new Set();
if (erFile) {
  const raw = JSON.parse(readFileSync(erFile, 'utf8'));
  const notes = raw.notes ?? raw;
  erKeys = new Set(Object.keys(notes).filter(k => !['key_messages','general_comments'].includes(k)));
}
const qNums = erKeys.size > 0
  ? [...new Set([...erKeys].map(k => { const m=k.match(/^(\d+)/); return m?parseInt(m[1]):null; }).filter(Boolean))]
  : [...Array(30)].map((_,i)=>i+1);

console.log('ER keys:', [...erKeys].slice(0,20).join(', '));
console.log('Q nums to find:', qNums.join(', '));
console.log('');

const seen = new Set();
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const hits = [];
  for (const item of tc.items) {
    const str = item.str?.trim();
    if (!str) continue;
    const x = item.transform[4];
    const topPx = Math.round(vp.height - item.transform[5]);
    
    // Check bare digit
    if (/^\d+$/.test(str) && qNums.includes(parseInt(str)) && x < vp.width * 0.10 && topPx >= 60) {
      hits.push({ type: 'digit', str, x: Math.round(x), y: topPx, new: !seen.has(parseInt(str)) });
      if (!seen.has(parseInt(str))) seen.add(parseInt(str));
    }
    // Check "Question N"
    const qm = str.match(/^Question\s+(\d+)$/i);
    if (qm && qNums.includes(parseInt(qm[1])) && topPx >= 60) {
      hits.push({ type: 'label', str, x: Math.round(x), y: topPx, new: !seen.has(parseInt(qm[1])) });
      if (!seen.has(parseInt(qm[1]))) seen.add(parseInt(qm[1]));
    }
  }
  if (hits.length) {
    console.log(`Page ${p}:`);
    hits.forEach(h => console.log(`  [${h.type}${h.new?'*':' '}] x=${String(h.x).padStart(4)} y=${String(h.y).padStart(4)} |${h.str}|`));
  }
}

// Also show letter sub-parts for context
console.log('\n--- Letter sub-parts (all pages) ---');
const LETTER_PAT = /^\([a-hj-np-uwz]\)$/i;
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const hits = [];
  for (const item of tc.items) {
    const str = item.str?.trim();
    if (!str || !LETTER_PAT.test(str)) continue;
    const x = item.transform[4];
    const topPx = Math.round(vp.height - item.transform[5]);
    if (x < vp.width * 0.20) hits.push({ str, x: Math.round(x), y: topPx });
  }
  if (hits.length) {
    console.log(`Page ${p}:`);
    hits.forEach(h => console.log(`  x=${String(h.x).padStart(4)} y=${String(h.y).padStart(4)} ${h.str}`));
  }
}

await pdf.destroy();
