/**
 * extract-er-notes.mjs
 *
 * Extracts ER notes per sub-part from Cambridge IGCSE ER PDFs.
 *
 * Theory papers (component 3x,4x,5x,6x):
 *   Keys: "1a", "1b", "1di", "1dii", etc.
 *   Labels: "Q 1. (a)", "Q 1. (d) (ii)", etc.
 *
 * MCQ papers (component 1x,2x):
 *   Keys: "4", "7", "22" (question numbers only)
 *   Labels: "Q 4", "Q 7", etc.
 *
 * Usage:
 *   node scripts/extract-er-notes.mjs 0610_m25        # one session
 *   node scripts/extract-er-notes.mjs                 # all ER PDFs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PDFS_DIR  = join(ROOT, 'scripts', 'pastpapers');
const OUT_DIR   = join(ROOT, 'public', 'er-cache');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url
).href;

// ── PDF text extraction ────────────────────────────────────────────────────────

const NOISE_RE = [
  /©\s*(UCLES\s*)?\d{4}/i,
  /\d{4}\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}/,
  /\[?Turn over\]?/i,
  /Cambridge I(GCSE|nternational)/i,
  /Page \d+/i,
  /^Principal Examiner Report/i,
  /^BIOLOGY\s*$/i,
  /^(Chemistry|Physics|Mathematics|Economics|Accounting|ICT|English|French|Hindi|Business|Global)\s*$/i,
  /^Paper\s*\d{4}\/\d{2}\s*$/i,
  /^(Multiple Choice|Theory|Core|Extended)\s*(\(Core\)|\(Extended\))?\s*$/i,
  /^Key messages?\s*$/i,
  /^General comments?\s*$/i,
  // pdfjs-merged noise: e.g. "0610BiologyMarch2025" or "0610 Biology March 2025"
  /^\d{4}\s*[A-Za-z]+\s*[A-Za-z]+\s*\d{4}$/,
];

function isNoise(line) {
  const t = line.trim();
  if (!t || t.length < 3) return true;
  return NOISE_RE.some(r => r.test(t));
}

async function extractText(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc   = await page.getTextContent();
    // Group items by rounded Y to reconstruct lines
    const rows = {};
    for (const item of tc.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x: item.transform[4], str: item.str });
    }
    const ys = Object.keys(rows).map(Number).sort((a, b) => b - a); // top-down
    for (const y of ys) {
      const line = rows[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/  +/g, ' ').trim();
      // Keep ALL lines — section headers like "Paper0610/32" must be preserved for section finding.
      // Noise filtering happens later when parsing content lines.
      if (line.trim()) text += line + '\n';
    }
  }
  await pdf.destroy();
  return text;
}

// ── Section finder ────────────────────────────────────────────────────────────

function findComponentSection(fullText, subjectCode, component) {
  const pn = component[0]; // paper number

  // pdfjs sometimes merges words: "Paper0610/32" instead of "Paper 0610/32"
  const patterns = [
    new RegExp(`Paper\\s*${subjectCode}/${component}\\b`, 'i'),
    new RegExp(`Paper\\s*0*${component}\\b`, 'i'),
  ];

  let startPos = -1;
  for (const re of patterns) {
    const m = re.exec(fullText);
    if (m) { startPos = m.index; break; }
  }
  if (startPos === -1) return null;

  // End = next Paper section header (at least 50 chars away)
  const rest = fullText.slice(startPos + 50);
  const endM = /Paper\s*\d{4}\/\d{2}\b/i.exec(rest);
  const endPos = endM ? startPos + 50 + endM.index : fullText.length;

  return fullText.slice(startPos, endPos);
}

// ── Theory ER parser ──────────────────────────────────────────────────────────

// Regex for sub-part markers at start of line
const LETTER_ROMAN_RE = /^\s*\(([a-z])\)\s*\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)/i;
const LETTER_RE       = /^\s*\(([a-hj-uw-z])\)\s*(.*)/;   // excludes i,v,x to avoid roman confusion
const ROMAN_STANDALONE_RE = /^\s*\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)/i;

function parseTheorySection(section) {
  const notes = {};

  // Trim to after "Comments on specific questions"
  const csq = /Comments on specific questions/i.exec(section);
  if (csq) section = section.slice(csq.index + csq[0].length);

  // Split by Question N
  const Q_RE = /(?:^|\n)Question\s+(\d+)\s*\n/gi;
  const qMatches = [...section.matchAll(Q_RE)];

  for (let qi = 0; qi < qMatches.length; qi++) {
    const qNum   = qMatches[qi][1];
    const qStart = qMatches[qi].index + qMatches[qi][0].length;
    const qEnd   = qi + 1 < qMatches.length ? qMatches[qi + 1].index : section.length;
    const block  = section.slice(qStart, qEnd);
    parseQuestionBlock(qNum, block, notes);
  }

  return notes;
}

function parseQuestionBlock(qNum, block, notes) {
  const lines = block.split('\n');
  let currentLetter = null;
  let currentRoman  = null;
  let currentKey    = null;
  let currentLines  = [];

  const flush = () => {
    if (currentKey && currentLines.length) {
      let text = currentLines.map(l => l.trim()).filter(Boolean).join(' ');
      // Strip trailing merged page-header noise: e.g. "...bile. 0610BiologyMarch2025"
      text = text.replace(/\s+\d{4}[A-Za-z]{2,}[A-Za-z]+\d{4}\s*$/, '').trim();
      if (text) notes[currentKey] = text;
    }
    currentLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || isNoise(line)) continue;

    // (a) (i) text
    let m = LETTER_ROMAN_RE.exec(line);
    if (m) {
      flush();
      currentLetter = m[1].toLowerCase();
      currentRoman  = m[2].toLowerCase();
      currentKey    = `${qNum}${currentLetter}${currentRoman}`;
      if (m[3].trim()) currentLines = [m[3].trim()];
      continue;
    }

    // (a) text  — pure letter sub-part (not i/v/x)
    m = LETTER_RE.exec(line);
    if (m) {
      flush();
      currentLetter = m[1].toLowerCase();
      currentRoman  = null;
      currentKey    = `${qNum}${currentLetter}`;
      if (m[2].trim()) currentLines = [m[2].trim()];
      continue;
    }

    // (i)/(ii)/... standalone — belongs to current letter
    m = ROMAN_STANDALONE_RE.exec(line);
    if (m && currentLetter) {
      flush();
      currentRoman  = m[1].toLowerCase();
      currentKey    = `${qNum}${currentLetter}${currentRoman}`;
      if (m[2].trim()) currentLines = [m[2].trim()];
      continue;
    }

    // Continuation
    if (currentKey) currentLines.push(line);
  }
  flush();
}

// ── MCQ ER parser ─────────────────────────────────────────────────────────────

function parseMCQSection(section) {
  const notes = {};

  const csq = /Comments on specific questions/i.exec(section);
  if (csq) section = section.slice(csq.index + csq[0].length);

  const Q_RE = /(?:^|\n)Question\s+(\d+)\s*\n/gi;
  const qMatches = [...section.matchAll(Q_RE)];

  for (let qi = 0; qi < qMatches.length; qi++) {
    const qNum   = qMatches[qi][1];
    const qStart = qMatches[qi].index + qMatches[qi][0].length;
    const qEnd   = qi + 1 < qMatches.length ? qMatches[qi + 1].index : section.length;
    const lines  = section.slice(qStart, qEnd).split('\n')
      .map(l => l.trim()).filter(l => l && !isNoise(l));
    if (lines.length) notes[qNum] = lines.join(' ');
  }

  return notes;
}

// ── Label builder ─────────────────────────────────────────────────────────────

function keyToLabel(key) {
  // Theory sub-part: e.g. "1a", "1di", "1dii"
  const m = key.match(/^(\d+)([a-z])(i{1,3}|iv|vi{0,3}|ix|x)?$/);
  if (m) {
    const [, qn, letter, roman] = m;
    return roman ? `Q ${qn}. (${letter}) (${roman})` : `Q ${qn}. (${letter})`;
  }
  // MCQ: just a number
  if (/^\d+$/.test(key)) return `Q ${key}`;
  return key;
}

function buildLabels(notes) {
  const labels = {};
  for (const key of Object.keys(notes)) labels[key] = keyToLabel(key);
  return labels;
}

// ── Process one ER PDF ────────────────────────────────────────────────────────

async function processErFile(erPath) {
  const filename = basename(erPath);
  const m = filename.match(/^(\d{4})_([msw]\d{2})_er\.pdf$/);
  if (!m) return;
  const [, subjectCode, sessionYear] = m;

  console.log(`Processing: ${filename}`);
  const fullText = await extractText(erPath);

  const components = [
    '11','12','13','21','22','23',
    '31','32','33','41','42','43',
    '51','52','53','61','62','63',
  ];

  for (const component of components) {
    const section = findComponentSection(fullText, subjectCode, component);
    if (!section) continue;

    const isTheory = parseInt(component[0]) >= 3;
    const notes = isTheory ? parseTheorySection(section) : parseMCQSection(section);
    if (!Object.keys(notes).length) continue;

    const output = { notes, labels: buildLabels(notes) };
    const outPath = join(OUT_DIR, `${subjectCode}_${sessionYear}_er_${component}.json`);
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`  [${component}] ${Object.keys(notes).length} entries → ${basename(outPath)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const filter = process.argv[2]; // e.g. "0610_m25"

const erFiles = readdirSync(PDFS_DIR)
  .filter(f => f.endsWith('_er.pdf') && (!filter || f.includes(filter)))
  .map(f => join(PDFS_DIR, f));

console.log(`\nFound ${erFiles.length} ER file(s)${filter ? ` matching '${filter}'` : ''}\n`);

for (const f of erFiles) {
  await processErFile(f);
  console.log();
}

console.log('Done.');
