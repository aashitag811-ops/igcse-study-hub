#!/usr/bin/env node
/**
 * test-0606-er.js
 * ───────────────
 * Validates all 0606 Additional Mathematics ER cache files.
 *
 * Checks per file:
 *   ✓ Valid JSON
 *   ✓ Has notes, labels, pages fields
 *   ✓ At least 3 question notes
 *   ✓ Pages dict not empty
 *   ✓ general_comments not truncated mid-sentence
 *   ✓ Every note key has a matching label
 *   ✓ Every note key that is a question number has a page entry
 *
 * Usage:
 *   node scripts/test-0606-er.js
 *   node scripts/test-0606-er.js --verbose   (show passing files too)
 */

const fs   = require('fs');
const path = require('path');

const ER_DIR  = path.join(__dirname, '..', 'public', 'er-cache');
const VERBOSE = process.argv.includes('--verbose');

const SENTENCE_END = new Set(['.', '!', '?', ')', '"', "'", ':', ';', '…']);

// 2010 papers predate "Key messages" — expected to not have it
const NO_KM_EXPECTED = ['s10', 'w10', 'm10'];

let pass = 0, fail = 0, warn = 0;
const failures = [];
const warnings = [];

const files = fs.readdirSync(ER_DIR)
  .filter(f => f.startsWith('0606_') && f.endsWith('.json'))
  .sort();

for (const filename of files) {
  const filepath = path.join(ER_DIR, filename);
  const issues = [];
  const warningList = [];

  // ── Parse ───────────────────────────────────────────────────────────────
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    issues.push('PARSE_ERROR: invalid JSON');
    failures.push({ filename, issues });
    fail++;
    continue;
  }

  const { notes, labels, pages } = data;

  // ── Structure ────────────────────────────────────────────────────────────
  if (!notes || typeof notes !== 'object') { issues.push('missing notes'); }
  if (!labels || typeof labels !== 'object') { issues.push('missing labels'); }
  if (!pages || typeof pages !== 'object') { issues.push('missing pages'); }
  if (issues.length) {
    failures.push({ filename, issues });
    fail++;
    continue;
  }

  const noteKeys = Object.keys(notes);
  const qNoteKeys = noteKeys.filter(k => /^\d/.test(k));

  // ── Note count ───────────────────────────────────────────────────────────
  if (qNoteKeys.length < 3) {
    issues.push(`too few question notes: ${qNoteKeys.length}`);
  }

  // ── Pages not empty ──────────────────────────────────────────────────────
  if (Object.keys(pages).length === 0) {
    issues.push('pages dict is empty (run extractor again)');
  }

  // ── key_messages ─────────────────────────────────────────────────────────
  const session = filename.match(/_([msw]\d{2})_/)?.[1] ?? '';
  const expectNoKM = NO_KM_EXPECTED.some(s => session.startsWith(s[0]) && session.slice(1) === s.slice(1));
  if (!notes.key_messages && !expectNoKM) {
    warningList.push('no key_messages (older format or extraction miss)');
  }

  // ── general_comments not truncated ───────────────────────────────────────
  const gc = notes.general_comments;
  if (!gc) {
    warningList.push('no general_comments');
  } else {
    const trimmed = gc.trimEnd();
    const lastChar = trimmed[trimmed.length - 1];
    if (!SENTENCE_END.has(lastChar)) {
      issues.push(`general_comments truncated (ends: "…${trimmed.slice(-60)}")`);
    }
  }

  // ── Label coverage ───────────────────────────────────────────────────────
  const missingLabels = noteKeys.filter(k => !labels[k]);
  if (missingLabels.length > 0) {
    issues.push(`notes missing labels: ${missingLabels.join(', ')}`);
  }

  // ── Page coverage for question notes ─────────────────────────────────────
  const missingPages = qNoteKeys.filter(k => pages[k] === undefined);
  if (missingPages.length > 3) {
    // tolerate a few sub-parts missing pages, but flag if lots are missing
    warningList.push(`${missingPages.length} question keys missing page number`);
  }

  // ── Tally ────────────────────────────────────────────────────────────────
  if (issues.length > 0) {
    failures.push({ filename, issues });
    fail++;
  } else {
    if (warningList.length > 0) {
      warnings.push({ filename, warningList });
      warn++;
    }
    pass++;
    if (VERBOSE) console.log(`  ✓ ${filename}`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log(` 0606 ER Cache — Test Results`);
console.log('══════════════════════════════════════════');
console.log(` Total files : ${files.length}`);
console.log(` ✓ Pass      : ${pass}`);
console.log(` ⚠ Warn      : ${warn}`);
console.log(` ✗ Fail      : ${fail}`);
console.log('══════════════════════════════════════════\n');

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const { filename, issues } of failures) {
    console.log(`  ✗ ${filename}`);
    for (const issue of issues) console.log(`      • ${issue}`);
  }
  console.log('');
}

if (warnings.length > 0) {
  console.log('WARNINGS:');
  for (const { filename, warningList } of warnings) {
    console.log(`  ⚠ ${filename}`);
    for (const w of warningList) console.log(`      • ${w}`);
  }
  console.log('');
}

process.exit(fail > 0 ? 1 : 0);
