/**
 * generate-coords.mjs
 *
 * Extracts question/sub-part Y-coordinates from Cambridge IGCSE QP PDFs.
 *
 * Theory papers (component 3x,4x,5x,6x):
 *   Emits one coord per sub-part key: "1a", "1b", "1ci", "1cii", etc.
 *   Detects:  Q number  →  (a)/(b)/...  →  (i)/(ii)/...
 *
 * MCQ papers (component 1x,2x):
 *   Emits one coord per question number: "4", "7", "22"
 *
 * Usage:
 *   node scripts/generate-coords.mjs                  # all papers with ER data
 *   node scripts/generate-coords.mjs 0610             # single subject
 *   node scripts/generate-coords.mjs 0610_m25_qp_32   # single paper
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

// ── Roman numeral helpers ─────────────────────────────────────────────────────

const ROMAN_VALUES = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
const ROMAN_RE = /^(i{1,3}|iv|vi{0,3}|ix|x)$/i;

// ── PDF text extraction ───────────────────────────────────────────────────────

/**
 * Extract every text item with its position from a PDF.
 * Returns array of { text, page, topPx, x, rawY }
 */
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
      all.push({ text: str, page: p, topPx, x: item.transform[4], rawY: item.transform[5] });
    }
  }

  await pdf.destroy();
  return all;
}

// ── Theory coords (sub-part resolution) ──────────────────────────────────────

/**
 * Build coords for a theory paper.
 * erKeys: Set of keys like "1a", "1b", "1ci", "1cii" from the ER cache.
 *
 * Algorithm:
 *  1. Find all question number items at the left margin (x < 15% of page width).
 *     Filter out axis-label clusters (dense vertical groups of ≥4 numbers).
 *  2. For each question, determine its Y-range (from its topPx to the next question's topPx).
 *  3. Within that range, find "(a)" / "(b)" items. For each letter sub-part:
 *     a. Check if key "Qa" is in erKeys → emit coord.
 *     b. Also look within its Y-range for "(i)"/"(ii)" items.
 *        Check if "Qai" etc. is in erKeys → emit coord.
 *  4. If a question has NO letter sub-parts in the ER (e.g. some Q overall notes),
 *     fall back to emitting the question-level coord.
 */
