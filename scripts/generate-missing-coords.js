#!/usr/bin/env node
/**
 * generate-missing-coords.js
 *
 * For every ER-cache file that lacks a matching question-coords JSON,
 * synthesise a coords file so that ER buttons appear on the PDF viewer.
 *
 * Strategy:
 *   - Read the ER cache JSON to get the list of question keys.
 *   - For MCQ-style keys (pure integers, e.g. "3", "25", "40") distribute
 *     them evenly across estimated page count (40 MCQ ≈ 16 pages of 2-3 per page).
 *   - For theory-style keys (sub-part strings like "1a", "2bi", "key_messages")
 *     stack them sequentially on increasing pages.
 *   - Special keys: "key_messages" → page 1, top; "general_comments" → page 1, ~150px.
 *
 * Output: public/question-coords/{subject}_{session}_qp_{comp}_coords.json
 */

const fs   = require('fs');
const path = require('path');

const ER_DIR     = path.join(__dirname, '..', 'public', 'er-cache');
const COORD_DIR  = path.join(__dirname, '..', 'public', 'question-coords');

// ---------- helpers ----------

function isNumericKey(k) {
  return /^\d+$/.test(k);
}

function isMCQStyle(keys) {
  // MCQ papers: all note keys are pure integers (question numbers like "3","25","40")
  const noteKeys = keys.filter(k => k !== 'key_messages' && k !== 'general_comments' && k !== 'labels');
  return noteKeys.length > 0 && noteKeys.every(isNumericKey);
}

function buildLabel(key) {
  if (key === 'key_messages')    return 'Key Messages';
  if (key === 'general_comments') return 'General Comments';
  if (isNumericKey(key)) return `Q ${key}`;
  // sub-part: "1a" → "Q 1. (a)", "1ai" → "Q 1. (a) (i)", "2bi" → "Q 2. (b) (i)"
  const m = key.match(/^(\d+)([a-z]*)([ivx]*)$/i);
  if (!m) return `Q ${key}`;
  let label = `Q ${m[1]}`;
  if (m[2]) label += `. (${m[2]})`;
  if (m[3]) label += ` (${m[3]})`;
  return label;
}

function synthesiseCoords(keys, paperId) {
  // Separate special keys from content keys
  const special = keys.filter(k => k === 'key_messages' || k === 'general_comments');
  const content = keys.filter(k => k !== 'key_messages' && k !== 'general_comments');

  const coordinates = [];

  // Special keys always land on page 1
  let specialTop = 60;
  special.sort((a, b) => {
    // key_messages first
    if (a === 'key_messages') return -1;
    if (b === 'key_messages') return 1;
    return 0;
  }).forEach(k => {
    coordinates.push({ key: k, label: buildLabel(k), topPx: specialTop, page: 1 });
    specialTop += 120;
  });

  if (content.length === 0) return coordinates;

  if (isMCQStyle(content)) {
    // MCQ: questions numbered. 40 MCQ ≈ 16 pages, so ~2-3 per page (A4 page ≈ 842px at scale 1).
    // We place ~3 buttons per page, spaced ~280px apart, starting on page 2 (cover is page 1).
    const sorted = content.map(Number).sort((a, b) => a - b);
    const PER_PAGE   = 3;
    const PAGE_START = 2;
    const TOP_FIRST  = 100;
    const STEP       = 280;

    sorted.forEach((qNum, idx) => {
      const groupIdx = Math.floor(idx / PER_PAGE);
      const posInGroup = idx % PER_PAGE;
      const page = PAGE_START + groupIdx;
      const topPx = TOP_FIRST + posInGroup * STEP;
      coordinates.push({ key: String(qNum), label: buildLabel(String(qNum)), topPx, page });
    });

  } else {
    // Theory / structured: sub-part keys. Group by top-level question.
    // Each top-level question gets its own "page" spread.
    // We use 120px apart on the same page for sub-parts of the same question,
    // and advance page every 6 sub-parts.
    let page = special.length > 0 ? 2 : 1;
    let topPx = 80;
    const STEP     = 140;
    const MAX_PAGE = 6; // max sub-parts per page

    content.forEach((key, idx) => {
      if (idx > 0 && idx % MAX_PAGE === 0) {
        page++;
        topPx = 80;
      }
      coordinates.push({ key, label: buildLabel(key), topPx, page });
      topPx += STEP;
    });
  }

  return coordinates;
}

// ---------- main ----------

const erFiles = fs.readdirSync(ER_DIR).filter(f =>
  /^\d{4}_[msw]\d{2}_er_\d+\.json$/.test(f)
);

let generated = 0;
let skipped   = 0;

for (const erFile of erFiles) {
  const m = erFile.match(/^(\d{4})_([msw]\d{2})_er_(\d+)\.json$/);
  if (!m) continue;
  const [, subject, session, comp] = m;

  const coordFile = `${subject}_${session}_qp_${comp}_coords.json`;
  const coordPath = path.join(COORD_DIR, coordFile);

  if (fs.existsSync(coordPath)) {
    skipped++;
    continue;
  }

  // Read ER cache
  let erData;
  try {
    erData = JSON.parse(fs.readFileSync(path.join(ER_DIR, erFile), 'utf-8'));
  } catch {
    console.error(`  SKIP (parse error): ${erFile}`);
    skipped++;
    continue;
  }

  // Support both flat format { "1": "...", ... } and new format { notes: {...}, labels: {...} }
  const notes  = erData.notes || erData;
  const labels = erData.labels || {};

  // Keys = all keys in notes (exclude 'labels' if flat)
  const keys = Object.keys(notes).filter(k => k !== 'labels');
  if (keys.length === 0) {
    skipped++;
    continue;
  }

  const paperId = `${subject}_${session}_qp_${comp}`;
  const coordinates = synthesiseCoords(keys, paperId);

  // Override labels from ER labels where available
  coordinates.forEach(c => {
    if (labels[c.key]) c.label = labels[c.key];
  });

  const output = {
    pdfPath: `public/pdfs/${paperId}.pdf`,
    totalPages: 0,   // unknown without parsing PDF
    coordsFound: coordinates.length,
    erEntriesExpected: keys.length,
    synthetic: true, // flag: positions are estimated, not extracted from PDF
    coordinates,
  };

  fs.writeFileSync(coordPath, JSON.stringify(output, null, 2));
  generated++;

  if (generated <= 10 || generated % 50 === 0) {
    console.log(`  Generated: ${coordFile} (${coordinates.length} coords)`);
  }
}

console.log(`\nDone. Generated: ${generated}, Skipped (already exist): ${skipped}`);
