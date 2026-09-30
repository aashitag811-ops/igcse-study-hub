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
import https from 'https';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const ARCHIVE_BASE  = 'https://archive.org/download/student-archive-alevels-pastpapers';
const ER_CACHE_DIR  = join(ROOT, 'public', 'er-cache');
const COORDS_DIR    = join(ROOT, 'public', 'question-coords');
const TEMP_DIR      = join(os.tmpdir(), 'alevels-qp-pdfs');
// Local PDF dirs — check these first before downloading
const LOCAL_DIRS    = [
  join(__dirname, 'pastpapers-alevels'),
  join(__dirname, 'pastpapers'),
];

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

// ── Roman numeral helpers ──────────────────────────────────────────────────────

const ROMAN_RE = /^(i{1,3}|iv|vi{0,3}|ix|x)$/i;
const LETTER_PAT = /^\([a-hj-np-uwz]\)$/i;  // excludes i/v/x/c to avoid roman confusion
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

      // Fix 3: split combined tokens like "(a)(i)" → also emit "(a)" as a synthetic item
      const combined = str.match(/^(\([a-hj-np-uwz]\))(\([ivx]+\))$/i);
      if (combined) {
        items.push({ text: combined[1], topPx, x: item.transform[4], synthetic: true });
      }
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
          it.text === String(qNum) && it.x < pageWidth * 0.10 && it.topPx >= 60
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

  // Fix 1: collect ALL candidates per Q number, prefer "Question N" label over bare digit
  const qCandidates = new Map(); // qNum → { label?, digit? }

  for (let pi = 0; pi < pages.length; pi++) {
    const { items, pageWidth } = pages[pi];
    const page = pi + 1;
    for (const it of items) {
      if (it.topPx < 60) continue;
      // "Question N" label — no x constraint
      const qm = it.text.match(/^Question\s+(\d+)$/i);
      if (qm) {
        const n = parseInt(qm[1]);
        if (qNums.includes(n)) {
          const e = qCandidates.get(n) ?? {};
          if (!e.label) e.label = { qNum: n, page, topPx: it.topPx };
          qCandidates.set(n, e);
        }
        continue;
      }
      // Bare digit at left margin (10% threshold)
      if (/^\d+$/.test(it.text) && it.x < pageWidth * 0.10) {
        const n = parseInt(it.text);
        if (qNums.includes(n)) {
          const e = qCandidates.get(n) ?? {};
          if (!e.digit) e.digit = { qNum: n, page, topPx: it.topPx };
          qCandidates.set(n, e);
        }
      }
    }
  }

  const qList = [...qCandidates.values()]
    .map(e => e.label ?? e.digit)
    .filter(Boolean)
    .sort((a, b) => a.page - b.page || a.topPx - b.topPx);

  for (let qi = 0; qi < qList.length; qi++) {
    const q    = qList[qi];
    const next = qList[qi + 1] ?? { page: pages.length, topPx: 99999 };
    const qn   = q.qNum;

    // Only scan for letters if ER has letter-keyed entries for this Q.
    // Prevents inline "(a)"/"(b)" in math text being mistaken for sub-parts.
    const hasErLetterKeys = erKeys.some(k => {
      const m = k.match(/^(\d+)([a-hj-np-uwz])/);
      return m && parseInt(m[1]) === qn;
    });
    // Use 20% x threshold for letter sub-parts (≈119px on 595pt page).
    // Real (a)/(b) labels sit at x≈50–95px (8–16%). 14% was too tight for
    // subjects like 0606 Add Maths where labels appear at x≈95 (16%).
    const letters = hasErLetterKeys
      ? findInRange(pages, q.page, q.topPx, next.page, next.topPx, LETTER_PAT, 0.20)
      : [];

    const seenL = new Set();
    const lList = [];
    for (const l of letters) {
      const ch = l.text[1].toLowerCase();
      if (!seenL.has(ch)) { seenL.add(ch); lList.push({ ...l, letter: ch }); }
    }

    if (lList.length === 0) {
      // ── Bug B: roman-direct structure — Q uses (i)(ii)(iii) with no (a)(b) ──
      const directRomanKeys = erKeys.filter(k => {
        const m = k.match(/^(\d+)(i{1,3}|iv|vi{0,3}|ix|x)$/);
        return m && parseInt(m[1]) === qn;
      });

      if (directRomanKeys.length > 0) {
        const qRomans = findInRange(pages, q.page, q.topPx, next.page, next.topPx, ROMAN_PAT, 0.35);
        const seenQR = new Set();
        for (const r of qRomans) {
          const rv = r.text.replace(/[()]/g, '').toLowerCase();
          if (seenQR.has(rv)) continue;
          seenQR.add(rv);
          const key = `${qn}${rv}`;
          if (erKeys.includes(key)) {
            coords.push({ key, label: `Q ${qn}. (${rv})`, topPx: r.topPx, page: r.page });
          }
        }
        if (erKeys.includes(String(qn))) {
          coords.push({ key: String(qn), label: `Q ${qn}`, topPx: q.topPx, page: q.page });
        }
      } else {
        // Bare Q-level coord
        const qKey = String(qn);
        if (erKeys.includes(qKey) || erKeys.some(k => k.startsWith(qKey))) {
          coords.push({ key: qKey, label: `Q ${qn}`, topPx: q.topPx, page: q.page });
        }
      }
      continue;
    }

    // ── Has letter sub-parts ─────────────────────────────────────────────────

    // If ER also has a bare Q-level key (e.g. '1' alongside '1a','1b'), emit it too
    if (erKeys.includes(String(qn))) {
      coords.push({ key: String(qn), label: `Q ${qn}`, topPx: q.topPx, page: q.page });
    }

    for (let li = 0; li < lList.length; li++) {
      const lv   = lList[li];
      const lEnd = lList[li + 1] ?? next;
      const letterKey = `${qn}${lv.letter}`;

      // Always emit letter coord if ER has it (covers merged sub-i notes)
      if (erKeys.includes(letterKey)) {
        coords.push({ key: letterKey, label: `Q ${qn}. (${lv.letter})`, topPx: lv.topPx, page: lv.page });
      }

      // Roman sub-sub-parts
      const romans = findInRange(pages, lv.page, lv.topPx, lEnd.page ?? lv.page, lEnd.topPx ?? 99999, ROMAN_PAT, 0.35);
      const seenR  = new Set();
      const rList  = [];
      for (const r of romans) {
        const sym = r.text.replace(/[()]/g, '').toLowerCase();
        if (!seenR.has(sym)) { seenR.add(sym); rList.push({ ...r, roman: sym }); }
      }

      for (const rv of rList) {
        // Bug A fix: try '1aiii' first, then fall back to '1iii' (roman-only key)
        const fullKey  = `${qn}${lv.letter}${rv.roman}`;
        const shortKey = `${qn}${rv.roman}`;
        const matchKey = erKeys.includes(fullKey) ? fullKey
                       : erKeys.includes(shortKey) ? shortKey
                       : null;
        if (matchKey) {
          coords.push({ key: matchKey, label: `Q ${qn}. (${lv.letter}) (${rv.roman})`, topPx: rv.topPx, page: rv.page });
        }
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

const args       = process.argv.slice(2);
const filterArg  = args.filter(a => !a.startsWith('--'))[0] ?? '';
const forceRegen = args.includes('--force');     // re-generate synthetic coord files
const fixZeros   = args.includes('--fix-zeros'); // re-generate any zero-coverage file

mkdirSync(COORDS_DIR, { recursive: true });
mkdirSync(TEMP_DIR,   { recursive: true });

// Collect all paper IDs that have er-cache entries
const erFiles = readdirSync(ER_CACHE_DIR).filter(f => /^[89]\d{3}_/.test(f) && f.endsWith('.json'));

// Build set of paper IDs to process: 9700_s22_er_32.json → 9700_s22_qp_32
const paperIds = new Set();
for (const f of erFiles) {
  const m = f.match(/^(\d{4})_([msw]\d{2})_er_(\d{2})\.json$/);
  if (!m) continue;
  const [, code, sess, comp] = m;
  paperIds.add(`${code}_${sess}_qp_${comp}`);
}

/** Find the PDF locally across all local dirs, return path or null */
function findLocalPdf(pdfName) {
  for (const dir of LOCAL_DIRS) {
    const p = join(dir, pdfName);
    if (existsSync(p)) return p;
  }
  return null;
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

  // Skip if already done — unless --force, --fix-zeros, or it was synthetic (inaccurate)
  if (existsSync(outPath)) {
    if (!forceRegen && !fixZeros) { skipped++; continue; }
    try {
      const existing = JSON.parse(readFileSync(outPath, 'utf-8'));
      if (fixZeros) {
        // Only regenerate files with zero coords that have real ER keys
        const hasCords = (existing.totalCoords ?? existing.coordinates?.length ?? 0) > 0;
        if (hasCords) { skipped++; continue; }
      } else {
        // --force: only regenerate synthetic files
        if (!existing.synthetic) { skipped++; continue; }
      }
    } catch { /* regenerate on parse error */ }
  }

  const erKeys = getErKeysForPaper(paperId);
  if (!erKeys.length) { skipped++; continue; }

  const pdfName = `${paperId}.pdf`;
  process.stdout.write(`${paperId} ... `);

  // 1. Try local dirs first
  let pdfPath = findLocalPdf(pdfName);
  let source  = 'local';

  // 2. Fall back to downloading from Internet Archive
  if (!pdfPath) {
    const url     = `${ARCHIVE_BASE}/${pdfName}`;
    const tmpPath = join(TEMP_DIR, pdfName);
    const ok      = await download(url, tmpPath);
    if (ok) { pdfPath = tmpPath; source = 'archive'; }
  }

  if (!pdfPath) { console.log('PDF not found'); failed++; await sleep(200); continue; }

  try {
    const coords = await buildCoords(pdfPath, erKeys);
    if (!coords.length) { console.log('no coords found in PDF'); failed++; continue; }

    writeFileSync(outPath, JSON.stringify({
      pdfPath:            `${source}:${pdfName}`,
      coordsFound:        coords.length,
      erEntriesExpected:  erKeys.length,
      coordinates:        coords,
    }, null, 2));

    console.log(`✓ ${coords.length} coords [${source}]`);
    done++;
  } catch (e) {
    console.log(`error: ${e.message}`);
    failed++;
  }

  // Small delay only when downloading — no need for local files
  if (source === 'archive') await sleep(400);
}

console.log(`\nDone: ${done} generated, ${skipped} skipped, ${failed} failed`);

// Made with Bob
