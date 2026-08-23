/**
 * generate-alevels-coords.mjs
 * ----------------------------
 * Downloads A-level QP PDFs from Internet Archive and generates
 * question-coordinate JSON files into public/question-coords/
 * for use by the ER overlay system.
 *
 * Only generates coords for papers that have a matching er-cache entry.
 *
 * Usage:
 *   node scripts/generate-alevels-coords.mjs            # all A-level papers
 *   node scripts/generate-alevels-coords.mjs 9700       # single subject
 *   node scripts/generate-alevels-coords.mjs 9700_s22   # single session
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const ARCHIVE_BASE  = 'https://archive.org/download/student-archive-alevels-pastpapers';
const ER_CACHE_DIR  = join(ROOT, 'public', 'er-cache');
const COORDS_DIR    = join(ROOT, 'public', 'question-coords');
const TEMP_DIR      = join(os.tmpdir(), 'alevels-qp-pdfs');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

// ── Roman numeral helpers ──────────────────────────────────────────────────────

const ROMAN_RE = /^(i{1,3}|iv|vi{0,3}|ix|x)$/i;
const LETTER_PAT = /^\([a-z]\)$/i;
const ROMAN_PAT  = /^\((i{1,3}|iv|vi{0,3}|ix|x)\)$/i;

// ── HTTP download helper ───────────────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) { resolve(true); return; }
    mkdirSync(dirname(dest), { recursive: true });
    const file = createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 404) { file.close(); resolve(false); return; }
      if (res.statusCode !== 200) { file.close(); resolve(false); return; }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', () => { file.close(); resolve(false); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── PDF text extraction ────────────────────────────────────────────────────────

async function extractItems(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const pages = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page     = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const tc       = await page.getTextContent();
    const items    = [];

    for (const item of tc.items) {
      const str = item.str?.trim();
      if (!str) continue;
      const topPx = Math.round(viewport.height - item.transform[5]);
      items.push({ text: str, topPx, x: item.transform[4] });
    }
    pages.push({ items, pageWidth: viewport.width, pageHeight: viewport.height });
  }

  await pdf.destroy();
  return pages;
}

// ── Coord generation ───────────────────────────────────────────────────────────

function findInRange(pages, startPage, startY, endPage, endY, pattern, xFrac = 0.35) {
  const results = [];
  for (let p = startPage; p <= Math.min(endPage, pages.length); p++) {
    const { items, pageWidth } = pages[p - 1];
    const lo = p === startPage ? startY : 0;
    const hi = p === endPage   ? endY   : Infinity;
    for (const it of items) {
      if (it.topPx < lo || it.topPx > hi) continue;
      if (it.x > pageWidth * xFrac) continue;
      if (pattern.test(it.text)) results.push({ ...it, page: p });
    }
  }
  return results;
}

async function buildCoords(pdfPath, erKeys) {
  const pages = await extractItems(pdfPath);
  const coords = [];

  const isMCQ = erKeys.some(k => /^\d+$/.test(k) && parseInt(k) > 10);

  if (isMCQ) {
    // MCQ: each question number gets a coord
    for (const k of erKeys) {
      const qNum = parseInt(k);
      if (!qNum) continue;
      for (let pi = 0; pi < pages.length; pi++) {
        const { items, pageWidth } = pages[pi];
        const hit = items.find(it =>
          it.text === String(qNum) && it.x < pageWidth * 0.20
        );
        if (hit) {
          coords.push({ key: k, label: `Q ${qNum}`, topPx: hit.topPx, page: pi + 1 });
          break;
        }
      }
    }
    return coords;
  }

  // Theory paper: per-question, per-subpart
  const qNums = [...new Set(erKeys.map(k => {
    const m = k.match(/^(\d+)/);
    return m ? parseInt(m[1]) : null;
  }).filter(Boolean))].sort((a, b) => a - b);

  // Find question number positions
  const qList = [];
  const seen  = new Set();

  for (let pi = 0; pi < pages.length; pi++) {
    const { items, pageWidth } = pages[pi];
    for (const it of items) {
      if (!/^\d+$/.test(it.text)) continue;
      const n = parseInt(it.text);
      if (!qNums.includes(n)) continue;
      if (it.x > pageWidth * 0.20) continue;
      if (!seen.has(n)) {
        seen.add(n);
        qList.push({ qNum: n, page: pi + 1, topPx: it.topPx });
      }
    }
  }

  qList.sort((a, b) => a.page - b.page || a.topPx - b.topPx);

  for (let qi = 0; qi < qList.length; qi++) {
    const q    = qList[qi];
    const next = qList[qi + 1] ?? { page: pages.length, topPx: 99999 };
    const qn   = q.qNum;

    // Find letter sub-parts
    const letters = findInRange(pages, q.page, q.topPx, next.page, next.topPx, LETTER_PAT, 0.30);

    const seenL = new Set();
    const lList = [];
    for (const l of letters) {
      const ch = l.text[1].toLowerCase();
      if (!seenL.has(ch)) { seenL.add(ch); lList.push({ ...l, letter: ch }); }
    }

    let emittedSub = false;

    for (let li = 0; li < lList.length; li++) {
      const lv   = lList[li];
      const lEnd = lList[li + 1] ?? next;
      const key  = `${qn}${lv.letter}`;

      // Find roman sub-sub-parts
      const romans = findInRange(pages, lv.page, lv.topPx, lEnd.page ?? lv.page, lEnd.topPx ?? 99999, ROMAN_PAT, 0.35);
      const seenR  = new Set();
      const rList  = [];
      for (const r of romans) {
        const sym = r.text.replace(/[()]/g, '').toLowerCase();
        if (!seenR.has(sym)) { seenR.add(sym); rList.push({ ...r, roman: sym }); }
      }

      let emittedRoman = false;
      for (const rv of rList) {
        const subKey = `${key}${rv.roman}`;
        if (erKeys.includes(subKey)) {
          coords.push({ key: subKey, label: `Q ${qn}. (${lv.letter}) (${rv.roman})`, topPx: rv.topPx, page: rv.page });
          emittedRoman = true;
          emittedSub   = true;
        }
      }

      if (!emittedRoman && erKeys.includes(key)) {
        coords.push({ key, label: `Q ${qn}. (${lv.letter})`, topPx: lv.topPx, page: lv.page });
        emittedSub = true;
      }
    }

    // No sub-parts → emit question-level coord
    if (!emittedSub) {
      const qKey = String(qn);
      if (erKeys.includes(qKey) || erKeys.some(k => k.startsWith(qKey))) {
        coords.push({ key: qKey, label: `Q ${qn}`, topPx: q.topPx, page: q.page });
      }
    }
  }

  return coords;
}

// ── ER cache helpers ───────────────────────────────────────────────────────────

function getErKeysForPaper(paperId) {
  // paperId: 9700_s22_qp_32  → look for 9700_s22_er_32.json
  const m = paperId.match(/^(\d{4})_([msw]\d{2})_qp_(\d)(\d)$/);
  if (!m) return [];
  const [, code, sess, comp, variant] = m;
  const component = `${comp}${variant}`;

  const erFile = join(ER_CACHE_DIR, `${code}_${sess}_er_${component}.json`);
  if (!existsSync(erFile)) return [];

  try {
    const raw  = JSON.parse(readFileSync(erFile, 'utf-8'));
    const data = raw.notes ?? raw;
    return Object.keys(data).filter(k => k !== 'key_messages' && k !== 'general_comments');
  } catch {
    return [];
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filterArg = args[0] ?? '';

mkdirSync(COORDS_DIR, { recursive: true });
mkdirSync(TEMP_DIR,   { recursive: true });

// Collect all paper IDs that have er-cache entries
const erFiles = readdirSync(ER_CACHE_DIR).filter(f => /^9\d{3}_/.test(f) && f.endsWith('.json'));

// Build set of paper IDs to process: 9700_s22_er_32.json → 9700_s22_qp_32
const paperIds = new Set();
for (const f of erFiles) {
  const m = f.match(/^(\d{4})_([msw]\d{2})_er_(\d{2})\.json$/);
  if (!m) continue;
  const [, code, sess, comp] = m;
  paperIds.add(`${code}_${sess}_qp_${comp}`);
}

let done = 0, skipped = 0, failed = 0;

for (const paperId of [...paperIds].sort()) {
  // Apply filter
  if (filterArg) {
    if (filterArg.includes('_')) {
      if (!paperId.startsWith(filterArg.replace('_qp_', '_'))) continue;
    } else {
      if (!paperId.startsWith(filterArg)) continue;
    }
  }

  const outPath = join(COORDS_DIR, `${paperId}_coords.json`);
  if (existsSync(outPath)) { skipped++; continue; }

  const erKeys = getErKeysForPaper(paperId);
  if (!erKeys.length) { skipped++; continue; }

  const pdfName  = `${paperId}.pdf`;
  const url      = `${ARCHIVE_BASE}/${pdfName}`;
  const tmpPath  = join(TEMP_DIR, pdfName);

  process.stdout.write(`${paperId} ... `);
  const ok = await download(url, tmpPath);
  if (!ok) { console.log('not found'); failed++; await sleep(300); continue; }

  try {
    const coords = await buildCoords(tmpPath, erKeys);
    if (!coords.length) { console.log('no coords'); failed++; continue; }

    writeFileSync(outPath, JSON.stringify({
      pdfPath: `archive:${pdfName}`,
      totalCoords: coords.length,
      coordinates: coords,
    }, null, 2));

    console.log(`✓ ${coords.length} coords`);
    done++;
  } catch (e) {
    console.log(`error: ${e.message}`);
    failed++;
  }

  await sleep(400); // polite delay
}

console.log(`\nDone: ${done} generated, ${skipped} skipped, ${failed} failed`);

// Made with Bob
