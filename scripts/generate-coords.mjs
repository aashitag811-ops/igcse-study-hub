/**
 * generate-coords.mjs
 *
 * Extracts question Y-coordinates from Cambridge IGCSE QP PDFs.
 * For each QP that has a matching er-cache JSON, reads the PDF text layer,
 * finds question number markers, and writes a coords JSON to public/question-coords/.
 *
 * Usage:
 *   node scripts/generate-coords.mjs                  # all subjects with ER data
 *   node scripts/generate-coords.mjs 0610             # single subject
 *   node scripts/generate-coords.mjs 0610_m25_qp_12   # single paper
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Dynamically import pdfjs-dist (ESM) — use legacy Node-compatible build
const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
// In Node.js, use the bundled worker directly
const { GlobalWorkerOptions } = pdfjsLib;
GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

/**
 * Extract text items with their Y positions from a PDF file.
 * Returns array of { text, page, y } sorted by page then y.
 */
async function extractTextItems(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
  const pdf = await loadingTask.promise;

  const items = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      // PDF coords are bottom-up; convert to top-down px
      const topPx = Math.round(viewport.height - item.transform[5]);
      items.push({
        text: item.str.trim(),
        page: pageNum,
        topPx,
        // raw y for deduplication
        rawY: item.transform[5],
      });
    }
  }

  await pdf.destroy();
  return items;
}

/**
 * From text items, find question number positions.
 * Looks for standalone integers (1, 2, 3...) that appear at the left margin
 * and match question numbers present in the ER notes.
 *
 * Strategy:
 *  - Match text items that are just a number (or "(a)" style for sub-questions)
 *  - Filter to those whose x position is near the left margin (< 15% of page width)
 *  - Cross-reference against the question numbers in the ER JSON
 */
async function findQuestionCoords(pdfPath, erQuestionNums) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
  const pdf = await loadingTask.promise;

  // Collect ALL left-margin numbers per page first, then filter out axis clusters
  const candidatesPerPage = {};
  const target = new Set(erQuestionNums.map(String));

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    const textContent = await page.getTextContent();

    const pageCandidates = [];

    for (const item of textContent.items) {
      const str = item.str.trim();
      if (!str) continue;
      if (!/^\d+$/.test(str)) continue;

      const x = item.transform[4];
      // Only left ~20% of page
      if (x > pageWidth * 0.20) continue;

      const topPx = Math.round(pageHeight - item.transform[5]);
      pageCandidates.push({ num: str, x, topPx, pageNum });
    }

    candidatesPerPage[pageNum] = pageCandidates;
  }

  await pdf.destroy();

  const found = [];

  for (const [pageNum, candidates] of Object.entries(candidatesPerPage)) {
    // Detect axis label clusters: 3+ numbers within 200px vertical span
    // Sort by Y position
    const sorted = [...candidates].sort((a, b) => a.topPx - b.topPx);

    // Build a set of Y positions that are part of a dense cluster
    const clusterY = new Set();
    for (let i = 0; i < sorted.length; i++) {
      // Count how many other numbers are within 200px of this one
      const nearby = sorted.filter(c => Math.abs(c.topPx - sorted[i].topPx) < 200);
      if (nearby.length >= 4) {
        // This is likely a graph axis — mark all nearby as cluster members
        nearby.forEach(c => clusterY.add(c.topPx));
      }
    }

    for (const c of candidates) {
      if (!target.has(c.num)) continue;
      if (clusterY.has(c.topPx)) continue; // skip axis labels
      found.push({ qNum: parseInt(c.num), topPx: c.topPx, page: parseInt(pageNum), text: c.num });
    }
  }

  // Deduplicate: keep first occurrence of each question number
  const seen = new Set();
  const deduped = [];
  for (const item of found.sort((a, b) => a.page - b.page || a.topPx - b.topPx)) {
    if (!seen.has(item.qNum)) {
      seen.add(item.qNum);
      deduped.push(item);
    }
  }

  return deduped.sort((a, b) => a.qNum - b.qNum);
}

