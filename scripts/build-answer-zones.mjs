/**
 * build-answer-zones.mjs
 *
 * Processes extracted dot-line zones and assigns each group of consecutive
 * dot lines to its sub-part key (from question-coords).
 *
 * Groups dot lines that are ≤ 32pt apart vertically into a single answer block.
 * Then assigns each block to the nearest sub-part that starts above it.
 *
 * Output: public/answer-zones/<paperId>.json  (enriched with subPartKey)
 *
 * Usage:
 *   node scripts/build-answer-zones.mjs 0610_m25_qp_42
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dirname, '..');
const AZ_DIR  = join(ROOT, 'public', 'answer-zones');
const QC_DIR  = join(ROOT, 'public', 'question-coords');
const TQ_DIR  = join(ROOT, 'public', 'theory-questions');

const paperId = process.argv[2];
if (!paperId) { console.error('Usage: node build-answer-zones.mjs <paperId>'); process.exit(1); }

const azPath = join(AZ_DIR, `${paperId}.json`);
const qcPath = join(QC_DIR, `${paperId}_coords.json`);
const tqPath = join(TQ_DIR, `${paperId}.json`);

if (!existsSync(azPath)) { console.error('Run extract-answer-zones.mjs first:', azPath); process.exit(1); }

const azData = JSON.parse(readFileSync(azPath, 'utf-8'));
const { pageWidth, pageHeight, zones } = azData;

// Load question coords — gives us { key, page, topPx } for each sub-part
// topPx is measured from the TOP of the page at 72dpi rendering (842pt page → 842px at scale 1)
let qcoords = [];
if (existsSync(qcPath)) {
  const qc = JSON.parse(readFileSync(qcPath, 'utf-8'));
  qcoords = qc.coordinates; // [{ key, label, page, topPx }]
}

// Load theory questions to know which sub-parts are diagram-only
let diagramOnlyKeys = new Set();
if (existsSync(tqPath)) {
  const tq = JSON.parse(readFileSync(tqPath, 'utf-8'));
  function walkParts(parts) {
    for (const p of parts) {
      if (p.diagramOnly) diagramOnlyKeys.add(p.id);
      if (p.parts?.length) walkParts(p.parts);
    }
  }
  for (const q of tq.questions) walkParts(q.parts);
}

// ── Step 1: Group individual dot lines into answer blocks ────────────────────
// Two consecutive dot lines belong to the same block if they are on the same page
// and their Y positions are within MAX_GAP pt of each other.
const MAX_GAP = 34; // pt — answer line spacing in Cambridge papers is ~26pt

const blocks = [];
let current = null;

for (const zone of zones) {
  if (!current || zone.page !== current.page || (zone.yPt - current.yEnd) > MAX_GAP) {
    // Start a new block
    if (current) blocks.push(current);
    current = {
      page: zone.page,
      yStart: zone.yPt,
      yEnd: zone.yPt + zone.heightPt,
      xStart: zone.xStartPt,
      xEnd: zone.xEndPt,
      lineCount: 1,
    };
  } else {
    // Extend current block
    current.yEnd = zone.yPt + zone.heightPt;
    current.xStart = Math.min(current.xStart, zone.xStartPt);
    current.xEnd   = Math.max(current.xEnd, zone.xEndPt);
    current.lineCount++;
  }
}
if (current) blocks.push(current);

console.log(`Grouped ${zones.length} dot lines → ${blocks.length} answer blocks`);

// ── Step 2: Assign each block to a sub-part key ──────────────────────────────
// For each block, find the sub-part whose question header is the closest above it
// on the same page (or the last question on the previous page).

// Build a flat sorted list of question anchors: { key, page, yTopDown }
// qcoords.topPx is from the extract-question-coordinates script,
// which uses a 72dpi rendering → scale factor: pageHeight(pt) / 842 ≈ 1
// Actually topPx is at scale=1 pdfjs rendering, so yPt ≈ topPx
const anchors = qcoords.map(c => ({
  key: c.key,
  page: c.page,
  yTopDown: c.topPx, // approximately in pt
})).sort((a, b) => a.page !== b.page ? a.page - b.page : a.yTopDown - b.yTopDown);

function findSubPartForBlock(block) {
  // Find the last anchor that is on the same page and above the block's start,
  // or on an earlier page.
  let best = null;
  for (const anchor of anchors) {
    if (anchor.page > block.page) break;
    if (anchor.page === block.page && anchor.yTopDown > block.yStart + 10) continue;
    best = anchor;
  }
  return best ? best.key : null;
}

const annotatedBlocks = blocks.map(block => ({
  ...block,
  subPartKey: findSubPartForBlock(block),
  diagramOnly: false, // will be set below
}));

// Mark diagram-only
for (const b of annotatedBlocks) {
  if (b.subPartKey && diagramOnlyKeys.has(b.subPartKey)) {
    b.diagramOnly = true;
  }
}

// ── Step 3: Write enriched output ────────────────────────────────────────────
const output = {
  paperId,
  pageWidth,
  pageHeight,
  blockCount: annotatedBlocks.length,
  blocks: annotatedBlocks,
};

writeFileSync(azPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`✓ Written ${annotatedBlocks.length} blocks to ${azPath}`);

// Summary by sub-part
const byKey = {};
for (const b of annotatedBlocks) {
  const k = b.subPartKey ?? '(unassigned)';
  if (!byKey[k]) byKey[k] = 0;
  byKey[k] += b.lineCount;
}
for (const [k, n] of Object.entries(byKey)) {
  console.log(`  ${k}: ${n} lines`);
}
