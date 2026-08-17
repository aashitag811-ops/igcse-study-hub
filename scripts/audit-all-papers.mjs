/**
 * audit-all-papers.mjs
 *
 * Comprehensive audit of every paper in papers-manifest.ts.
 * Checks:
 *   1. VIEW MODE   — QP PDF exists on disk
 *   2. VIEW MODE   — MS PDF exists on disk
 *   3. ER CACHE    — ER JSON exists for the paper's session/component
 *   4. ER CONTENT  — No truncated notes (ends mid-sentence / suspiciously short)
 *   5. ER CONTENT  — No garbled spaces inside words ("M any", "a n ")
 *   6. COORDS      — _coords.json exists for the paper
 *   7. COORDS      — Every ER key (except key_messages / general_comments) has a coord entry
 *   8. EXAM MODE   — papers with testModeAvailable:true have MCQ-style ER keys (bare numbers)
 *
 * Usage:
 *   node scripts/audit-all-papers.mjs             # audit all papers
 *   node scripts/audit-all-papers.mjs 0450        # audit one subject
 *   node scripts/audit-all-papers.mjs 0450_s25    # audit one session
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Load papers manifest ──────────────────────────────────────────────────────
const manifestPath = path.join(ROOT, 'src/lib/data/papers-manifest.ts');
const manifestSrc = fs.readFileSync(manifestPath, 'utf-8');
// Extract the JSON array from the TS file
const arrayMatch = manifestSrc.match(/const papers[^=]*=\s*(\[[\s\S]*?\]);/);
if (!arrayMatch) { console.error('Could not parse papers-manifest.ts'); process.exit(1); }
const papers = JSON.parse(arrayMatch[1].replace(/\/\/[^\n]*/g, ''));

// ── Filter by CLI arg ─────────────────────────────────────────────────────────
const filter = process.argv[2] || '';
const filtered = filter
  ? papers.filter(p => p.id.startsWith(filter) || p.subjectCode === filter)
  : papers;

console.log(`\n🔍  Auditing ${filtered.length} papers${filter ? ` (filter: ${filter})` : ''}...\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────
const PDFS_DIR    = path.join(ROOT, 'public/pdfs');
const ER_DIR      = path.join(ROOT, 'public/er-cache');
const COORDS_DIR  = path.join(ROOT, 'public/question-coords');

function pdfExists(paperId) {
  return fs.existsSync(path.join(PDFS_DIR, `${paperId}.pdf`));
}

function msPdfId(paperId) {
  return paperId.replace('_qp_', '_ms_');
}

function erFilePath(paperId) {
  const m = paperId.match(/(\d{4})_([msw]\d{2})_qp_(\d)(\d)/);
  if (!m) return null;
  const [, code, sess, comp, vari] = m;
  // specific first, then general
  const specific = path.join(ER_DIR, `${code}_${sess}_er_${comp}${vari}.json`);
  const general  = path.join(ER_DIR, `${code}_${sess}_er_notes.json`);
  if (fs.existsSync(specific)) return specific;
  if (fs.existsSync(general))  return general;
  return null;
}

function coordsFilePath(paperId) {
  return path.join(COORDS_DIR, `${paperId}_coords.json`);
}

// Detects genuine pdfjs word-split artefacts:
//   "M any" at start of sentence — capital letter preceded by whitespace/start, followed by 4+ lowercase chars
//   "a n d" style — 4+ consecutive single lowercase letters each separated by a space
// Deliberately tight to avoid false positives in maths (P instead, 3-D drawings, etc.)
const GARBLE_RE = /(?:^|\. )[B-HJ-Z] [a-z]{4,}\b|(?<!\w)[a-z] [a-z] [a-z] [a-z] [a-z](?!\w)/m;

function checkErContent(notes) {
  const issues = [];
  for (const [key, text] of Object.entries(notes)) {
    if (typeof text !== 'string') continue;
    // Truncation: ends without punctuation AND ends with an all-caps word (Cambridge subject footer)
    // e.g. "...removed essential evidence. INFORMATION AND" — the footer was not stripped
    const trimmed = text.trimEnd();
    const endsWithCapsWord = /\b[A-Z]{3,}(?:\s+[A-Z]{2,})*$/.test(trimmed);
    if (trimmed.length > 80 && endsWithCapsWord) {
      issues.push(`  ✂️  Trailing subject footer not stripped in key "${key}": "...${trimmed.slice(-80)}"`);
    }
    // Suspiciously short (< 20 chars, not a stub key)
    if (!['key_messages','general_comments'].includes(key) && trimmed.length < 20) {
      issues.push(`  ⚠️  Very short note for key "${key}": "${trimmed}"`);
    }
    // Garbled spaces inside words
    if (GARBLE_RE.test(text)) {
      const snippet = text.slice(0, 120).replace(/\n/g, ' ');
      issues.push(`  🔤  Possible garbled word in key "${key}": "${snippet}..."`);
    }
  }
  return issues;
}

function checkCoordCoverage(paperId, erNotes, coords) {
  // ER keys that should have a coord (exclude header-only keys)
  const SKIP_KEYS = new Set(['key_messages', 'general_comments']);
  const erKeys = Object.keys(erNotes).filter(k => !SKIP_KEYS.has(k));
  const coordKeys = new Set((coords.coordinates || []).map(c => c.key));

  const missing = erKeys.filter(k => !coordKeys.has(k));
  const extra   = [...coordKeys].filter(k => !erKeys.includes(k));

  const issues = [];
  if (missing.length > 0) {
    issues.push(`  📍  Missing coords for ER keys: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    issues.push(`  📍  Extra coords with no ER key: ${extra.join(', ')}`);
  }
  return issues;
}

