/**
 * extract-answer-zones.mjs
 *
 * For a theory QP PDF, finds the Y-coordinate (and page) of every answer zone —
 * i.e. every line of dots/dashes that students write on.
 *
 * Outputs: public/answer-zones/<paperId>.json
 * Shape:
 * {
 *   paperId, pageWidth, pageHeight,  // native PDF points (1pt = 1/72 inch)
 *   zones: [
 *     { page: 2, yPt: 520.4, xStartPt: 85, xEndPt: 510, heightPt: 14, subPartKey: "1ai" }
 *   ]
 * }
 *
 * Usage:
 *   node scripts/extract-answer-zones.mjs 0610_m25_qp_42
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = join(__dirname, '..');
const PDFS_DIR = join(__dirname, 'pastpapers');
const OUT_DIR  = join(ROOT, 'public', 'answer-zones');
const QC_DIR   = join(ROOT, 'public', 'question-coords');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url
).href;

const paperId = process.argv[2];
if (!paperId) { console.error('Usage: node extract-answer-zones.mjs <paperId>'); process.exit(1); }

const pdfPath = join(PDFS_DIR, `${paperId}.pdf`);
if (!existsSync(pdfPath)) { console.error('PDF not found:', pdfPath); process.exit(1); }

// Load question-coords to know which sub-part keys exist and on which pages
const coordsPath = join(QC_DIR, `${paperId}_coords.json`);
let coordsByPage = {}; // page -> sorted list of { key, topPx }
if (existsSync(coordsPath)) {
  const coords = JSON.parse(readFileSync(coordsPath, 'utf-8'));
  for (const c of coords.coordinates) {
    if (!coordsByPage[c.page]) coordsByPage[c.page] = [];
    coordsByPage[c.page].push(c);
  }
}

const data = new Uint8Array(readFileSync(pdfPath));
const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

let pageWidth = 0, pageHeight = 0;
const zones = [];

// Dot line detection: a text item is a dot/dash run if it is ≥ 90% dots/dashes/spaces
function isDotRun(str) {
  if (!str || str.length < 4) return false;
  const dotChars = (str.match(/[.\-_…·\u2022\u00b7]/g) ?? []).length;
  return dotChars / str.length >= 0.7;
}

for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  const page    = await pdf.getPage(pageNum);
  const vp      = page.getViewport({ scale: 1 });

  if (pageNum === 1) {
    pageWidth  = vp.width;
    pageHeight = vp.height;
  }

  const tc = await page.getTextContent();

  // Collect all dot-run items on this page
  // pdfjs Y is bottom-up; we convert to top-down: topY = pageHeight - item.transform[5]
  const dotItems = [];
  for (const item of tc.items) {
    if (!item.str) continue;
    if (isDotRun(item.str)) {
      const x = item.transform[4];
      const y = item.transform[5]; // bottom-up
      const topY = vp.height - y;  // top-down
      dotItems.push({
        x,
        yBottomUp: y,
        yTopDown: topY,
        width: item.width ?? 0,
        height: item.height ?? 12,
        str: item.str,
      });
    }
  }

  if (dotItems.length === 0) continue;

  // Group dot items that are on the same horizontal run (within 2pt vertically)
  // Sort by Y top-down (ascending = top of page first)
  dotItems.sort((a, b) => a.yTopDown - b.yTopDown);

  // Merge items on the same visual line (within 3pt of each other)
  const runs = [];
  for (const item of dotItems) {
    const last = runs[runs.length - 1];
    if (last && Math.abs(item.yTopDown - last.yCenter) < 4) {
      // Extend run
      last.xStart = Math.min(last.xStart, item.x);
      last.xEnd   = Math.max(last.xEnd, item.x + item.width);
      last.count++;
    } else {
      runs.push({
        page: pageNum,
        yCenter: item.yTopDown,
        yBottomUp: item.yBottomUp,
        xStart: item.x,
        xEnd: item.x + item.width,
        height: item.height,
        count: 1,
      });
    }
  }

  // Filter: only keep runs that span at least 100pt (real answer lines, not stray dots)
  for (const run of runs) {
    if (run.xEnd - run.xStart >= 80) {
      zones.push({
        page: run.page,
        yPt: Math.round(run.yCenter * 10) / 10,
        yBottomUpPt: Math.round(run.yBottomUp * 10) / 10,
        xStartPt: Math.round(run.xStart * 10) / 10,
        xEndPt: Math.round(run.xEnd * 10) / 10,
        heightPt: Math.round(run.height * 10) / 10,
      });
    }
  }
}

await pdf.destroy();

// Sort zones by page, then Y
zones.sort((a, b) => a.page !== b.page ? a.page - b.page : a.yPt - b.yPt);

const output = {
  paperId,
  pageWidth:  Math.round(pageWidth * 10) / 10,
  pageHeight: Math.round(pageHeight * 10) / 10,
  zoneCount: zones.length,
  zones,
};

const outPath = join(OUT_DIR, `${paperId}.json`);
writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`✓ ${paperId}: ${zones.length} answer zones, page size ${Math.round(pageWidth)}×${Math.round(pageHeight)}pt`);
console.log(`  → ${outPath}`);