/**
 * Process a single QP file given its paperId (e.g. "0610_m25_qp_12")
 */
async function processPaper(paperId) {
  const pdfPath = join(ROOT, 'public', 'pdfs', `${paperId}.pdf`);
  const coordsPath = join(ROOT, 'public', 'question-coords', `${paperId}_coords.json`);

  if (!existsSync(pdfPath)) {
    console.log(`  SKIP (no PDF): ${paperId}`);
    return false;
  }

  // Parse paperId to find matching ER cache file
  const match = paperId.match(/(\d{4})_([msw]\d{2})_qp_(\d)(\d)/);
  if (!match) {
    console.log(`  SKIP (bad id): ${paperId}`);
    return false;
  }
  const [, subjectCode, sessionYear, component, variant] = match;
  const componentCode = `${component}${variant}`;

  // Load ER notes to get question numbers
  const erSpecific = join(ROOT, 'public', 'er-cache', `${subjectCode}_${sessionYear}_er_${componentCode}.json`);
  const erGeneral  = join(ROOT, 'public', 'er-cache', `${subjectCode}_${sessionYear}_er_notes.json`);

  let erNotes = null;
  if (existsSync(erSpecific)) {
    erNotes = JSON.parse(readFileSync(erSpecific, 'utf8'));
  } else if (existsSync(erGeneral)) {
    erNotes = JSON.parse(readFileSync(erGeneral, 'utf8'));
  }

  if (!erNotes || Object.keys(erNotes).length === 0) {
    console.log(`  SKIP (no ER notes): ${paperId}`);
    return false;
  }

  const erQuestionNums = Object.keys(erNotes).filter(k => /^\d+$/.test(k));
  if (erQuestionNums.length === 0) {
    console.log(`  SKIP (no numeric question keys): ${paperId}`);
    return false;
  }

  console.log(`  Processing: ${paperId} (ER questions: ${erQuestionNums.join(', ')})`);

  try {
    const coords = await findQuestionCoords(pdfPath, erQuestionNums);

    // Get total pages for metadata
    const data = new Uint8Array(readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
    const totalPages = pdf.numPages;
    await pdf.destroy();

    const output = {
      pdfPath: `public/pdfs/${paperId}.pdf`,
      totalPages,
      questionsFound: coords.length,
      erQuestionsExpected: erQuestionNums.length,
      coordinates: coords,
    };

    writeFileSync(coordsPath, JSON.stringify(output, null, 2));
    console.log(`  ✓ Wrote ${coords.length}/${erQuestionNums.length} question coords → ${coordsPath}`);
    return true;
  } catch (err) {
    console.error(`  ERROR processing ${paperId}:`, err.message);
    return false;
  }
}

/**
 * Find all QP paperIds that have ER notes, filtered by optional subject/paperId prefix.
 */
function findPapersWithER(filterPrefix) {
  const erCacheDir = join(ROOT, 'public', 'er-cache');
  const pdfsDir    = join(ROOT, 'public', 'pdfs');

  // Get all unique subject+session+component combos from er-cache
  const erFiles = readdirSync(erCacheDir).filter(f => f.endsWith('.json') && !f.includes('er_notes'));

  const paperIds = [];

  for (const erFile of erFiles) {
    // e.g. 0610_m25_er_12.json → subject=0610, session=m25, component=12
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
  // Single paper
  papers = [arg];
} else {
  // All papers (optionally filtered by subject code prefix)
  papers = findPapersWithER(arg);
}

console.log(`\nGenerating coords for ${papers.length} paper(s)...\n`);

let success = 0, skipped = 0, failed = 0;

for (const paperId of papers) {
  const result = await processPaper(paperId);
  if (result === true) success++;
  else if (result === false) skipped++;
  else failed++;
}

console.log(`\nDone. ✓ ${success} written, ${skipped} skipped, ${failed} failed.\n`);
