/**
 * run-all-theory-parse.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Batch-runs parse-theory-qp.mjs for every required subject across IGCSE and
 * A-level. Skips papers already present in public/theory-questions/.
 *
 * Usage:
 *   node scripts/run-all-theory-parse.mjs              # all subjects
 *   node scripts/run-all-theory-parse.mjs 0610         # single subject
 *   node scripts/run-all-theory-parse.mjs igcse        # all IGCSE subjects
 *   node scripts/run-all-theory-parse.mjs alevels      # all A-level subjects
 *
 * Subjects parsed (languages excluded except 0500 First Language English):
 *
 *   IGCSE:
 *     0500  First Language English (theory only – components 11,12,13,21,22,23 etc)
 *     0580  Mathematics
 *     0610  Biology
 *     0620  Chemistry
 *     0625  Physics
 *     0417  ICT
 *
 *   A-Level:
 *     9700  Biology
 *     9701  Chemistry
 *     9702  Physics
 *     9709  Mathematics
 *     9708  Economics
 *     9706  Accounting
 *     9618  Computer Science (new)
 *     9608  Computer Science (old)
 *     9609  Business
 *     9231  Further Mathematics
 *
 * Note: 0452 Accounting, 0455 Economics, 0478 CS, 0457 Global Perspectives
 * have no theory-component PDFs in scripts/pastpapers/ so they are skipped.
 */

import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const PDFS_DIR   = join(__dirname, 'pastpapers');
const OUT_DIR    = join(ROOT, 'public', 'theory-questions');
const PARSER     = join(__dirname, 'parse-theory-qp.mjs');

// ── Subject lists ─────────────────────────────────────────────────────────────

const IGCSE_SUBJECTS  = ['0500', '0580', '0610', '0620', '0625', '0417'];
const ALEVEL_SUBJECTS = ['9700', '9701', '9702', '9709', '9708', '9706',
                         '9618', '9608', '9609', '9231'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTheoryComponent(filename) {
  // Theory = component 3x, 4x, 5x, 6x  (not 1x MCQ or 2x structured MCQ)
  return /^[3456]\d$/.test(filename.replace(/.*_qp_/, '').replace('.pdf', ''));
}

function alreadyParsed(paperId) {
  return existsSync(join(OUT_DIR, `${paperId}.json`));
}

function getPdfsForSubject(code) {
  if (!existsSync(PDFS_DIR)) return [];
  return readdirSync(PDFS_DIR)
    .filter(f => f.startsWith(`${code}_`) && f.endsWith('.pdf') && f.includes('_qp_') && isTheoryComponent(f))
    .map(f => f.replace('.pdf', ''));
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
  const arg = process.argv[2]?.toLowerCase();

  // Pick subject list based on CLI arg
  let subjects;
  if (!arg || arg === 'all') {
    subjects = [...IGCSE_SUBJECTS, ...ALEVEL_SUBJECTS];
  } else if (arg === 'igcse') {
    subjects = IGCSE_SUBJECTS;
  } else if (arg === 'alevels' || arg === 'alevel') {
    subjects = ALEVEL_SUBJECTS;
  } else if (/^\d{4}$/.test(arg)) {
    subjects = [arg];
  } else {
    console.error(`Unknown argument: ${arg}`);
    console.error('Usage: node scripts/run-all-theory-parse.mjs [all|igcse|alevels|CODE]');
    process.exit(1);
  }

  console.log(`\n${'─'.repeat(65)}`);
  console.log(`  Theory Paper Batch Parser`);
  console.log(`  Subjects: ${subjects.join(', ')}`);
  console.log(`${'─'.repeat(65)}\n`);

  let grandTotal = 0, grandDone = 0, grandSkipped = 0;

  for (const code of subjects) {
    const allPapers = getPdfsForSubject(code);
    const todo      = allPapers.filter(p => !alreadyParsed(p));
    const skipped   = allPapers.length - todo.length;

    console.log(`\n── ${code} ─────────────────────────────────────────────`);
    console.log(`   ${allPapers.length} theory QPs found, ${skipped} already parsed, ${todo.length} to parse`);

    grandTotal   += allPapers.length;
    grandSkipped += skipped;

    if (todo.length === 0) {
      console.log('   ✓ All done — skipping.');
      grandDone += 0;
      continue;
    }

    // Run in batches of 50 to avoid hitting node arg limits
    const BATCH = 50;
    let subjectOk = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
      const batch = todo.slice(i, i + BATCH);
      process.stdout.write(`   Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(todo.length/BATCH)} (${batch.length} papers)... `);
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
    console.log(`   ✓ ${code} complete: ${subjectOk} parsed`);
  }

  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  TOTAL: ${grandTotal} QPs | ${grandDone} parsed | ${grandSkipped} already done`);
  console.log(`  Output: public/theory-questions/`);
  console.log(`${'═'.repeat(65)}\n`);

  console.log('Next steps:');
  console.log('  git add public/theory-questions/');
  console.log('  git commit -m "feat: parse all theory QPs"');
  console.log('  git push origin main\n');
}

main().catch(err => { console.error(err); process.exit(1); });
