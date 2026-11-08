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
// Support --dir <path> flag to override the PDF source directory
const dirFlagIdx = process.argv.indexOf('--dir');
const PDFS_DIR  = dirFlagIdx !== -1
  ? process.argv[dirFlagIdx + 1]
  : join(__dirname, 'pastpapers');
// Secondary dir: always check pastpapers-alevels as fallback
const PDFS_DIR2 = join(__dirname, 'pastpapers-alevels');
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
    // Page boundary marker — used by parseQP to reject bare page-header numbers.
    // Must survive trimEnd() — \f is whitespace so use a plain ASCII sentinel instead.
    text += '<<<PAGE_BREAK>>>\n';
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
  // Standalone page numbers — BUT see isMathsNoise() below for maths-aware version
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
  // "N hour(s) N minutes" time allowance — matches "1 hour", "2 hours", "1 hour 30 minutes"
  /^\d+\s+hours?(\s+\d+\s+minutes?)?\s*$/i,
  /^\d+\s+minutes?\s*$/i,
  // Candidate/centre number box labels
  /^Centre number|^Candidate number/i,
  /^First name|^Last name|^Signature/i,
  // "DC (WW/SG) 341318/4" print code
  /^DC\s*\(\s*[A-Z]+/,
  // Maths paper: "Answer(a)" / "Answer(b)(i)" box labels
  /^Answer\s*\([a-z]\)/i,
  /^Answer\s*\([a-z]\)\s*\([ivx]+\)/i,
  // Old-format answer box lines: "Answer Day Time [2]", "Answer km [2]", "Answer p = [2]"
  // These appear in pre-2017 papers as inline answer slots. Strip them.
  /^Answer\s+\S/i,
  // "[Total: 10]" standalone lines — these are stripped (marks already captured per-part)
  /^\[Total:\s*\d+\]\s*$/i,
  // Maths diagram annotations: "NOT TO", "SCALE", "NOT TO SCALE"
  /^NOT TO$/i,
  /^SCALE$/i,
  /^NOT TO SCALE$/i,
  // "© U C LES 2022 0580/42/M/J/22" spaced copyright
  /^©\s*U\s*C\s*L\s*E\s*S/i,
  // "For Examiner's Use" margin column — appears as three separate lines in old-format papers
  /^For$/,
  /^Examiner's$/i,
  /^Use$/,
  // "For Examiner's Use" as a combined line
  /^For\s+Examiner'?s?\s+Use$/i,
];

// NOISE_RE_NO_DIGITS: same as NOISE_RE but without the standalone-digits rule.
// Used for maths short-answer papers where Q7, Q9, Q10 etc. appear as bare numbers.
const NOISE_RE_NO_DIGITS = NOISE_RE.filter(r => r.toString() !== '/^\\d{1,3}$/');

function isNoise(line, keepBareQNumbers = false) {
  const t = line.trim();
  if (!t) return true;
  // For maths short-answer papers: keep bare numbers 1-30 (they are question numbers in diagrams).
  // This check must come BEFORE the length<2 guard since single-digit Q numbers (1-9) are 1 char.
  if (keepBareQNumbers && /^\d{1,2}$/.test(t) && parseInt(t) >= 1 && parseInt(t) <= 30) return false;
  if (t.length < 2) return true;
  // Strip any line containing only control characters (+ commas/spaces)
  if (/^[,\s\u0000-\u001F\u007F-\u009F]+$/.test(t)) return true;
  // Strip lines that are primarily control chars mixed with printable chars (barcode artefacts)
  const controlCount = (t.match(/[\u0000-\u001F\u007F-\u009F]/g) ?? []).length;
  if (controlCount > 2) return true;
  return NOISE_RE.some(r => r.test(t));
}

// ── Symbol normalisation (maths PDFs) ───────────────────────────────────────

