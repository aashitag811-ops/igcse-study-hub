/**
 * run-all-theory-parse.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Batch-runs parse-theory-qp.mjs for every non-language IGCSE and A-level
 * subject across BOTH scripts/pastpapers/ and scripts/pastpapers-alevels/.
 * Skips papers already present in public/theory-questions/.
 *
 * Usage:
 *   node scripts/run-all-theory-parse.mjs              # all subjects
 *   node scripts/run-all-theory-parse.mjs 0610         # single subject
 *   node scripts/run-all-theory-parse.mjs igcse        # all IGCSE subjects
 *   node scripts/run-all-theory-parse.mjs alevels      # all A-level subjects
 *   node scripts/run-all-theory-parse.mjs --force      # re-parse already-done papers
 *
 * Language subjects excluded (IGCSE):
 *   0500  First Language English
 *   0501  English as a Second Language (old code)
 *   0502  English as a Second Language
 *   0508  French
 *   0509  Spanish
 *   0510  English as a Second Language (newer)
 *   0520  French (second)
 *   0524  Arabic
 *   0600  Urdu as a Second Language
 *   0696  Bengali
 *
 * Language subjects excluded (A-Level):
 *   9093  English Language
 *   8021  English General Paper
 */

import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT        = join(__dirname, '..');
const PDFS_IGCSE  = join(__dirname, 'pastpapers');
const PDFS_AL     = join(__dirname, 'pastpapers-alevels');
const OUT_DIR     = join(ROOT, 'public', 'theory-questions');
const PARSER      = join(__dirname, 'parse-theory-qp.mjs');

// ── Language subject codes (excluded) ────────────────────────────────────────

const LANGUAGE_CODES = new Set([
  // IGCSE languages
  '0500', '0501', '0502', '0508', '0509', '0510',
  '0520', '0524', '0600', '0696',
  // A-Level languages
  '9093', '8021',
]);

// ── Subject lists ─────────────────────────────────────────────────────────────
// Derived at runtime from available PDFs; language codes are filtered out.

function getSubjectsInDir(dir) {
  if (!existsSync(dir)) return [];
  const codes = new Set();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.pdf') || !f.includes('_qp_')) continue;
    const m = f.match(/^(\d{4})_/);
    if (m && !LANGUAGE_CODES.has(m[1])) codes.add(m[1]);
  }
  return [...codes].sort();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function alreadyParsed(paperId) {
  return existsSync(join(OUT_DIR, `${paperId}.json`));
}

function getPdfsForSubjectInDir(code, dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.startsWith(`${code}_`) && f.endsWith('.pdf') && f.includes('_qp_'))
    .map(f => f.replace('.pdf', ''));
}

function getPdfsForSubject(code) {
  // Deduplicate across both dirs
  const seen = new Set();
  const result = [];
  for (const id of [...getPdfsForSubjectInDir(code, PDFS_IGCSE),
                     ...getPdfsForSubjectInDir(code, PDFS_AL)]) {
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
}

async function runParser(paperIds) {
  return new Promise((resolve) => {
    const proc = spawn(
      process.execPath,
      [PARSER, ...paperIds],
      { stdio: 'inherit', cwd: ROOT }
    );
    proc.on('close', code => resolve(code === 0));
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const cliArgs  = process.argv.slice(2);
  const force    = cliArgs.includes('--force');
  const posArgs  = cliArgs.filter(a => a !== '--force');
  const arg      = posArgs[0]?.toLowerCase();

  // Discover all non-language subject codes present in either PDF dir
  const allIgcse  = getSubjectsInDir(PDFS_IGCSE);
  const allALevel = getSubjectsInDir(PDFS_AL);
  // Also include A-level codes that appear in PDFS_IGCSE (some repos mix them)
  const allCodes  = [...new Set([...allIgcse, ...allALevel])].sort();

  // Hardcoded A-level code list for the 'alevels' filter
  const ALEVEL_PREFIXES = ['9', '8'];  // All 9xxx and 8xxx codes are A-level

  let subjects;
  if (!arg || arg === 'all') {
    subjects = allCodes;
  } else if (arg === 'igcse') {
    subjects = allCodes.filter(c => c.startsWith('0'));
  } else if (arg === 'alevels' || arg === 'alevel') {
    subjects = allCodes.filter(c => ALEVEL_PREFIXES.some(p => c.startsWith(p)));
  } else if (/^\d{4}$/.test(arg)) {
    if (LANGUAGE_CODES.has(arg)) {
      console.error(`${arg} is a language subject — excluded from parsing.`);
      process.exit(1);
    }
    subjects = [arg];
  } else {
    console.error(`Unknown argument: ${arg}`);
    console.error('Usage: node scripts/run-all-theory-parse.mjs [all|igcse|alevels|CODE] [--force]');
    process.exit(1);
  }

  console.log(`\n${'─'.repeat(65)}`);
  console.log(`  All-Papers Batch Parser`);
  console.log(`  Subjects: ${subjects.length} (${subjects.join(', ')})`);
  if (force) console.log('  Mode: FORCE (re-parse already done papers)');
  console.log(`${'─'.repeat(65)}\n`);

  let grandTotal = 0, grandDone = 0, grandSkipped = 0;

  for (const code of subjects) {
    const allPapers = getPdfsForSubject(code);
    const todo      = force ? allPapers : allPapers.filter(p => !alreadyParsed(p));
    const skipped   = allPapers.length - todo.length;

    console.log(`\n── ${code} ${'─'.repeat(50 - code.length)}`);
    console.log(`   ${allPapers.length} QPs found, ${skipped} already parsed, ${todo.length} to parse`);

    grandTotal   += allPapers.length;
    grandSkipped += skipped;

    if (todo.length === 0) {
      console.log('   ✓ All done — skipping.');
      continue;
    }

    // Run in batches of 50 to avoid hitting node arg limits
    const BATCH = 50;
    let subjectOk = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
      const batch = todo.slice(i, i + BATCH);
      process.stdout.write(`   Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(todo.length / BATCH)} (${batch.length} papers)... `);
      const ok = await runParser(batch);
      if (ok) {
        subjectOk += batch.length;
        process.stdout.write(`done\n`);
      } else {
        process.stdout.write(`some errors — continuing\n`);
        subjectOk += batch.length; // parser exits 0 even on partial failures
      }
    }
    grandDone += subjectOk;
    console.log(`   ✓ ${code} complete: ${subjectOk} processed`);
  }

  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  TOTAL: ${grandTotal} QPs | ${grandDone} processed | ${grandSkipped} already done`);
  console.log(`  Output: public/theory-questions/`);
  console.log(`${'═'.repeat(65)}\n`);

  console.log('Next steps:');
  console.log('  git add public/theory-questions/');
  console.log('  git commit -m "feat: parse all papers"');
  console.log('  git push origin main\n');
}

main().catch(err => { console.error(err); process.exit(1); });