async function buildTheoryCoords(pdfPath, erKeys) {
  const data  = new Uint8Array(readFileSync(pdfPath));
  const pdf   = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

  // Collect items per page with page width info
  const pageItems   = [];  // pageItems[p-1] = { items, pageWidth, pageHeight }
  const pageWidths  = [];

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

    pageItems.push({ items, pageWidth: viewport.width, pageHeight: viewport.height });
    pageWidths.push(viewport.width);
  }

  await pdf.destroy();

  // ── Step 1: find question number positions ──────────────────────────────────

  // Unique question numbers that appear in any ER key
  const qNums = [...new Set([...erKeys].map(k => {
    const m = k.match(/^(\d+)/);
    return m ? parseInt(m[1]) : null;
  }).filter(Boolean))].sort((a, b) => a - b);

  const qCoords = [];  // { qNum, page, topPx }

  for (let pi = 0; pi < pageItems.length; pi++) {
    const { items, pageWidth } = pageItems[pi];
    const page = pi + 1;

    // Candidates: standalone integers at left margin
    const numCandidates = items.filter(it =>
      /^\d+$/.test(it.text) &&
      qNums.includes(parseInt(it.text)) &&
      it.x < pageWidth * 0.20
    );

    // Remove axis-label clusters (≥4 numbers within 200px vertical span)
    const clusterY = new Set();
    const sorted   = [...numCandidates].sort((a, b) => a.topPx - b.topPx);
    for (const it of sorted) {
      const nearby = sorted.filter(c => Math.abs(c.topPx - it.topPx) < 200);
      if (nearby.length >= 4) nearby.forEach(c => clusterY.add(c.topPx));
    }

    for (const it of numCandidates) {
      if (clusterY.has(it.topPx)) continue;
      qCoords.push({ qNum: parseInt(it.text), page, topPx: it.topPx });
    }
  }

  // Deduplicate: keep first occurrence of each question number
  const seenQ  = new Set();
  const qList  = [];
  for (const q of qCoords.sort((a, b) => a.page - b.page || a.topPx - b.topPx)) {
    if (!seenQ.has(q.qNum)) { seenQ.add(q.qNum); qList.push(q); }
  }

  // ── Step 2: find sub-part coords ────────────────────────────────────────────

  const coords = [];

  /**
   * Given a page+topPx range, find all items matching a pattern.
   * pageRange: { startPage, startY, endPage, endY } (endPage/endY = boundary of NEXT item)
   * pattern: regex that item.text must match
   * xMax: items must have x < xMax (fraction of page width, or absolute px)
   */
  const findInRange = (startPage, startY, endPage, endY, pattern, xFrac = 0.35) => {
    const results = [];
    for (let p = startPage; p <= Math.min(endPage, pageItems.length); p++) {
      const { items, pageWidth } = pageItems[p - 1];
      const lo = (p === startPage) ? startY : 0;
      const hi = (p === endPage)   ? endY   : Infinity;
      for (const it of items) {
        if (it.topPx < lo || it.topPx > hi) continue;
        if (it.x > pageWidth * xFrac) continue;
        if (pattern.test(it.text)) results.push({ ...it, page: p });
      }
    }
    return results;
  };

  // Boundary helpers
  const nextQ = (idx) => {
    if (idx + 1 < qList.length) return { page: qList[idx + 1].page, topPx: qList[idx + 1].topPx };
    return { page: pageItems.length, topPx: 99999 };
  };
  const nextItem = (arr, idx) => {
    if (idx + 1 < arr.length) return arr[idx + 1];
    return null;
  };

  for (let qi = 0; qi < qList.length; qi++) {
    const q     = qList[qi];
    const qEnd  = nextQ(qi);
    const qn    = q.qNum;

    // Find letter sub-parts within this question's range
    // "(a)" "(b)" "(c)" etc. — letter NOT in i/v/x to avoid roman confusion
    // We include i,v,x ONLY if there's no roman sub-sub-part ambiguity
    const LETTER_PAT = /^\([a-z]\)$/i;
    const letters = findInRange(q.page, q.topPx, qEnd.page, qEnd.topPx, LETTER_PAT, 0.30);

    // Deduplicate letters: keep first occurrence of each letter
    const seenL  = new Set();
    const lList  = [];
    for (const l of letters) {
      const ch = l.text.replace(/[()]/g, '').toLowerCase();
      if (!seenL.has(ch)) { seenL.add(ch); lList.push({ ...l, letter: ch }); }
    }

    if (lList.length === 0) {
      // No letter sub-parts found — emit question-level coord if any key matches qn
      const anyKey = [...erKeys].some(k => k.match(/^(\d+)/) && parseInt(k.match(/^(\d+)/)[1]) === qn);
      if (anyKey) {
        coords.push({ key: String(qn), label: `Q ${qn}`, topPx: q.topPx, page: q.page });
      }
      continue;
    }

    for (let li = 0; li < lList.length; li++) {
      const l     = lList[li];
      const lEnd  = nextItem(lList, li) ?? qEnd;

      // Roman sub-parts within this letter's range
      const ROMAN_PAT = /^\((i{1,3}|iv|vi{0,3}|ix|x)\)$/i;
      const romans = findInRange(l.page, l.topPx, lEnd.page, lEnd.topPx, ROMAN_PAT, 0.35);

      // Deduplicate romans
      const seenR = new Set();
      const rList = [];
      for (const r of romans) {
        const rv = r.text.replace(/[()]/g, '').toLowerCase();
        if (!seenR.has(rv)) { seenR.add(rv); rList.push({ ...r, roman: rv }); }
      }

      if (rList.length > 0) {
        // Emit per-roman coord
        for (const r of rList) {
          const key = `${qn}${l.letter}${r.roman}`;
          if (erKeys.has(key)) {
            const label = `Q ${qn}. (${l.letter}) (${r.roman})`;
            coords.push({ key, label, topPx: r.topPx, page: r.page });
          }
        }
        // Also emit the letter itself if it has its own ER key (rare but possible)
        const letterKey = `${qn}${l.letter}`;
        if (erKeys.has(letterKey) && !rList.length) {
          coords.push({ key: letterKey, label: `Q ${qn}. (${l.letter})`, topPx: l.topPx, page: l.page });
        }
      } else {
        // No roman sub-parts — emit letter-level coord
        const key = `${qn}${l.letter}`;
        if (erKeys.has(key)) {
          const label = `Q ${qn}. (${l.letter})`;
          coords.push({ key, label, topPx: l.topPx, page: l.page });
        }
      }
    }
  }

  return coords;
}

// ── MCQ coords (question-level only) ─────────────────────────────────────────

async function buildMCQCoords(pdfPath, erKeys) {
  const data  = new Uint8Array(readFileSync(pdfPath));
  const pdf   = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const qNums = [...erKeys].map(k => parseInt(k)).filter(n => !isNaN(n)).sort((a, b) => a - b);

  const qCoords = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page     = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    const tc       = await page.getTextContent();

    const candidates = [];
    for (const item of tc.items) {
      const str = item.str?.trim();
      if (!str || !/^\d+$/.test(str)) continue;
      if (!qNums.includes(parseInt(str))) continue;
      if (item.transform[4] > pageWidth * 0.20) continue;
      const topPx = Math.round(viewport.height - item.transform[5]);
      candidates.push({ qNum: parseInt(str), topPx, page: p });
    }

    // Remove axis clusters
    const sorted   = [...candidates].sort((a, b) => a.topPx - b.topPx);
    const clusterY = new Set();
    for (const it of sorted) {
      const nearby = sorted.filter(c => Math.abs(c.topPx - it.topPx) < 200);
      if (nearby.length >= 4) nearby.forEach(c => clusterY.add(c.topPx));
    }
    for (const c of candidates) {
      if (!clusterY.has(c.topPx)) qCoords.push(c);
    }
  }

  await pdf.destroy();

  // Deduplicate
  const seen = new Set();
  const out  = [];
  for (const c of qCoords.sort((a, b) => a.page - b.page || a.topPx - b.topPx)) {
    if (!seen.has(c.qNum)) { seen.add(c.qNum); out.push(c); }
  }

  return out.map(c => ({
    key:    String(c.qNum),
    label:  `Q ${c.qNum}`,
    topPx:  c.topPx,
    page:   c.page,
  }));
}