// Cambridge maths PDFs encode special chars as "A°" (degree), "≤?≤" (inequality),
// "−" (minus), "π" (pi) etc. Normalise to clean Unicode.
function normaliseSymbols(line) {
  let t = line;
  // Degree: "A°" or "Aº" → "°"
  t = t.replace(/A[°º]/g, '°');
  // Inequality encoding artefacts: "≤?≤" "≥?≥" → "≤" "≥"
  t = t.replace(/[≤<]\s*\?[\s≤<]*/g, ' ≤ ').replace(/[≥>]\s*\?[\s≥>]*/g, ' ≥ ');
  // "–" / em-dash used as minus: keep as-is (valid Unicode)
  // Garbled pi: "π" or "π" → "π" (already correct in utf-8, but strip "r" prefix artefact "rr" → "π")
  t = t.replace(/\brr\b/g, 'π');
  // Superscript digits rendered as plain: "cm " + isolated digit → "cm²" etc. (best-effort)
  t = t.replace(/\bcm\s+2\b/g, 'cm²').replace(/\bcm\s+3\b/g, 'cm³');
  t = t.replace(/\bm\s+2\b/g, 'm²').replace(/\bm\s+3\b/g, 'm³');
  // Remove residual control characters
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  return t;
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
  // Maths answer line: ".................. [2]" — extract only the mark
  if (/^[.\-_\s]+\[\d+\]\s*$/.test(t)) {
    const m = /\[(\d+)\]/.exec(t);
    return m ? `[${m[1]}]` : null;
  }
  // Numbered answer slot: "1 ........" or "2 ........" — drop entirely
  if (/^\d{1,2}\s+[.\-_]{5,}/.test(t)) return null;
  // Lettered/named answer slot followed by dots: drop entirely
  if (/^[A-Z]\s+[.\-_]{5,}/.test(t)) return null;
  if (/^\w[\w ]{1,15}\s{2,}[.\-_]{5,}/.test(t)) return null;
  // Answer blank with trailing value: "....................... 0.2861" or "....................... 11%"
  // These are comparison answer blanks — the dots fill a box and the number is a comparison value.
  if (/^[.\-_]{5,}/.test(t)) return null;
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
  // "circle" only counts as draw command if it's the imperative ("Circle the answer")
  // NOT when "circle" appears as a noun in a sentence ("the circle has radius...")
  [/^circle\b/i,            'circle'],
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

// Top-level question: "1 " at start of line followed by question content OR sub-part.
// Also matches a bare number alone on a line (e.g. "21" = Q21 number printed at top of page
// when the question appears on a new page in maths papers — the number has no trailing text).
// The rest must NOT look like a run of single digits (axis labels: "6 5 4 3 2 1 ...").
const TOP_LEVEL_Q_RE   = /^(\d+)(?:\s{1,5}(.+)|$)/;

// Returns true if the "rest" of a candidate top-level Q line looks like an axis/grid label
// run (e.g. "5 4 3 2 1 1 2 3") — these must NOT be treated as new questions.
function isAxisLabelRest(rest) {
  // A run of ≥3 space-separated single digits/minus signs — axis or grid label
  return /^(-?\d\s+){2,}-?\d/.test(rest.trim());
}

// Returns true if the rest of a candidate question line looks like a math expression
// rather than a real question opener. These must NOT start a new question.
function isMathExpressionRest(rest) {
  const t = rest.trim();
  if (!t) return false;
  // Starts with an arithmetic operator or equals sign
  if (/^[+\-*/=<>]/.test(t)) return true;
  // Entirely composed of digits, spaces, operators, and lowercase math variables — no real words
  // e.g. "1 + + =", "3 4 12", "x – 43 < 5x + 2", "7 − 1 -9" (sequence terms),
  // "5 ( w + 3 ) - 2 ( w - 1 )" (algebra), "2x + 3y = 7"
  // Note: uppercase-only identifiers like "A C D" (diagram labels) are NOT matched (require lowercase)
  // Note: sub-part labels "(a)" or "(b)" at the start are NOT math expressions — skip this check
  if (!LETTER_PART_RE.test(t) &&
      /^[\d\s+\-*/=<>().,:;a-z–−#^]+$/.test(t) &&
      !/\b[a-z]{3,}\b/.test(t)) return true;
  // Line is ONLY numbers/spaces (lone fraction numerator like "3 4 12")
  if (/^[\d\s/]+$/.test(t) && t.length < 12) return true;
  // Very short (≤5 chars) lowercase/mixed math variable remnants from formula pages
  // e.g. "bh", "Al", "rr", "Ah" — suffix of a formula that split across Y rows
  if (t.length <= 5 && /^[a-zA-Z\d\s]+$/.test(t) && !/^[A-Z][a-z]/.test(t)) return true;
  // Sequence of numbers with optional signs/dashes
  // e.g. "7 − 1 -9", "4 11 18 25 32" — arithmetic sequence content
  if (/^-?\d[\d\s\-−–.]*$/.test(t)) return true;
  // "NOT TO" or "NOT TO SCALE" — diagram annotation that bleeds into Q number line
  if (/^NOT\s+TO/i.test(t)) return true;
  // "For" alone (margin header) is not a question
  if (/^For\s*$/.test(t)) return true;
  return false;
}

// ── Core parser ──────────────────────────────────────────────────────────────

function parseQP(rawText, opts = {}) {
  // isMathsShortAnswer: maths (0580/0606) component 1x/2x papers where question numbers
  // frequently appear inside diagrams and are absent from the text layer. We allow a skip
  // gap so the sequential guard doesn't drop valid questions when 1–3 Q numbers are absent.
  // Kept at 5 to avoid jumping to graph labels like "10 NOT TO SCALE" when nextExpected=6.
  const maxSkip = opts.isMathsShortAnswer ? 5 : 4;
  // Split into clean lines; strip noise; normalise answer lines (strip dots, keep [N] bracket)
  // Also track which surviving lines are the first non-noise line after a page break (\f).
  // A bare digit at that position is a page-header number, not a question number.
  const afterPageBreak = new Set(); // indices into `lines` that are first after a page break
  const lines = [];
  // pageHeaderIndices: set of indices in `lines` that are bare page-header numbers.
  // These should be rejected as question openers but must stay in `lines` to keep index accounting
  // consistent — they are filtered out by the isPageHeader check in bareOk.
  // However, the preceding-bare guard below must NOT look back at page-header positions, so we
  // track them separately.
  const pageHeaderIndices = new Set();
  {
    let firstAfterBreak = true; // treat start-of-document as after a break
    for (const raw of rawText.split('\n')) {
      const t = raw.trimEnd();
      if (t === '<<<PAGE_BREAK>>>') { firstAfterBreak = true; continue; }
      const norm = normaliseSymbols(t);
      if (isNoise(norm, opts.isMathsShortAnswer)) continue;
      const normed = normaliseAnswerLine(norm);
      if (normed === null) continue;
      if (firstAfterBreak) {
        afterPageBreak.add(lines.length);
        // If this is a bare digit 1-30, it's a page-header number — mark it
        if (/^\d{1,2}$/.test(normed) && parseInt(normed) >= 1 && parseInt(normed) <= 30) {
          pageHeaderIndices.add(lines.length);
        }
        firstAfterBreak = false;
      }
      lines.push(normed);
    }
  }

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
      const rest = topM[2] ?? '';   // undefined when number appears alone on a line (bare Q number)

      // Only treat as new question if it's strictly the next expected number.
      // questions.length = committed questions so far; currentQ = question being built.
      const nextExpected = questions.length + (currentQ ? 1 : 0) + 1;
      const parsedNum = parseInt(qNum, 10);

      // ── Question-opener validity rules ──────────────────────────────────────
      // For maths short-answer papers (0580/0606 1x/2x), question numbers are frequently
      // embedded in diagrams and absent from the PDF text layer. Strategy:
      //
      //   1. Bare number (rest is empty): valid only as an EXACT match AND only after at least
      //      one question has been committed (prevents formula-page fractions like "1", "2"
      //      which appear before Q1 from triggering false questions).
      //
      //   2. Number + real content (rest has words/sub-part): valid for exact match OR up to
      //      maxSkip ahead (skipping over diagram-embedded question numbers we couldn't see).
      //
      //   3. Number + math expression / measurement (e.g. "3 cm", "5 kg", "4 2x+3"): REJECT.
      //      These are diagram annotations or equation fragments. The real question number
      //      will appear as a bare number on a fresh page.
      //
      // For non-maths papers: require rest to start with "(a)" or a capital letter (or be empty).

      const isBare = rest.trim() === '';
      const isRestMath = isMathExpressionRest(rest);

      // Is this a plausible question opener?
      // For non-maths papers: strict — must start with "(a)" or a capital letter (or be empty).
      // For maths papers:
      //   - Exact match with real content (words, expression with letters): accept.
      //   - Exact match with trivially-math rest (single digit like "3" from a superscript, or
      //     all-digit string like "2 2" from formula numerators): REJECT — these are formula/exponent
      //     fragments that happen to appear at the expected Q position.
      //   - Skip-ahead (parsedNum > nextExpected): only accept if rest does NOT look like a
      //     math/diagram annotation.
      const rtrim = rest.trim();
      const isExactMatch = parsedNum === (questions.length + (currentQ ? 1 : 0) + 1);
      // isTrivialMathRest: rest is ONLY digit(s) and spaces (e.g. "3" = exponent, "2 2" = fraction num).
      // These should never be a question opener even at exact match position.
      const isTrivialMathRest = rtrim.length > 0 && /^[\d\s]+$/.test(rtrim);
      const isCleanOpener = opts.isMathsShortAnswer
        // Maths short-answer rules:
        //   - Bare: always ok (handled by bareOk guards)
        //   - Exact match: accept unless rest is ONLY digits/spaces (trivial math = exponent/fraction).
        //       "10 of the counters" → exact match → accept (sentence content)
        //       "10 b = dm + 2mk"  → exact match → accept (formula question)
        //       "12 3" → trivial (only "3") → reject (exponent fragment)
        //   - Skip-ahead: only reject if rest is trivial math OR starts with lowercase without any
        //       real word content. Allow algebra/science notation that starts lowercase.
        //       "10 NOT TO" → isRestMath → reject
        //       "10 b = dm + 2mk" → skip → not trivial, has letters → accept
        ? (isBare ||
           (isExactMatch && !isTrivialMathRest) ||                  // exact match, non-trivial rest
           (!isExactMatch && !isTrivialMathRest && !isRestMath))    // skip-ahead, not a trivial/pure math expr
        // Non-maths structured papers: must start with "(a)" or a capital letter + at least one space
        // (blocks single-word probability labels like "Finishes")
        : (isBare || /^\([a-z]\)/.test(rtrim) || (/^[A-Z]/.test(rtrim) && /\s/.test(rtrim)));

      // Bare-number guard:
      //  1. Don't trigger before any question is established (formula-page fractions like "1", "2").
      //  2. Don't allow a bare number that duplicates the last committed question ID.
      //  3. Don't allow a bare number when the CURRENT question being built has the same ID —
      //     this is a page-header "3" appearing mid-way through Q3's content on the next page.
      //  4. Don't allow a bare number when the NEXT non-trivial line already has the same question
      //     number with real content — prefer the richer opener over the bare-number shadow.
      const lastCommittedId = questions.length > 0 ? parseInt(questions[questions.length - 1].id) : 0;
      const currentBuildId  = currentQ ? parseInt(currentQ.id) : -1;
      // Page-header guard: if this bare number is the very first non-noise line after a page break,
      // it MIGHT be a page number printed at the top of the page, NOT a Q number.
      // However: if parsedNum === nextExpected, the page N header IS question N (question numbers
      // often match page numbers in short-answer papers). In that case, allow it through.
      const isPageHeader = isBare && afterPageBreak.has(i) && parsedNum !== nextExpected;
      // bareOk rules:
      //  - Non-bare: always ok (handled by looksLikeQ skip window)
      //  - Bare, page header (and not exact match): never ok
      //  - Bare Q1 exact match (parsedNum=1, nextExpected=1, no committed Qs yet): ok — diagram-embedded Q1
      //  - Bare, all others: require at least one committed question and strictly > lastCommittedId
      const isBareQ1 = isBare && parsedNum === 1 && questions.length === 0 && (currentQ === null);
      let bareOk = !isBare || (!isPageHeader && (isBareQ1 || (questions.length > 0 && parsedNum > lastCommittedId && parsedNum !== currentBuildId)));
      if (bareOk && isBare) {
        // Look ahead: if a richer "N <content>" opener with the same N appears within the next
        // few lines (skipping mark brackets like "[1]", page headers, and empty lines), prefer
        // the richer version and skip this bare shadow.
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const nxt = lines[j].trim();
          if (!nxt) continue;
          // Skip answer mark brackets "[1]", "[2]" and page-header numbers — they sit between
          // the bare Q# and the real Q opener on the next page.
          if (/^\[\d+\]$/.test(nxt)) continue;
          if (pageHeaderIndices.has(j)) continue; // skip page-header, keep looking
          const nxtM = TOP_LEVEL_Q_RE.exec(nxt);
          if (nxtM && parseInt(nxtM[1]) === parsedNum && (nxtM[2] ?? '').trim() !== '') {
            bareOk = false; // the richer version is coming; skip bare shadow
          }
          break; // stop at the first real non-bracket non-pageheader line
        }

        // Guard: graph/histogram axis ticks — next 2+ non-trivial lines are ALL bare numbers,
        // OR the immediately preceding non-trivial line is also a bare number (part of the same axis).
        if (bareOk) {
          // Check following lines
          let bareCount = 0;
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const nxt = lines[j].trim();
            if (!nxt) continue;
            if (/^\d{1,2}$/.test(nxt) && parseInt(nxt) >= 1 && parseInt(nxt) <= 100) {
              bareCount++;
            } else {
              break;
            }
          }
          if (bareCount >= 2) bareOk = false;
          // Also check the immediately preceding non-trivial line for a bare digit (axis/fraction).
          // Skip page-header positions.
          if (bareOk && i > 0) {
            for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
              if (pageHeaderIndices.has(j)) continue;
              const prev = lines[j].trim();
              if (!prev) continue;
              if (/^\d{1,2}$/.test(prev) && parseInt(prev) >= 1 && parseInt(prev) <= 100) {
                bareOk = false;
              }
              break;
            }
          }
        }

        // Guard: fraction numerator — the bare number is immediately followed by a pure arithmetic
        // line (e.g. "4" then "3" = fraction 4/3; "7" then "99" = fraction 7/99).
        // Skip over mark brackets [N] to find the real next content line.
        if (bareOk) {
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nxt = lines[j].trim();
            if (!nxt) continue;
            if (/^\[\d+\]$/.test(nxt)) continue; // skip mark brackets
            if (pageHeaderIndices.has(j)) break;   // don't cross page boundaries
            if (/^[\d\s.+\-*/()–−]+$/.test(nxt) && nxt.length > 1) {
              bareOk = false; // pure arithmetic next line — this bare number is a fraction numerator
            }
            break;
          }
        }
      }

      // Skip window: bare numbers accepted as exact match or 1 step ahead (the very next Q);
      // larger skips only for non-bare lines that have real question content.
      // This allows page-4 bare "4" to fire when nextExpected=3 (Q3 just started on this page),
      // but prevents axis label "30" from firing when nextExpected=15.
      const effectiveMaxSkip = isBare ? 1 : maxSkip;
      const looksLikeQ = parsedNum === nextExpected ||
        (parsedNum > nextExpected && parsedNum <= nextExpected + effectiveMaxSkip && isCleanOpener);

      const isValidQ = looksLikeQ && bareOk && isCleanOpener
        && parsedNum >= 1 && parsedNum <= 30 && !isAxisLabelRest(rest);

      if (isValidQ) {
        commitQ();
        currentQ = { id: qNum, context: [], parts: [], marks: null, text: [] };

        // The rest of the line might be a sub-part opener or question context text.
        // (Math-expression rests are rejected before reaching here — see isValidQ above.)
        if (rest.trim()) {
          // Check if rest is itself a letter sub-part opener, e.g. "(a) Find..."
          const lm = LETTER_ROMAN_RE.exec(rest) || LETTER_PART_RE.exec(rest);
          if (lm) {
            lines.splice(i + 1, 0, '  ' + rest.trim());
          } else {
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

    // ── Standalone mark bracket "[N]" — assign to current node ──────────────
    const markOnlyM = /^\[(\d+)\]\s*$/.exec(line.trim());
    if (markOnlyM) {
      const m = parseInt(markOnlyM[1]);
      const target = currentSub ?? currentPart ?? currentQ;
      if (target && target.marks == null) target.marks = m;
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
  let pdfPath = join(PDFS_DIR, `${paperId}.pdf`);
  if (!existsSync(pdfPath)) {
    // Try secondary directory (pastpapers-alevels)
    const alt = join(PDFS_DIR2, `${paperId}.pdf`);
    if (existsSync(alt)) {
      pdfPath = alt;
    } else {
      console.warn(`  [skip] PDF not found: ${paperId}.pdf`);
      return false;
    }
  }

  console.log(`  Parsing ${paperId}...`);
  const raw = await extractText(pdfPath);

  // Maths short-answer papers (0580/0606 components 1x and 2x) have question numbers
  // frequently embedded in diagrams (absent from PDF text layer), so allow large skip gaps.
  const idM2 = paperId.match(/^(\d{4})_[msw]\d{2}_qp_(\d)\d$/);
  const isMathsShortAnswer = idM2 && ['0580','0606'].includes(idM2[1]) && parseInt(idM2[2]) <= 2;
  const questions = parseQP(raw, { isMathsShortAnswer });

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

// Strip --dir <value> from args so it doesn't interfere with positional args
const rawArgs = process.argv.slice(2);
const args = rawArgs.filter((a, i) => a !== '--dir' && rawArgs[i - 1] !== '--dir');

// Helper: list all QP PDFs (both dirs) optionally filtered by prefix/component
function listQPs(prefix = null, comp = null) {
  const dirs = [PDFS_DIR];
  if (existsSync(PDFS_DIR2) && PDFS_DIR2 !== PDFS_DIR) dirs.push(PDFS_DIR2);
  const seen = new Set();
  const result = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.pdf') || !f.includes('_qp_')) continue;
      if (prefix && !f.startsWith(prefix + '_')) continue;
      if (comp && !f.includes(`_qp_${comp}`)) continue;
      const id = f.replace('.pdf', '');
      if (!seen.has(id)) { seen.add(id); result.push(id); }
    }
  }
  return result;
}

let targets = [];

if (args.length === 0) {
  // All QPs in both pastpapers dirs
  targets = listQPs();
} else if (args.length === 1 && /^\d{4}_[msw]\d{2}_qp_\d\d$/.test(args[0])) {
  // Specific paper ID
  targets = [args[0]];
} else if (args.length === 1 && /^\d{4}$/.test(args[0])) {
  // All papers for a subject code (both dirs)
  targets = listQPs(args[0]);
} else if (args.length === 2 && /^\d{4}$/.test(args[0]) && /^\d{2}$/.test(args[1])) {
  // Subject code + component (e.g. "0610 42")
  targets = listQPs(args[0], args[1]);
} else {
  // Treat each arg as a paperId
  targets = args;
}

if (targets.length === 0) {
  console.error('No matching PDFs found.');
  process.exit(1);
}

console.log(`\nParsing ${targets.length} paper(s)...\n`);
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
