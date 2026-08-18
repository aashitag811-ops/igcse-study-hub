/**
 * parse-theory-qp.mjs
 *
 * Extracts structured question JSON from Cambridge IGCSE theory QP PDFs.
 * Works on papers 3x, 4x, 5x, 6x (Core and Extended).
 *
 * Output: public/theory-questions/<paperId>.json
 *
 * Usage:
 *   node scripts/parse-theory-qp.mjs 0610_m25_qp_42        # one paper
 *   node scripts/parse-theory-qp.mjs 0610 42               # all 0610 component 42 papers
 *   node scripts/parse-theory-qp.mjs 0610                  # all 0610 theory papers
 *   node scripts/parse-theory-qp.mjs                       # all theory QPs in pastpapers/
 *
 * Output JSON shape per paper:
 * {
 *   paperId: "0610_m25_qp_42",
 *   subjectCode: "0610",
 *   session: "m25",
 *   component: "42",
 *   totalMarks: 80,
 *   questions: [
 *     {
 *       id: "1",                        // top-level question number
 *       marks: null,                    // total marks for Q1 (from [Total: N])
 *       context: "Fig. 1.1 shows...",   // stem / context paragraph (may reference figs)
 *       parts: [
 *         {
 *           id: "1a",
 *           label: "(a)",
 *           text: "State two functions of the cell membrane.",
 *           marks: 2,
 *           type: "state",              // question type (see TYPE_MAP)
 *           answerType: "short_answer", // UI input type
 *           hasDiagramRef: true,        // mentions a Fig. or Table
 *           diagramOnly: false,         // true = cannot be answered in text UI
 *           parts: [                    // nested sub-parts (i), (ii) etc
 *             { id: "1ai", label: "(i)", text: "...", marks: 1, type: "state", answerType: "short_answer", ... }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PDFS_DIR  = join(__dirname, 'pastpapers');
const OUT_DIR   = join(ROOT, 'public', 'theory-questions');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ── PDF text extraction (same approach as extract-er-notes.mjs) ──────────────

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url
).href;

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
      rows[y].push({ x: item.transform[4], w: item.width ?? 0, str: item.str });
    }
    const ys = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const y of ys) {
      const sorted = rows[y].sort((a, b) => a.x - b.x);
      let line = '';
      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        if (i === 0) {
          line += item.str;
        } else {
          const prev = sorted[i - 1];
          const gap  = item.x - (prev.x + prev.w);
          line += gap < 1.5 ? item.str : ' ' + item.str;
        }
      }
      line = line.replace(/  +/g, ' ').trim();
      if (line) text += line + '\n';
    }
  }
  await pdf.destroy();
  return text;
}

// ── Noise stripping ──────────────────────────────────────────────────────────
// Only strip lines that are clearly standalone page chrome — never content lines.

const NOISE_RE = [
  // Barcode-like numeric lines  "* 0000800000001 *"
  /^\* [\d ]+ \*$/,
  // Unicode garbage (3-char runs of non-ASCII) — encoding artefacts
  /^[\x80-\uFFFF]{3,}$/,
  // Page header: "0610/42/F/M/25" OR "0610/42/M/J/25" (with optional © UCLES YYYY prefix)
  /^\d{4}\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}$/,
  /^©\s*(UCLES\s*)?\d{4}$/i,
  /^\d{4}\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}\s*©.*$/i,
  // "DO NOT WRITE IN THIS MARGIN"
  /^DO NOT WRITE IN THIS MARGIN$/i,
  // Standalone page numbers
  /^\d{1,3}$/,
  // Turn over / Blank page
  /^\[?Turn over\]?$/i,
  /^BLANK PAGE$/i,
  // DFD (Core paper artefact)
  /^DFD$/,
  // Copyright footer lines
  /^©\s*(UCLES|Cambridge)\s+\d{4}/i,
  /^Cambridge Assessment International Education/i,
  /^This document has \d+ pages?/i,
  /^Permission to reproduce/i,
  /^All rights reserved/i,
  // Cover-page instructions lines
  /^You must answer on the question paper\.?$/i,
  /^No additional materials are needed\.?$/i,
  /^Answer all questions\.?$/i,
  /^INSTRUCTIONS$/,
  /^INFORMATION$/,
  /^The total mark for this paper is \d+/i,
  /^The number of marks for each question/i,
  /^DC\s*\(/,
  /^Write your (name|answer)/i,
  /^Use a black or dark blue pen/i,
  /^Do not use an erasable pen/i,
  /^Do not write on any bar codes/i,
  /^You may use a calculator/i,
  /^You should show all your working/i,
  // Bullet-prefixed cover page lines (● Answer all questions.)
  /^●/,
  // "N hour(s) N minutes" time allowance
  /^\d+\s+hours?\s+(\d+\s+minutes?)?/i,
  /^\d+\s+minutes?/i,
  // Candidate/centre number box labels
  /^Centre number|^Candidate number/i,
  /^First name|^Last name|^Signature/i,
  // "DC (WW/SG) 341318/4" print code
  /^DC\s*\(\s*[A-Z]+/,
];

function isNoise(line) {
  const t = line.trim();
  if (!t || t.length < 2) return true;
  // Strip any line containing only control characters (+ commas/spaces)
  if (/^[,\s\u0000-\u001F\u007F-\u009F]+$/.test(t)) return true;
  // Strip lines that are primarily control chars mixed with printable chars (barcode artefacts)
  const controlCount = (t.match(/[\u0000-\u001F\u007F-\u009F]/g) ?? []).length;
  if (controlCount > 2) return true;
  return NOISE_RE.some(r => r.test(t));
}

// Normalise an answer line: strip dots/dashes but preserve any trailing [N] mark bracket.
// Returns null if the line should be dropped entirely, or a replacement string.
function normaliseAnswerLine(line) {
  const t = line.trim();
  // Pure dots/dashes/underscores (possibly with trailing spaces): drop
  if (/^[.\-_\s]+$/.test(t)) return null;
  // Dots/dashes followed by [N] mark bracket — preserve only the bracket
  if (/^[.\-_\s]+\[(\d+)\]\s*$/.test(t)) {
    const m = /\[(\d+)\]/.exec(t);
    return m ? `[${m[1]}]` : null;
  }
  // Numbered answer slot: "1 ........" or "2 ........" — drop entirely
  if (/^\d{1,2}\s+[.\-_]{5,}/.test(t)) return null;
  // Lettered/named answer slot followed by dots: drop entirely
  if (/^[A-Z]\s+[.\-_]{5,}/.test(t)) return null;
  if (/^\w[\w ]{1,15}\s{2,}[.\-_]{5,}/.test(t)) return null;
  return t; // keep as-is
}

// Returns true if the line should be completely dropped (not passed to parser)
function isAnswerLine(line) {
  const result = normaliseAnswerLine(line);
  return result === null;
}

// ── Question-type detection ──────────────────────────────────────────────────

// Command-word → question type
const COMMAND_WORD_MAP = [
  [/\bstate\b/i,            'state'],
  [/\bname\b/i,             'name'],
  [/\bidentify\b/i,         'identify'],
  [/\bgive\b/i,             'give'],
  [/\bdescribe\b/i,         'describe'],
  [/\bexplain\b/i,          'explain'],
  [/\bsuggest\b/i,          'suggest'],
  [/\bdiscuss\b/i,          'discuss'],
  [/\boutline\b/i,          'outline'],
  [/\bcalculate\b/i,        'calculate'],
  [/\bshow\s+that\b/i,      'calculate'],
  [/\bdetermine\b/i,        'calculate'],
  [/\bpredict\b/i,          'predict'],
  [/\bcompare\b/i,          'compare'],
  [/\beval[uo]ate\b/i,      'evaluate'],
  [/\bdesign\b/i,           'design'],
  [/\bplan\b/i,             'plan'],
  [/\bcomplete\b/i,         'complete'],
  [/\bdraw\b/i,             'draw'],
  [/\bsketch\b/i,           'draw'],
  [/\blabel\b/i,            'label'],
  [/\bcircle\b/i,           'circle'],
  [/\bplot\b/i,             'draw'],
  [/\bmark\b/i,             'draw'],
  [/\btick\b/i,             'tick'],
  [/\bcross\b/i,            'tick'],
  [/\bput\s+a\s+(tick|cross)\b/i, 'tick'],
  [/\buse\b/i,              'use'],
  [/\bwrite\b/i,            'write'],
  [/\blist\b/i,             'list'],
  [/\bplace\b/i,            'place'],
  [/\badd\b/i,              'draw'],
];

// answerType → UI input widget
function getAnswerType(commandType, text) {
  const hasFillBlanks = /\.{5,}/.test(text);
  const hasNumberedSlots = /\n\s*[1-9]\s{2,}\.{4,}/.test(text);
  const hasNamedSlots = /\n\s*\w+\s{2,}\.{4,}/.test(text);

  if (['draw', 'circle', 'label', 'sketch', 'plot', 'mark'].includes(commandType)) return 'diagram_only';
  if (['tick', 'place'].includes(commandType)) return 'diagram_only';
  if (hasNumberedSlots) return 'numbered_list';
  if (hasNamedSlots) return 'named_slots';
  if (hasFillBlanks) return 'fill_blank';
  if (['calculate', 'determine'].includes(commandType)) return 'calculate';
  if (['describe', 'explain', 'suggest', 'discuss', 'outline', 'compare', 'evaluate', 'design', 'plan'].includes(commandType)) return 'long_answer';
  if (['complete'].includes(commandType)) return hasFillBlanks ? 'fill_blank' : 'long_answer';
  // default for state/name/identify/give/list/write
  return 'short_answer';
}

function detectType(text) {
  for (const [re, type] of COMMAND_WORD_MAP) {
    if (re.test(text)) return type;
  }
  // Fallback: if inline dots present, it's a fill_blank
  if (/\.{5,}/.test(text)) return 'complete';
  return 'other';
}

function isDiagramOnly(commandType) {
  return ['draw', 'circle', 'label', 'sketch', 'tick', 'plot', 'mark', 'place'].includes(commandType);
}

// ── Mark extraction ──────────────────────────────────────────────────────────

// Extract the [Total: N] from text, or null
function extractTotalMark(text) {
  const m = /\[Total:\s*(\d+)\]/i.exec(text);
  return m ? parseInt(m[1]) : null;
}

// Extract a per-sub-part [N] or [N mark(s)] bracket (NOT [Total:…])
function extractPartMark(text) {
  const m = /\[(\d+)(?:\s*mark[s]?)?\]\s*$/m.exec(text.trimEnd());
  if (m && !/Total/i.test(text.slice(0, m.index))) return parseInt(m[1]);
  return null;
}

// ── Clean text helpers ───────────────────────────────────────────────────────

// Collapse sequences of ≥5 dots/dashes to a placeholder
function normaliseFillBlanks(text) {
  return text.replace(/\.{5,}/g, '______').replace(/-{5,}/g, '______');
}

function stripMarkBracket(text) {
  // Remove [Total: N] anywhere in text
  let t = text.replace(/\[Total:\s*\d+\]/gi, '');
  // Remove [N] or [N mark(s)] at end of each line (not mid-sentence)
  t = t.replace(/\[\d+(?:\s*marks?)?\]\s*$/gm, '');
  return t.trimEnd();
}

// ── Sub-part label regexes ───────────────────────────────────────────────────

// Matches lines that are sub-part openers:  (a)   (b)   (i)   (ii)  (iii)
const LETTER_PART_RE   = /^\s*\(([a-hj-np-uwz])\)\s*(.*)/;   // (a)–(z) excl i,o,q,v,x
const ROMAN_PART_RE    = /^\s*\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)/i;
// Combined: (a)(i) or (a) (i) on same line
const LETTER_ROMAN_RE  = /^\s*\(([a-hj-np-uwz])\)\s*\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)/i;

// Top-level question: "1 " at start of line followed by question content OR sub-part
// Must be a digit ≥ 1, not indented, followed by whitespace
const TOP_LEVEL_Q_RE   = /^(\d+)\s{1,5}(.*)/;

// ── Core parser ──────────────────────────────────────────────────────────────

function parseQP(rawText) {
  // Split into clean lines; strip noise; normalise answer lines (strip dots, keep [N] bracket)
  const lines = rawText
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => !isNoise(l))
    .map(l => normaliseAnswerLine(l))
    .filter(l => l !== null);

  const questions = [];
  let currentQ = null;   // { id, context, parts: [], marks }
  let currentPart = null; // { id, label, text, marks, type, answerType, hasDiagramRef, diagramOnly, parts }
  let currentSub  = null; // nested (i),(ii) inside a letter part

  function commitSub() {
    if (!currentSub) return;
    // Check if this sub's raw text contains [Total: N] — bubble up to question
    const rawSub = currentSub.text.join('\n');
    const tot = extractTotalMark(rawSub);
    if (tot != null && currentQ) currentQ._totalFromText = tot;
    const sub = finalise(currentSub);
    if (currentPart) currentPart.parts.push(sub);
    currentSub = null;
  }

  function commitPart() {
    commitSub();
    if (!currentPart) return;
    // Check if this part's raw text contains [Total: N]
    const rawPart = currentPart.text.join('\n');
    const tot = extractTotalMark(rawPart);
    if (tot != null && currentQ) currentQ._totalFromText = tot;
    const part = finalise(currentPart);
    if (currentQ) currentQ.parts.push(part);
    currentPart = null;
  }

  function commitQ() {
    commitPart();
    if (!currentQ) return;
    // Apply total mark captured from nested text
    if (currentQ._totalFromText != null) currentQ.marks = currentQ._totalFromText;
    delete currentQ._totalFromText;
    questions.push(currentQ);
    currentQ = null;
  }

  function finalise(node, isQuestion = false) {
    const text = node.text.join('\n').trim();
    const commandType = detectType(text);
    const answerType  = getAnswerType(commandType, text);
    // For questions, extract [Total: N]; for sub-parts, extract [N]
    const marks = isQuestion
      ? (extractTotalMark(text) ?? node.marks)
      : (extractPartMark(text) ?? node.marks);
    return {
      id:            node.id,
      label:         node.label ?? node.id,
      text:          normaliseFillBlanks(stripMarkBracket(text)),
      marks:         marks,
      type:          commandType,
      answerType:    answerType,
      hasDiagramRef: /\bFig\.\s*\d|\bTable\s*\d|\bdiagram\b/i.test(text),
      diagramOnly:   isDiagramOnly(commandType),
      parts:         node.parts ?? [],
    };
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ── Top-level question number (e.g. "1  (a) ..." or "2  Fig. 2.1 shows") ─
    const topM = TOP_LEVEL_Q_RE.exec(line);
    if (topM) {
      const qNum = topM[1];
      const rest = topM[2];

      // Only treat as new question if it's strictly the next expected number.
      // questions.length = committed questions so far; currentQ = question being built.
      const nextExpected = questions.length + (currentQ ? 1 : 0) + 1;
      const parsedNum = parseInt(qNum, 10);

      // Accept only when the number matches the expected next question number.
      // This prevents numbered list items ("1  ......", "2  ......") inside a
      // question from being mis-identified as a new question.
      const looksLikeQ = parsedNum === nextExpected;

      if (looksLikeQ && parsedNum >= 1 && parsedNum <= 30) {
        commitQ();
        currentQ = { id: qNum, context: [], parts: [], marks: null, text: [] };

        // The rest of the line might be context, (a) opener, or numbered sub-part
        if (rest.trim()) {
          // Check if rest is itself a letter sub-part opener
          const lm = LETTER_ROMAN_RE.exec(rest) || LETTER_PART_RE.exec(rest);
          if (lm) {
            // Push a pseudo-line to re-process as a sub-part
            lines.splice(i + 1, 0, '  ' + rest.trim());
          } else {
            // Context / question stem on same line as number
            currentQ.text.push(rest.trim());
          }
        }
        i++;
        continue;
      }
    }

    if (!currentQ) { i++; continue; }

    // ── Letter+Roman sub-part: "(a)(i) text" ────────────────────────────────
    const lrM = LETTER_ROMAN_RE.exec(line);
    if (lrM) {
      commitSub();
      commitPart();
      const letter = lrM[1].toLowerCase();
      const roman  = lrM[2].toLowerCase();
      const rest   = lrM[3];
      currentPart = { id: `${currentQ.id}${letter}`, label: `(${letter})`, text: [], marks: null, parts: [] };
      currentSub  = { id: `${currentQ.id}${letter}${roman}`, label: `(${roman})`, text: rest ? [rest] : [], marks: null, parts: [] };
      i++;
      continue;
    }

    // ── Letter sub-part: "(a) text" ─────────────────────────────────────────
    const lM = LETTER_PART_RE.exec(line);
    if (lM) {
      commitSub();
      commitPart();
      const letter = lM[1].toLowerCase();
      const rest   = lM[2];
      currentPart = { id: `${currentQ.id}${letter}`, label: `(${letter})`, text: rest ? [rest] : [], marks: null, parts: [] };
      i++;
      continue;
    }

    // ── Roman sub-part: "(i) text" (nested inside a letter part) ────────────
    const rM = ROMAN_PART_RE.exec(line);
    if (rM) {
      commitSub();
      const roman = rM[1].toLowerCase();
      const rest  = rM[2];
      const parentId = currentPart ? currentPart.id : currentQ.id;
      currentSub = { id: `${parentId}${roman}`, label: `(${roman})`, text: rest ? [rest] : [], marks: null, parts: [] };
      i++;
      continue;
    }

    // ── Regular content line ────────────────────────────────────────────────
    const target = currentSub ?? currentPart ?? currentQ;
    target.text.push(line.trim());
    i++;
  }

  commitQ();

  // Post-process: fill in marks where still missing via summing sub-parts
  for (const q of questions) {
    if (q.marks == null) {
      let sum = 0;
      for (const p of q.parts) {
        const pM = p.marks ?? p.parts.reduce((acc, s) => acc + (s.marks ?? 0), 0);
        sum += pM;
      }
      if (sum > 0) q.marks = sum;
    }
  }

  return questions;
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function parsePaper(paperId) {
  const pdfPath = join(PDFS_DIR, `${paperId}.pdf`);
  if (!existsSync(pdfPath)) {
    console.warn(`  [skip] PDF not found: ${pdfPath}`);
    return false;
  }

  console.log(`  Parsing ${paperId}...`);
  const raw = await extractText(pdfPath);
  const questions = parseQP(raw);

  // Compute total marks
  const totalMarks = questions.reduce((acc, q) => acc + (q.marks ?? 0), 0);

  // Parse paper metadata from ID
  const idM = paperId.match(/(\d{4})_([msw])(\d{2})_qp_(\d)(\d)/);
  const meta = idM ? {
    subjectCode: idM[1],
    session:     `${idM[2]}${idM[3]}`,
    component:   `${idM[4]}${idM[5]}`,
  } : {};

  const output = {
    paperId,
    ...meta,
    totalMarks,
    questionCount: questions.length,
    questions,
  };

  const outPath = join(OUT_DIR, `${paperId}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  ✓ ${paperId}: ${questions.length} questions, ${totalMarks} marks → ${outPath}`);
  return true;
}

// ── CLI argument handling ────────────────────────────────────────────────────

const args = process.argv.slice(2);

// Determine which PDFs to parse
function isTheoryComponent(name) {
  // Theory papers: component 3x, 4x, 5x, 6x
  // Exclude 1x (MCQ), 2x (structured/written – MCQ-style per old syllabus)
  return /^[3456]\d$/.test(name.replace(/.*_qp_/, '').replace('.pdf', ''));
}

let targets = [];

if (args.length === 0) {
  // All theory QPs in pastpapers/
  targets = readdirSync(PDFS_DIR)
    .filter(f => f.endsWith('.pdf') && f.includes('_qp_') && isTheoryComponent(f))
    .map(f => f.replace('.pdf', ''));
} else if (args.length === 1 && /^\d{4}_[msw]\d{2}_qp_\d\d$/.test(args[0])) {
  // Specific paper ID
  targets = [args[0]];
} else if (args.length === 1 && /^\d{4}$/.test(args[0])) {
  // All theory papers for a subject code
  const code = args[0];
  targets = readdirSync(PDFS_DIR)
    .filter(f => f.startsWith(code + '_') && f.includes('_qp_') && f.endsWith('.pdf') && isTheoryComponent(f))
    .map(f => f.replace('.pdf', ''));
} else if (args.length === 2 && /^\d{4}$/.test(args[0]) && /^\d{2}$/.test(args[1])) {
  // Subject code + component (e.g. "0610 42")
  const code = args[0], comp = args[1];
  targets = readdirSync(PDFS_DIR)
    .filter(f => f.startsWith(code + '_') && f.includes(`_qp_${comp}`) && f.endsWith('.pdf'))
    .map(f => f.replace('.pdf', ''));
} else {
  // Treat each arg as a paperId
  targets = args;
}

if (targets.length === 0) {
  console.error('No matching PDFs found.');
  process.exit(1);
}

console.log(`\nParsing ${targets.length} theory paper(s)...\n`);
let ok = 0, fail = 0;
for (const t of targets) {
  try {
    const success = await parsePaper(t);
    if (success) ok++; else fail++;
  } catch (err) {
    console.error(`  [error] ${t}: ${err.message}`);
    fail++;
  }
}
console.log(`\nDone: ${ok} parsed, ${fail} skipped/failed.\n`);