// ── Process one paper ─────────────────────────────────────────────────────────

async function processPaper(paperId) {
  const pdfPath   = join(ROOT, 'public', 'pdfs', `${paperId}.pdf`);
  const coordsPath = join(ROOT, 'public', 'question-coords', `${paperId}_coords.json`);

  if (!existsSync(pdfPath)) {
    console.log(`  SKIP (no PDF): ${paperId}`);
    return false;
  }

  const match = paperId.match(/(\d{4})_([msw]\d{2})_qp_(\d)(\d)/);
  if (!match) { console.log(`  SKIP (bad id): ${paperId}`); return false; }
  const [, subjectCode, sessionYear, component, variant] = match;
  const componentCode = `${component}${variant}`;

  // Load ER notes
  const erSpecific = join(ROOT, 'public', 'er-cache', `${subjectCode}_${sessionYear}_er_${componentCode}.json`);
  const erGeneral  = join(ROOT, 'public', 'er-cache', `${subjectCode}_${sessionYear}_er_notes.json`);

  let erData = null;
  if (existsSync(erSpecific))     erData = JSON.parse(readFileSync(erSpecific, 'utf8'));
  else if (existsSync(erGeneral)) erData = JSON.parse(readFileSync(erGeneral, 'utf8'));

  if (!erData) { console.log(`  SKIP (no ER): ${paperId}`); return false; }

  // Support both {notes:{...}} and flat {key:text}
  const erNotes = erData.notes ?? erData;
  if (!erNotes || Object.keys(erNotes).length === 0) {
    console.log(`  SKIP (empty ER): ${paperId}`);
    return false;
  }

  const erKeys   = new Set(Object.keys(erNotes));
  // Use theory-style (sub-part) coord detection if:
  //  - component is 3x/4x/5x/6x (traditional theory papers), OR
  //  - ER keys contain sub-part letters like "1a", "2b" (BST, Add Maths short-answer components 1x/2x)
  const hasSubpartKeys = [...erKeys].some(k => /^\d+[a-z]/.test(k));
  const isTheory = parseInt(component) >= 3 || hasSubpartKeys;

  console.log(`  ${paperId} [${isTheory ? 'theory' : 'MCQ'}] — ${erKeys.size} ER keys`);

  try {
    const coords = isTheory
      ? await buildTheoryCoords(pdfPath, erKeys)
      : await buildMCQCoords(pdfPath, erKeys);

    // Get total pages
    const data = new Uint8Array(readFileSync(pdfPath));
    const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
    const totalPages = pdf.numPages;
    await pdf.destroy();

    const output = {
      pdfPath:        `public/pdfs/${paperId}.pdf`,
      totalPages,
      coordsFound:    coords.length,
      erEntriesExpected: erKeys.size,
      coordinates:    coords,
    };

    writeFileSync(coordsPath, JSON.stringify(output, null, 2));
    console.log(`    ✓ ${coords.length}/${erKeys.size} coords → ${paperId}_coords.json`);
    return true;
  } catch (err) {
    console.error(`    ERROR: ${paperId} — ${err.message}`);
    return false;
  }
}

// ── Find all papers that have ER data ─────────────────────────────────────────

function findPapersWithER(filterPrefix) {
  const erCacheDir = join(ROOT, 'public', 'er-cache');

  const erFiles = readdirSync(erCacheDir).filter(f =>
    f.endsWith('.json') && !f.includes('er_notes')
  );

  const paperIds = [];
  for (const erFile of erFiles) {
    const m = erFile.match(/^(\d{4})_([msw]\d{2})_er_(\d)(\d)\.json$/);
    if (!m) continue;
    const [, subject, session, comp, variant] = m;
    const paperId = `${subject}_${session}_qp_${comp}${variant}`;
    if (filterPrefix && !paperId.startsWith(filterPrefix) && !subject.startsWith(filterPrefix)) continue;
    paperIds.push(paperId);
  }

  return [...new Set(paperIds)];
}

// ── Main ──────────────────────────────────────────────────────────────────────

const arg = process.argv[2];

let papers;
if (arg && arg.includes('_qp_')) {
  papers = [arg];
} else {
  papers = findPapersWithER(arg);
}

console.log(`\nGenerating coords for ${papers.length} paper(s)...\n`);

let success = 0, skipped = 0, failed = 0;
for (const paperId of papers) {
  const result = await processPaper(paperId);
  if (result === true) success++;
  else if (result === false) skipped++;
  else failed++;
  console.log();
}

console.log(`Done. ✓ ${success} written, — ${skipped} skipped, ✗ ${failed} failed.\n`);
