#!/usr/bin/env node
/**
 * test-all-er.js
 * ──────────────
 * Validates ALL ER cache files for every subject.
 *
 * Usage:
 *   node scripts/test-all-er.js                  # summary per subject
 *   node scripts/test-all-er.js --verbose         # show all failures inline
 *   node scripts/test-all-er.js --subject 0606    # single subject only
 */

const fs   = require('fs');
const path = require('path');

const ER_DIR  = path.join(__dirname, '..', 'public', 'er-cache');
const VERBOSE = process.argv.includes('--verbose');
const ONLY    = (() => { const i = process.argv.indexOf('--subject'); return i !== -1 ? process.argv[i+1] : null; })();

const SENTENCE_END = new Set(['.', '!', '?', ')', '"', "'", ':', ';', '…']);

// Sessions that predate "Key messages" — expected to not have it
const OLD_SESSIONS = ['s10','w10','m10','s11','w11','m11','s12','w12','m12'];

const SUBJECTS = {
  // IGCSE
  '0417': 'ICT',
  '0450': 'Business Studies',
  '0452': 'Accounting',
  '0455': 'Economics',
  '0457': 'Global Perspectives',
  '0500': 'First Language English',
  '0580': 'Mathematics',
  '0606': 'Additional Mathematics',
  '0610': 'Biology',
  '0620': 'Chemistry',
  '0625': 'Physics',
  // A-Level
  '9700': 'A-Level Biology',
  '9701': 'A-Level Chemistry',
  '9702': 'A-Level Physics',
  '9706': 'A-Level Accounting',
  '9708': 'A-Level Economics',
  '9709': 'A-Level Mathematics',
  '9231': 'A-Level Further Mathematics',
  '9608': 'A-Level Computer Science (9608)',
  '9618': 'A-Level Computer Science (9618)',
  '9609': 'A-Level Business',
  '9093': 'A-Level English Language',
};

function checkFile(filename, filepath) {
  const issues = [];
  const warns  = [];

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return { issues: ['PARSE_ERROR: invalid JSON'], warns: [] };
  }

  const { notes, labels, pages } = data;

  if (!notes || typeof notes !== 'object') return { issues: ['missing notes'], warns: [] };
  if (!labels || typeof labels !== 'object') issues.push('missing labels');
  if (!pages  || typeof pages  !== 'object') issues.push('missing pages (run extractor)');

  const noteKeys  = Object.keys(notes  || {});
  const qNoteKeys = noteKeys.filter(k => /^\d/.test(k));

  if (qNoteKeys.length < 3) issues.push(`too few question notes: ${qNoteKeys.length}`);

  if (pages && Object.keys(pages).length === 0) {
    warns.push('pages dict is empty');
  }

  // key_messages — only warn, not fail; older papers don't have it
  const session = filename.match(/_([msw]\d{2})_/)?.[1] ?? '';
  const isOld   = OLD_SESSIONS.some(s => session === s);
  if (!notes.key_messages && !isOld) {
    warns.push('no key_messages');
  }

  // general_comments
  const gc = notes.general_comments;
  if (!gc) {
    warns.push('no general_comments');
  } else {
    const trimmed = gc.trimEnd();
    const last    = trimmed[trimmed.length - 1];
    if (!SENTENCE_END.has(last)) {
      issues.push(`gc_truncated: "…${trimmed.slice(-70).replace(/\n/g, '↵')}"`);
    }
  }

  // label coverage
  const missingLabels = noteKeys.filter(k => !(labels || {})[k]);
  if (missingLabels.length > 0) issues.push(`notes missing labels: ${missingLabels.join(', ')}`);

  // page coverage
  if (pages) {
    const missingPages = qNoteKeys.filter(k => pages[k] === undefined);
    if (missingPages.length > 5) warns.push(`${missingPages.length} question keys missing page`);
  }

  return { issues, warns };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const allFiles = fs.readdirSync(ER_DIR).filter(f => f.endsWith('.json')).sort();

// Group by subject code
const bySubject = {};
for (const f of allFiles) {
  const code = f.split('_')[0];
  if (ONLY && code !== ONLY) continue;
  if (!bySubject[code]) bySubject[code] = [];
  bySubject[code].push(f);
}

let grandTotal = 0, grandPass = 0, grandFail = 0, grandWarn = 0;
const allFailures = [];

const codes = Object.keys(bySubject).sort();

for (const code of codes) {
  const files   = bySubject[code];
  const name    = SUBJECTS[code] ?? code;
  let pass = 0, fail = 0, warn = 0;
  const subjFailures = [];

  for (const filename of files) {
    const { issues, warns } = checkFile(filename, path.join(ER_DIR, filename));
    if (issues.length > 0) {
      fail++;
      subjFailures.push({ filename, issues });
    } else {
      pass++;
      if (warns.length > 0) warn++;
    }
  }

  const total  = files.length;
  const status = fail === 0 ? '✓' : '✗';
  const pct    = Math.round((pass / total) * 100);
  console.log(`${status} ${code} ${name.padEnd(30)} ${String(pass).padStart(4)}/${total} pass  ${fail > 0 ? `(${fail} fail)` : ''}  ${warn > 0 ? `(${warn} warn)` : ''}`);

  if (VERBOSE && subjFailures.length > 0) {
    for (const { filename, issues } of subjFailures) {
      console.log(`     ✗ ${filename}`);
      for (const issue of issues) console.log(`         • ${issue}`);
    }
  }

  grandTotal += total;
  grandPass  += pass;
  grandFail  += fail;
  grandWarn  += warn;
  allFailures.push(...subjFailures);
}

console.log('');
console.log('═'.repeat(60));
console.log(` TOTAL: ${grandTotal} files   ✓ ${grandPass} pass   ✗ ${grandFail} fail   ⚠ ${grandWarn} warn`);
console.log('═'.repeat(60));

if (!VERBOSE && allFailures.length > 0) {
  console.log(`\nRun with --verbose to see all ${allFailures.length} failures in detail.`);
  console.log(`Run with --subject CODE (e.g. --subject 0606) to test one subject.\n`);
}

process.exit(grandFail > 0 ? 1 : 0);