function checkMcqErKeys(notes) {
  // MCQ papers should have bare number keys: "1", "2", ... "40"
  const keys = Object.keys(notes).filter(k => !['key_messages','general_comments'].includes(k));
  const nonNumeric = keys.filter(k => !/^\d+$/.test(k));
  if (nonNumeric.length > 0) {
    return [`  🔢  MCQ paper has non-numeric ER keys: ${nonNumeric.slice(0,10).join(', ')}${nonNumeric.length > 10 ? '...' : ''}`];
  }
  return [];
}

// ── Main audit loop ───────────────────────────────────────────────────────────
const results = {
  total:          filtered.length,
  qpMissing:      [],
  msMissing:      [],
  erMissing:      [],
  erContentIssues:[],
  coordsMissing:  [],
  coordsCoverage: [],
  mcqKeyIssues:   [],
};

let i = 0;
for (const paper of filtered) {
  i++;
  if (i % 200 === 0) process.stdout.write(`  ... ${i}/${filtered.length}\n`);

  const id = paper.id;

  // 1. QP PDF
  if (!pdfExists(id)) {
    results.qpMissing.push(id);
  }

  // 2. MS PDF
  const msId = msPdfId(id);
  if (!pdfExists(msId)) {
    results.msMissing.push(id);
  }

  // 3 & 4 & 5. ER cache
  const erPath = erFilePath(id);
  if (!erPath) {
    results.erMissing.push(id);
  } else {
    let erData;
    try {
      const raw = JSON.parse(fs.readFileSync(erPath, 'utf-8'));
      erData = raw.notes ? raw.notes : raw;
    } catch {
      results.erContentIssues.push({ id, issues: ['  ❌  Failed to parse ER JSON'] });
      erData = null;
    }

    if (erData) {
      const contentIssues = checkErContent(erData);
      if (contentIssues.length > 0) {
        results.erContentIssues.push({ id, issues: contentIssues });
      }

      // 6 & 7. Coords
      const coordsPath = coordsFilePath(id);
      if (!fs.existsSync(coordsPath)) {
        results.coordsMissing.push(id);
      } else {
        let coords;
        try { coords = JSON.parse(fs.readFileSync(coordsPath, 'utf-8')); } catch { coords = {}; }
        const covIssues = checkCoordCoverage(id, erData, coords);
        if (covIssues.length > 0) {
          results.coordsCoverage.push({ id, issues: covIssues });
        }
      }

      // 8. Exam mode MCQ key format
      if (paper.testModeAvailable) {
        const mcqIssues = checkMcqErKeys(erData);
        if (mcqIssues.length > 0) {
          results.mcqKeyIssues.push({ id, issues: mcqIssues });
        }
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  AUDIT REPORT');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`  Papers audited : ${results.total}`);
console.log(`  QP PDFs missing: ${results.qpMissing.length}`);
console.log(`  MS PDFs missing: ${results.msMissing.length}`);
console.log(`  ER cache missing: ${results.erMissing.length}`);
console.log(`  ER content issues: ${results.erContentIssues.length} papers`);
console.log(`  Coords missing: ${results.coordsMissing.length}`);
console.log(`  Coords/ER coverage gaps: ${results.coordsCoverage.length} papers`);
console.log(`  MCQ key format issues: ${results.mcqKeyIssues.length} papers`);
console.log('');

function section(title, items, formatter) {
  if (items.length === 0) { console.log(`✅  ${title}: none\n`); return; }
  console.log(`❌  ${title} (${items.length}):`);
  items.slice(0, 40).forEach(item => formatter(item));
  if (items.length > 40) console.log(`    ... and ${items.length - 40} more`);
  console.log('');
}

section('QP PDFs missing', results.qpMissing, id => console.log(`  - ${id}`));
section('MS PDFs missing', results.msMissing, id => console.log(`  - ${id}`));
section('ER cache missing', results.erMissing, id => console.log(`  - ${id}`));
section('ER content issues', results.erContentIssues, ({id, issues}) => {
  console.log(`  • ${id}`);
  issues.forEach(i => console.log(i));
});
section('Coords missing', results.coordsMissing, id => console.log(`  - ${id}`));
section('Coords/ER coverage gaps', results.coordsCoverage, ({id, issues}) => {
  console.log(`  • ${id}`);
  issues.forEach(i => console.log(i));
});
section('MCQ ER key format issues', results.mcqKeyIssues, ({id, issues}) => {
  console.log(`  • ${id}`);
  issues.forEach(i => console.log(i));
});

// ── Summary by subject ────────────────────────────────────────────────────────
const bySubject = {};
for (const p of filtered) {
  const c = p.subjectCode;
  if (!bySubject[c]) bySubject[c] = { total:0, qpMissing:0, msMissing:0, erMissing:0, issues:0 };
  bySubject[c].total++;
  if (results.qpMissing.includes(p.id))  bySubject[c].qpMissing++;
  if (results.msMissing.includes(p.id))  bySubject[c].msMissing++;
  if (results.erMissing.includes(p.id))  bySubject[c].erMissing++;
  const hasIssue = results.erContentIssues.some(x => x.id === p.id)
    || results.coordsMissing.includes(p.id)
    || results.coordsCoverage.some(x => x.id === p.id)
    || results.mcqKeyIssues.some(x => x.id === p.id);
  if (hasIssue) bySubject[c].issues++;
}

console.log('───────────────────────────────────────────────────────────────');
console.log('  BY SUBJECT');
console.log('───────────────────────────────────────────────────────────────');
console.log('  Code   Papers  QP❌  MS❌  ER❌  Other⚠️');
for (const [code, s] of Object.entries(bySubject).sort()) {
  const row = [
    code.padEnd(6),
    String(s.total).padStart(6),
    String(s.qpMissing).padStart(5),
    String(s.msMissing).padStart(5),
    String(s.erMissing).padStart(5),
    String(s.issues).padStart(8),
  ].join('  ');
  const flag = (s.qpMissing + s.msMissing + s.erMissing + s.issues) > 0 ? ' ⚠️' : ' ✅';
  console.log(`  ${row}${flag}`);
}
console.log('');
console.log('Done.\n');
