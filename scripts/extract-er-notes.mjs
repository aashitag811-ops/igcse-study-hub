/**
 * extract-er-notes.mjs
 *
 * Extracts ER notes per sub-part from Cambridge IGCSE ER PDFs.
 *
 * Theory papers (component 3x,4x,5x,6x):
 *   Keys: "1a", "1b", "1di", "1dii", etc.
 *   Labels: "Q 1. (a)", "Q 1. (d) (ii)", etc.
 *
 * MCQ / structured papers (component 1x,2x) that have inline sub-parts:
 *   If sub-parts (a),(b),(c) are detected inline, splits into "1a","1b","1c"
 *   Otherwise falls back to question-level key "1","2","3"
 *
 * Usage:
 *   node scripts/extract-er-notes.mjs 0610_m25        # one session
 *   node scripts/extract-er-notes.mjs                 # all ER PDFs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = join(__dirname, '..');
const PDFS_DIR = join(ROOT, 'scripts', 'pastpapers');
const OUT_DIR  = join(ROOT, 'public', 'er-cache');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url
).href;

// ── PDF text extraction ────────────────────────────────────────────────────────
// We keep ALL text from the PDF — no noise filtering during extraction.
// Noise is only stripped when we need to find section headers (Paper X/YY).
// This prevents mid-block cut-offs caused by copyright lines inside question text.

async function extractText(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc   = await page.getTextContent();
    const rows = {};
    for (const item of tc.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x: item.transform[4], str: item.str });
    }
    const ys = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const y of ys) {
      const line = rows[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/  +/g, ' ').trim();
      if (line) text += line + '\n';
    }
  }
  await pdf.destroy();
  return text;
}

// ── Section finder ────────────────────────────────────────────────────────────

function findComponentSection(fullText, subjectCode, component) {
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

  const rest = fullText.slice(startPos + 50);
  const endM = /Paper\s*\d{4}\/\d{2}\b/i.exec(rest);
  const endPos = endM ? startPos + 50 + endM.index : fullText.length;

  return fullText.slice(startPos, endPos);
}

// ── Noise detection — used ONLY to skip lines inside question blocks ──────────
// Conservative: only strip lines that are clearly standalone boilerplate,
// never strip lines that are part of real sentence flow.

const STANDALONE_NOISE_RE = [
  /^©\s*(UCLES\s*)?\d{4}/i,                              // © UCLES 2024
  // © with spaced year: "© 20 2 5" or "© 2 0 2 5"
  /^©\s*\d[\d\s]{3,7}\d\b/i,
  /^\d{4}\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}$/,               // 0606/12/M/J/25
  /^\[?Turn over\]?$/i,
  /^Cambridge I(GCSE|nternational)\b/i,
  /^Page \d+$/i,
  /^Principal Examiner Report\s*$/i,
  /^(BIOLOGY|CHEMISTRY|PHYSICS|MATHEMATICS|ECONOMICS|ACCOUNTING|ICT|ENGLISH|FRENCH|HINDI|BUSINESS|GLOBAL PERSPECTIVES)\s*$/i,
  /^Paper\s*\d{4}\/\d{2}\s*$/i,
  /^(Multiple Choice|Theory|Core|Extended)\s*(\(Core\)|\(Extended\))?\s*$/i,
  /^Key messages?\s*$/i,
  /^General comments?\s*$/i,
  /^Answers?\s*:/i,                                      // "Answers : (a)(i) 60480"
  // Merged pdfjs header: "0606AdditionalMathematicsMarch2025" or "© 2025 0606 Additional Mathematics"
  /^\d{4}[A-Za-z].{4,}\d{4}$/,
  // Subject+year header: "0580 Mathematics June 2013" (space after code)
  /^\d{4}\s+[A-Za-z].{4,}\d{2,4}$/,
  // "0606 Additional Mathematics March 20 2 5" — spaced year at end (20xx possibly with spaces)
  /^\d{4}.{6,}20[\d ]{0,6}\d$/,
  /^©\s*\d{4}\s+\d{4}\s+/i,
  // pdfjs-mangled copyright: "Ac 20 2 5" (© rendered as Ac, year spaced)
  // 1-4 alpha chars then space then 4-digit year possibly spaced
  /^[A-Za-z]{1,4}\s+\d[\d\s]{2,8}\d$/,
  // Standalone page number: "30", "38", "5 A", "12 A"
  /^\d{1,3}$/,
  /^\d{1,3}\s+[A-Z]$/,
  // Examiner report boilerplate footer lines
  /^Princip\s*a\s*l Examiner Report/i,
  /^for Teachers\s*$/i,
  /^Cambridge Assessment International Education/i,
];

function isNoiseLine(line) {
  const t = line.trim();
  if (!t || t.length < 2) return true;
  return STANDALONE_NOISE_RE.some(r => r.test(t));
}

// ── Inline sub-part splitter ───────────────────────────────────────────────────
// For question blocks where sub-parts appear as "(a) text (b) text" inline
// (common in Add Maths, BST, Physics structured ERs).
// Returns { "1a": "text", "1b": "text" } or null if no sub-parts found.
//
// CRITICAL: A (letter) marker is a real sub-part header ONLY if the character
// immediately before it (ignoring whitespace) is either:
//   • nothing  — it is at the very start of the text
//   • sentence-ending punctuation: . ! ?  (optionally followed by closing " ' ) ])
// If preceded by a word character / comma / colon it is a prose cross-reference
// ("in part (a)", "change in (a)(ii)") and must NOT trigger a split.

const INLINE_LETTER_RE = /\(\s*([a-hj-np-uw-z])\s*\)/g;  // (a)-(z) excluding i,o,q,v,x
const INLINE_ROMAN_WITHIN_RE = /\(\s*(i{1,3}|iv|vi{0,3}|ix|x)\s*\)/gi;

// Returns true if position `pos` in `text` is a valid sub-part boundary.
// A boundary is one of:
//   1. Start of string (pos === 0 or only whitespace precedes)
//   2. Preceded (after stripping whitespace) by sentence-ending punctuation:
//      . ! ? ' " ) ] ; and their Unicode equivalents
//   3. Preceded by one or more spaces AND what precedes those spaces is NOT
//      a short prose-reference word like "part", "in", "of", "see", "for",
//      "from", "at", "on", "to", "and", "or", "the", "with", "than", "both".
//      This catches every real boundary: math answers ("7 25 (b)"), MCQ option
//      text ("D statement ; (b)"), bullet-list endings ("...omitted (b) ..."),
//      while still correctly rejecting "part (b)", "in (a)", "see (c)" etc.
//
// NOTE: This function is used both in splitInlineSubparts (post-process splitting
// of already-joined text) and in parseQuestionBlock (line-by-line parsing).
// The prose-word exclusion is what keeps "...in part\n(c) but..." from falsely
// splitting during line-by-line parsing where prevEndsLine() handles the guard.
// Prose-reference words: if (letter) is preceded (after whitespace) by one of
// these words, it is a cross-reference ("in part (a)", "see parts (b)") and must
// NOT be treated as a sub-part header. All other word-endings are accepted as
// boundaries (end of MCQ option text, bullet list, math answer, etc.).
const PROSE_REF_WORDS = new Set([
  'part','parts','in','of','see','for','from','at','on','to','and','or','the',
  'with','than','both','between','either','section','sub','question','questions',
  'only','just','where','here','there','this','that','these','those',
  'by','as','per','via','any','each','all','no','not','also','above','below',
  'after','before','except','unlike','like','than','if','when','while',
  'then','so','do','did','does','was','were','had','has','have','be',
]);
function isSubpartBoundary(text, pos) {
  if (pos === 0) return true;
  // Walk backwards past any whitespace
  let i = pos - 1;
  while (i >= 0 && (text[i] === ' ' || text[i] === '\t')) i--;
  if (i < 0) return true; // only whitespace before → start of text
  const ch = text[i];
  // Rule 2: sentence-ending punctuation — . ! ? ; : ' " ) ] and Unicode equivalents
  if (/[.!?;:'"\u2019\u201d)\]]/.test(ch)) return true;
  // Rule 3: preceded by whitespace AND the word before the whitespace is NOT a
  // prose-reference word. Catches MCQ option endings ("D statement (b)"), math
  // answer endings ("7 25 (b)"), bullet list endings, colon-introduced lists, etc.
  // Rejects "part (b)", "in (a)", "parts (a)", "see (c)", etc.
  // ALSO rejects comma (',') — too ambiguous, appears in lists like "(a), (b)"
  // where only (a) is at a real boundary.
  if (i < pos - 1 && ch !== ',') {
    // Extract the word (all Latin letters) ending at position i
    let wordEnd = i;
    while (wordEnd >= 0 && /[a-zA-Z]/.test(text[wordEnd])) wordEnd--;
    const word = text.slice(wordEnd + 1, i + 1).toLowerCase();
    if (!PROSE_REF_WORDS.has(word)) return true;
  }
  return false;
}

// splitInlineSubparts returns:
//   null                       — no valid sub-parts found, use whole text as question key
//   { preamble, parts }        — preamble is text before first (a) (may be empty),
//                                parts is { "1a": "...", "1b": "...", ... }
function splitInlineSubparts(qNum, text) {
  // Find all (a),(b),(c)... markers and their positions
  const markers = [];
  let m;
  INLINE_LETTER_RE.lastIndex = 0;
  while ((m = INLINE_LETTER_RE.exec(text)) !== null) {
    markers.push({ letter: m[1].toLowerCase(), index: m.index, end: m.index + m[0].length });
  }

  if (markers.length < 2) return null; // need at least 2 sub-parts to split

  // Keep only markers that sit at a valid sentence boundary
  const boundaryMarkers = markers.filter(mk => isSubpartBoundary(text, mk.index));

  // ── Grouped-label expansion ────────────────────────────────────────────────
  // Handles: "(a), (b), (c) and (d) These parts were all well answered."
  // In this pattern only (a) is at a sentence boundary; (b)(c)(d) follow commas.
  // Detect the group and treat the entire "(a), (b), (c) and (d) text" block
  // as a virtual marker at position of (a), then inject the remaining letters
  // as extra boundary markers pointing to the same shared text.
  if (boundaryMarkers.length === 1 && boundaryMarkers[0].letter === 'a') {
    // Match "(a), (b), (c) and (d)" — first item may be followed by separator,
    // subsequent items may also be followed by separator, last item has no separator.
    // Pattern: first (x) with separator, then one or more (x) with optional separator
    const groupRE = /^(\(\s*[a-hj-np-uw-z]\s*\)(?:\s*[,/]\s*|\s+and\s+))+\(\s*[a-hj-np-uw-z]\s*\)/i;
    const afterA = text.slice(boundaryMarkers[0].index);
    const gm = groupRE.exec(afterA);
    if (gm) {
      // Extract all letters in the matched group header
      const groupLetterRE = /\(\s*([a-hj-np-uw-z])\s*\)/g;
      let gl;
      const groupLetters = [];
      groupLetterRE.lastIndex = 0;
      while ((gl = groupLetterRE.exec(gm[0])) !== null) {
        groupLetters.push(gl[1].toLowerCase());
      }
      if (groupLetters.length >= 2 && groupLetters[0] === 'a') {
        // Shared text starts right after the entire group header
        const groupHeaderEnd = boundaryMarkers[0].index + gm[0].length;
        const sharedText = text.slice(groupHeaderEnd).trim();
        const preamble = text.slice(0, boundaryMarkers[0].index).trim();
        const parts = {};
        for (const letter of groupLetters) {
          if (sharedText) parts[`${qNum}${letter}`] = sharedText;
        }
        return Object.keys(parts).length >= 2 ? { preamble, parts } : null;
      }
    }
  }

  // Must have at least 2 boundary markers to proceed
  if (boundaryMarkers.length < 2) return null;

  // Verify the boundary markers form a valid strictly-increasing sequence.
  // Rules:
  //   1. Must CONTAIN (a) — trim any boundary markers appearing before (a)
  //      (e.g. a prose-ref "(b)" that coincidentally sits at a sentence boundary
  //       before the real (a) block starts)
  //   2. From (a) onward: strictly increasing, no duplicates
  //   3. Gaps are allowed — prose-reference occurrences of skipped letters won't
  //      be at sentence boundaries so they simply won't appear in boundaryMarkers
  // Letters i, o, q, v, x are excluded from INLINE_LETTER_RE throughout.

  // Deduplicate: keep only the first occurrence of each letter
  const seenLetters = new Set();
  const dedupedMarkers = boundaryMarkers.filter(mk => {
    if (seenLetters.has(mk.letter)) return false;
    seenLetters.add(mk.letter);
    return true;
  });

  // Find (a) in the deduped list — trim everything before it
  const aIdx = dedupedMarkers.findIndex(mk => mk.letter === 'a');
  if (aIdx === -1) return null; // no (a) marker at all → can't form a valid sub-part sequence
  const fromA = dedupedMarkers.slice(aIdx);
  if (fromA.length < 2) return null;

  // Verify strictly increasing from (a) onward
  const fromALetters = fromA.map(mk => mk.letter);
  const isSequential = fromALetters.every((l, idx) => {
    if (idx === 0) return true;
    return l.charCodeAt(0) > fromALetters[idx - 1].charCodeAt(0); // strictly increasing
  });
  if (!isSequential) return null;

  // Replace boundaryMarkers with the valid sequence starting from (a)
  boundaryMarkers.length = 0;
  boundaryMarkers.push(...fromA);

  // Everything before the first (a) marker is a preamble for the question level
  const preamble = text.slice(0, boundaryMarkers[0].index).trim();

  const parts = {};
  for (let i = 0; i < boundaryMarkers.length; i++) {
    const start = boundaryMarkers[i].end;
    const end   = i + 1 < boundaryMarkers.length ? boundaryMarkers[i + 1].index : text.length;
    const chunk = text.slice(start, end).trim();
    if (!chunk) continue;

    const letter = boundaryMarkers[i].letter;

    // Check for inline roman sub-sub-parts within this chunk
    // Roman markers must also sit at sentence boundaries within the chunk
    const romanMarkers = [];
    INLINE_ROMAN_WITHIN_RE.lastIndex = 0;
    let rm;
    while ((rm = INLINE_ROMAN_WITHIN_RE.exec(chunk)) !== null) {
      if (isSubpartBoundary(chunk, rm.index)) {
        romanMarkers.push({ roman: rm[1].toLowerCase(), index: rm.index, end: rm.index + rm[0].length });
      }
    }

    if (romanMarkers.length >= 2) {
      // Split further into (i),(ii),...
      for (let ri = 0; ri < romanMarkers.length; ri++) {
        const rStart = romanMarkers[ri].end;
        const rEnd   = ri + 1 < romanMarkers.length ? romanMarkers[ri + 1].index : chunk.length;
        const rChunk = chunk.slice(rStart, rEnd).trim();
        if (rChunk) parts[`${qNum}${letter}${romanMarkers[ri].roman}`] = rChunk;
      }
    } else {
      parts[`${qNum}${letter}`] = chunk;
    }
  }

  return Object.keys(parts).length >= 2 ? { preamble, parts } : null;
}

// ── Theory ER parser ──────────────────────────────────────────────────────────

const LETTER_ROMAN_RE    = /^\s*\(([a-z])\)\s*\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)/i;
const LETTER_RE          = /^\s*\(([a-hj-np-uw-z])\)\s*(.*)/;  // excludes i,o,q,v,x
const ROMAN_STANDALONE_RE = /^\s*\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)/i;

function parseTheorySection(section) {
  const notes = {};

  const csq = /Comments on specific questions/i.exec(section);
  if (csq) section = section.slice(csq.index + csq[0].length);

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
  let currentKey   = null;
  let currentLines = [];

  const flush = () => {
    if (currentKey && currentLines.length) {
      // Filter noise lines but keep the text flowing — join with space
      const clean = currentLines
        .filter(l => !isNoiseLine(l))
        .map(l => l.trim())
        .filter(Boolean)
        .join(' ')
        // Strip trailing page-header noise: "0610BiologyMarch2025", "0606 ... March 20 2 5"
        .replace(/\s+\d{4}.{6,}20[\d ]{0,6}\d\s*$/, '')
        .replace(/\s+\d{4}[A-Za-z].{3,}\d{4}\s*$/, '')
        // Strip trailing © lines (normal and spaced-year)
        .replace(/\s+©\s*\d[\d\s]*\d.*$/, '')
        // Strip trailing "Ac 2025" / "Ac 20 2 5" pdfjs-mangled copyright
        .replace(/\s+[A-Za-z]{1,4}\s+\d[\d\s]{2,8}\d\s*$/, '')
        .trim();
      if (clean) notes[currentKey] = clean;
    }
    currentLines = [];
  };

  // A sub-part marker at the start of a line is a REAL header only if the
  // previous non-empty line ended a sentence (period, !, ?) or was itself a
  // sub-part header (currentLines is empty / just started).
  //
  // If the previous line ended mid-sentence (word, comma, 'part', 'in', etc.)
  // then the marker is a prose cross-reference ("...in part\n(c) but many...")
  // and should be treated as a continuation of the current block.
  const prevEndsLine = (lines) => {
    const last = lines.filter(l => l.trim()).pop();
    if (!last) return true; // nothing collected yet — allow header
    // Accept after sentence-ending punctuation, optionally followed by closing
    // quotes/brackets: e.g. `."` or `.)` or `.'`
    return /[.!?]["'\u2019\u201d)\]]*\s*$/.test(last.trim());
  };

  let inAnswersKey = false; // suppress lines after "Answers :" key at end of block
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // "Answers : ..." line marks end of question commentary — suppress rest
    if (/^Answers?\s*:/i.test(line)) { inAnswersKey = true; continue; }
    if (inAnswersKey) continue;

    // Skip standalone noise lines so they don't corrupt prevEndsLine
    if (isNoiseLine(line)) continue;

    // (a) (i) text
    let m = LETTER_ROMAN_RE.exec(line);
    if (m && prevEndsLine(currentLines)) {
      flush();
      const letter = m[1].toLowerCase();
      const roman  = m[2].toLowerCase();
      currentKey   = `${qNum}${letter}${roman}`;
      currentLines = m[3].trim() ? [m[3].trim()] : [];
      continue;
    }

    // (a) text
    m = LETTER_RE.exec(line);
    if (m && prevEndsLine(currentLines)) {
      flush();
      const letter = m[1].toLowerCase();
      currentKey   = `${qNum}${letter}`;
      currentLines = m[2].trim() ? [m[2].trim()] : [];
      continue;
    }

    // (i)/(ii)/... standalone
    m = ROMAN_STANDALONE_RE.exec(line);
    if (m && currentKey && prevEndsLine(currentLines)) {
      const letterMatch = currentKey.match(/^(\d+)([a-z])/);
      if (letterMatch) {
        flush();
        const roman  = m[1].toLowerCase();
        currentKey   = `${qNum}${letterMatch[2]}${roman}`;
        currentLines = m[2].trim() ? [m[2].trim()] : [];
        continue;
      }
    }

    // Continuation line
    if (currentKey) currentLines.push(rawLine);
  }
  flush();
}

// ── MCQ / structured ER parser ────────────────────────────────────────────────
// Handles:
//  1. Standard MCQ: "Question N\n" headers (most subjects)
//  2. Ranged blocks: "Question N to M\n" (0417 ICT)
//  3. Grouped ranges: "Questions N–M\n" (0520 French)
//  4. Inline prose: "Question N was..." (0455 Economics MCQ)
// Sub-parts (a),(b),(c) are detected and split where present.

function cleanBlock(rawLines) {
  return rawLines
    .filter(l => !isNoiseLine(l.trim()))
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+\d{4}.{6,}20[\d ]{0,6}\d\s*$/, '')
    .replace(/\s+\d{4}[A-Za-z].{3,}\d{4}\s*$/, '')
    .replace(/\s+©\s*\d[\d\s]*\d.*$/, '')
    .replace(/\s+[A-Za-z]{1,4}\s+\d[\d\s]{2,8}\d\s*$/, '')
    .trim();
}

function parseMCQSection(section) {
  const notes = {};

  const csq = /Comments on specific questions/i.exec(section);
  if (csq) section = section.slice(csq.index + csq[0].length);

  // --- Strategy 1: Standard "Question N\n" headers (most subjects) ---
  const Q_SINGLE_RE = /(?:^|\n)Question\s+(\d+)\s*\n/gi;
  const singleMatches = [...section.matchAll(Q_SINGLE_RE)];

  if (singleMatches.length > 0) {
    // Pre-build raw blocks so we can do sentence-bridging across boundaries
    const rawBlocks = singleMatches.map((m, qi) => {
      const blockStart = m.index + m[0].length;
      const blockEnd   = qi + 1 < singleMatches.length ? singleMatches[qi + 1].index : section.length;
      return { qNum: m[1], rawText: section.slice(blockStart, blockEnd) };
    });

    for (let qi = 0; qi < rawBlocks.length; qi++) {
      const { qNum, rawText } = rawBlocks[qi];

      // Join + splitInlineSubparts — handles BST/Economics/Math/Science styles.
      // For math papers (0606/0580/0625) sub-parts start at line beginnings too but
      // cleanBlock joins them and isSubpartBoundary detects the sentence boundaries.
      let text = cleanBlock(rawText.split('\n'));
      if (!text) continue;

      // Sentence-bridge: if this block ends mid-sentence (ends with comma, "In", "and", etc.)
      // pull the opening fragment from the next block (up to first sentence end).
      if (qi + 1 < rawBlocks.length) {
        const CUT_TAIL_RE = /[,;]\s*$|\b(in|and|or|the|of|a|was|that|to|with|for|at|while|next|question)\s*$/i;
        if (CUT_TAIL_RE.test(text)) {
          const nextClean = cleanBlock(rawBlocks[qi + 1].rawText.split('\n'));
          // Take everything up to (and including) the first sentence-ending punctuation
          const bridgeM = /^(.+?[.!?]["'\u2019\u201d)\]]*)(\s|$)/.exec(nextClean);
          if (bridgeM) text = text + ' ' + bridgeM[1];
        }
      }

      const split = splitInlineSubparts(qNum, text);
      if (split) {
        if (split.preamble) notes[qNum] = split.preamble;
        Object.assign(notes, split.parts);
      } else {
        notes[qNum] = text;
      }
    }
    return notes;
  }

  // --- Strategy 2: Ranged "Question N to M\n" (e.g. 0417) ---
  // Also catches single "Question N\n" without requiring exact \n boundary
  const Q_RANGE_RE = /(?:^|\n)Question\s+(\d+)(?:\s+to\s+(\d+))?\s*\n/gi;
  const rangeMatches = [...section.matchAll(Q_RANGE_RE)];

  if (rangeMatches.length > 0) {
    for (let qi = 0; qi < rangeMatches.length; qi++) {
      const qStart_num = rangeMatches[qi][1];
      const qEnd_num   = rangeMatches[qi][2] || qStart_num;
      const blockStart = rangeMatches[qi].index + rangeMatches[qi][0].length;
      const blockEnd   = qi + 1 < rangeMatches.length ? rangeMatches[qi + 1].index : section.length;
      const text       = cleanBlock(section.slice(blockStart, blockEnd).split('\n'));
      if (!text) continue;
      // For a range like "5 to 8", store as "5-8" key (or split inline if possible)
      const qNum = qStart_num === qEnd_num ? qStart_num : `${qStart_num}-${qEnd_num}`;
      const split = splitInlineSubparts(qNum, text);
      if (split) {
        if (split.preamble) notes[qNum] = split.preamble;
        Object.assign(notes, split.parts);
      } else {
        notes[qNum] = text;
      }
    }
    return notes;
  }

  // --- Strategy 3: "Questions N–M\n" grouped ranges (0520 French, similar) ---
  const Q_GROUP_RE = /(?:^|\n)Questions\s+(\d+)[–\-–](\d+)\s*\n/gi;
  const groupMatches = [...section.matchAll(Q_GROUP_RE)];

  if (groupMatches.length > 0) {
    for (let qi = 0; qi < groupMatches.length; qi++) {
      const from     = groupMatches[qi][1];
      const to       = groupMatches[qi][2];
      const blockStart = groupMatches[qi].index + groupMatches[qi][0].length;
      const blockEnd   = qi + 1 < groupMatches.length ? groupMatches[qi + 1].index : section.length;
      const text       = cleanBlock(section.slice(blockStart, blockEnd).split('\n'));
      if (!text) continue;
      notes[`${from}-${to}`] = text;
    }
    return notes;
  }

  // --- Strategy 4: Inline "Question N was/is..." prose (0455 Economics MCQ, 0520 French) ---
  // Questions appear as prose paragraphs with "Question N" embedded mid-text, no standalone header.
  // Sentence-bridge: if a block ends mid-sentence (e.g. French ERs discuss Q17-Q20 in one run-on
  // block that cuts at a boundary word like "In" or ","), pull in the opening fragment of the
  // next block to complete the sentence.
  const Q_INLINE_HEADER_RE = /(?:^|\n)Question\s+(\d+)\b/gi;
  const headerMatches = [...section.matchAll(Q_INLINE_HEADER_RE)];

  if (headerMatches.length > 0) {
    // Pre-build raw blocks for sentence-bridging
    const rawBlocks4 = headerMatches.map((m, qi) => {
      const blockStart = m.index + (m[0].startsWith('\n') ? 1 : 0);
      const blockEnd   = qi + 1 < headerMatches.length ? headerMatches[qi + 1].index : section.length;
      return { qNum: m[1], rawText: section.slice(blockStart, blockEnd) };
    });

    const CUT_TAIL_RE4 = /[,;]\s*$|\b(in|and|or|the|of|a|was|that|to|with|for|at|while|next|question)\s*$/i;
    for (let qi = 0; qi < rawBlocks4.length; qi++) {
      const { qNum, rawText } = rawBlocks4[qi];
      let text = cleanBlock(rawText.split('\n'));
      if (!text) continue;

      // Sentence-bridge: complete cut-off sentences from the next block
      if (qi + 1 < rawBlocks4.length && CUT_TAIL_RE4.test(text)) {
        const nextClean = cleanBlock(rawBlocks4[qi + 1].rawText.split('\n'));
        const bridgeM = /^(.+?[.!?]["'\u2019\u201d)\]]*)(\s|$)/.exec(nextClean);
        if (bridgeM) text = text + ' ' + bridgeM[1];
      }

      notes[qNum] = text;
    }
    return notes;
  }

  return notes;
}

// ── Label builder ─────────────────────────────────────────────────────────────

function keyToLabel(key) {
  const m = key.match(/^(\d+)([a-z])((i{1,3}|iv|vi{0,3}|ix|x))?$/);
  if (m) {
    const [, qn, letter, , roman] = m;
    return roman ? `Q ${qn}. (${letter}) (${roman})` : `Q ${qn}. (${letter})`;
  }
  if (/^\d+$/.test(key)) return `Q ${key}`;
  // Range keys: "5-8" → "Q 5–8"
  const rangeM = key.match(/^(\d+)-(\d+)$/);
  if (rangeM) return `Q ${rangeM[1]}–${rangeM[2]}`;
  return key;
}

function buildLabels(notes) {
  const labels = {};
  for (const key of Object.keys(notes)) labels[key] = keyToLabel(key);
  return labels;
}

// ── Post-process: split question-level keys with inline (a)(b)(c) sub-parts ──
// After parsing, some question-level keys (e.g. "1") contain inline sub-part
// markers "(a) text (b) text (c) text" that weren't resolved at parse time.
// Run splitInlineSubparts on them and inject the resulting sub-part keys,
// keeping the question-level key only if there's a preamble.
function postProcessNotes(notes) {
  const toDelete = [];
  const toAdd    = {};

  for (const [key, text] of Object.entries(notes)) {
    // Only act on bare question-number keys that don't already have sub-parts
    if (!/^\d+$/.test(key)) continue;
    if (!text) continue;

    const split = splitInlineSubparts(key, text);
    if (!split) continue;

    // Don't overwrite sub-part keys already present from the parser
    const hasExistingSubparts = Object.keys(notes).some(k => k !== key && k.startsWith(key) && /[a-z]/.test(k[key.length]));
    if (hasExistingSubparts) continue;

    toDelete.push(key);
    if (split.preamble) toAdd[key] = split.preamble;
    Object.assign(toAdd, split.parts);
  }

  for (const key of toDelete) delete notes[key];
  Object.assign(notes, toAdd);
  return notes;
}

// ── Process one ER PDF ────────────────────────────────────────────────────────

async function processErFile(erPath) {
  const filename = basename(erPath);
  const m = filename.match(/^(\d{4})_([msw]\d{2})_er\.pdf$/);
  if (!m) return;
  const [, subjectCode, sessionYear] = m;

  console.log(`Processing: ${filename}`);
  let fullText;
  try {
    fullText = await extractText(erPath);
  } catch (err) {
    console.error(`  ERROR: skipping ${filename} — ${err.message}`);
    return;
  }

  const components = [
    // Old format (0457 Global Perspectives uses 01/02/03/31/32/33)
    '01','02','03',
    // Standard format
    '11','12','13','21','22','23',
    '31','32','33','41','42','43',
    '51','52','53','61','62','63',
  ];

  for (const component of components) {
    const section = findComponentSection(fullText, subjectCode, component);
    if (!section) continue;

    const isTheory = parseInt(component[0]) >= 3;
    const rawNotes = isTheory ? parseTheorySection(section) : parseMCQSection(section);
    const notes = postProcessNotes(rawNotes);
    if (!Object.keys(notes).length) continue;

    const output = { notes, labels: buildLabels(notes) };
    const outPath = join(OUT_DIR, `${subjectCode}_${sessionYear}_er_${component}.json`);
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`  [${component}] ${Object.keys(notes).length} entries → ${basename(outPath)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const filter = process.argv[2];

const erFiles = readdirSync(PDFS_DIR)
  .filter(f => f.endsWith('_er.pdf') && (!filter || f.includes(filter)))
  .map(f => join(PDFS_DIR, f));

console.log(`\nFound ${erFiles.length} ER file(s)${filter ? ` matching '${filter}'` : ''}\n`);

for (const f of erFiles) {
  await processErFile(f);
  console.log();
}

console.log('Done.');
