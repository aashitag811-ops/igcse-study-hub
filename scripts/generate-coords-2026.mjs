/**
 * generate-coords-2026.mjs
 * ─────────────────────────
 * Generates question-coordinate JSON files for all 2026 papers
 * that have a matching er-cache entry, into public/question-coords/
 *
 * Reads QP PDFs from Archive.org (same proxy as prod).
 * Only runs for papers where an er-cache JSON already exists.
 *
 * Usage:
 *   node scripts/generate-coords-2026.mjs            # all 2026 papers
 *   node scripts/generate-coords-2026.mjs 9700       # single subject
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import https from 'https';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const IGCSE_ARCHIVE  = 'https://archive.org/download/student-archive-igcse-pastpapers';
const ALEVEL_ARCHIVE = 'https://archive.org/download/student-archive-alevels-pastpapers';
const ER_CACHE_DIR   = join(ROOT, 'public', 'er-cache');
const COORDS_DIR     = join(ROOT, 'public', 'question-coords');
const TEMP_DIR       = join(os.tmpdir(), 'coords-2026-qps');

mkdirSync(COORDS_DIR, { recursive: true });
mkdirSync(TEMP_DIR,   { recursive: true });

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

// ── Roman numeral helpers ─────────────────────────────────────────────────────

const ROMAN_RE  = /^(i{1,3}|iv|vi{0,3}|ix|x)$/i;
const LETTER_RE = /^\([a-z]\)$/i;
const ROMAN_PAT = /^\((i{1,3}|iv|vi{0,3}|ix|x)\)$/i;

// ── HTTP download ─────────────────────────────────────────────────────────────

function archiveBase(filename) {
  return /^[98]/.test(filename) ? ALEVEL_ARCHIVE : IGCSE_ARCHIVE;
}

function downloadFile(url, dest) {
  return new Promise((resolve) => {
    if (existsSync(dest)) { resolve(true); return; }
    const file = createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) { file.close(); resolve(false); return; }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', () => { file.close(); resolve(false); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── PDF text extraction ───────────────────────────────────────────────────────

async function extractItems(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const all  = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page     = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const tc       = await page.getTextContent();

    for (const item of tc.items) {
      const str = item.str?.trim();
      if (!str) continue;
      const topPx = Math.round(viewport.height - item.transform[5]);
      all.push({ text: str, page: p, topPx, x: item.transform[4] });
    }
  }
  return all;
}

// ── Coordinate detection ──────────────────────────────────────────────────────

function detectCoords(items, isMCQ) {
  const coords = [];

  if (isMCQ) {
    // MCQ: detect "1", "2", ... "40" bold left-margin numbers
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!/^\d{1,2}$/.test(it.text)) continue;
      const n = parseInt(it.text);
      if (n < 1 || n > 40) continue;
      if (it.x > 80) continue;   // must be in left margin
      coords.push({ key: String(n), label: `Q ${n}`, topPx: it.topPx, page: it.page });
    }
    return coords;
  }

  // Theory: detect Q number → (a)/(b) → (i)/(ii)
  let curQ = null, curLetter = null;

  for (let i = 0; i < items.length; i++) {
    const it   = items[i];
    const text = it.text;

    // Main question number: bold standalone integer at left margin
    if (/^\d{1,2}$/.test(text) && it.x < 80) {
      const n = parseInt(text);
      if (n >= 1 && n <= 30) {
        curQ      = String(n);
        curLetter = null;
        coords.push({ key: curQ, label: `Q ${curQ}`, topPx: it.topPx, page: it.page });
        continue;
      }
    }

    if (!curQ) continue;

    // Sub-part (a), (b), ...
    if (LETTER_RE.test(text)) {
      const letter  = text.slice(1, -1).toLowerCase();
      curLetter     = letter;
      const key     = curQ + letter;
      const label   = `Q ${curQ}. (${letter})`;
      coords.push({ key, label, topPx: it.topPx, page: it.page });
      continue;
    }

    // Sub-sub-part (i), (ii), ...
    if (curLetter && ROMAN_PAT.test(text)) {
      const roman = text.slice(1, -1).toLowerCase();
      const key   = curQ + curLetter + roman;
      const label = `Q ${curQ}. (${curLetter}) (${roman})`;
      coords.push({ key, label, topPx: it.topPx, page: it.page });
    }
  }

  return coords;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const filterSubject = process.argv[2];

  // Find all 2026 er-cache files
  const erFiles = readdirSync(ER_CACHE_DIR)
    .filter(f => f.match(/^\d{4}_[ms]26_er_\d{2}\.json$/));

  if (erFiles.length === 0) {
    console.log('No 2026 er-cache files found. Run extract-2026-er.py first.');
    return;
  }

  // Build set of unique papers (code_sess_component) that have ER data
  const papers = new Set();
  for (const f of erFiles) {
    const m = f.match(/^(\d{4})_([ms]26)_er_(\d{2})\.json$/);
    if (!m) continue;
    if (filterSubject && m[1] !== filterSubject) continue;
    papers.add(`${m[1]}_${m[2]}_qp_${m[3]}`);
  }

  console.log(`\n📐 Coord generator — ${papers.size} 2026 papers to process\n`);

  let done = 0, written = 0, skipped = 0;

  for (const paperId of papers) {
    done++;
    const coordPath = join(COORDS_DIR, paperId + '_coords.json');
    if (existsSync(coordPath)) { skipped++; continue; }

    process.stdout.write(`[${done}/${papers.size}] ${paperId} … `);

    // Download QP PDF
    const filename  = paperId + '.pdf';
    const base      = archiveBase(filename);
    const url       = `${base}/${filename}`;
    const localPath = join(TEMP_DIR, filename);

    const ok = await downloadFile(url, localPath);
    if (!ok) { process.stdout.write('no PDF\n'); continue; }

    // Determine if MCQ (component first digit = 1 or 3 for Econ/Acct)
    const compMatch = paperId.match(/_qp_(\d)(\d)$/);
    const compNum   = compMatch ? parseInt(compMatch[1]) : 0;
    const code      = paperId.slice(0, 4);
    const MCQ_CODES_P1 = ['9700','9701','9702','0610','0620','0625'];
    const isMCQ = (MCQ_CODES_P1.includes(code) && compNum === 1) ||
                  (code === '9708' && (compNum === 1 || compNum === 3)) ||
                  (code === '9706' && compNum === 1) ||
                  (['0610','0620','0625'].includes(code) && compNum === 2) ||
                  (code === '0455' && compNum === 1) ||
                  (code === '0452' && compNum === 1);

    try {
      const items  = await extractItems(localPath);
      const coords = detectCoords(items, isMCQ);

      if (coords.length === 0) {
        process.stdout.write('0 coords\n');
        continue;
      }

      writeFileSync(coordPath, JSON.stringify({ coordinates: coords }, null, 2));
      process.stdout.write(`${coords.length} coords ✅\n`);
      written++;
    } catch (e) {
      process.stdout.write(`ERROR: ${e.message}\n`);
    }

    await sleep(200);
  }

  console.log(`\n✅ Written : ${written}`);
  console.log(`⏭  Skipped : ${skipped} (already done)`);
  console.log(`\nNext step: node scripts/generate-alevels-manifest.js && node scripts/generate-papers-manifest.js`);
}

main().catch(console.error);
