/**
 * generate-all-missing-coords.mjs
 * Runs generate-coords.mjs for every paper that has ER data but no coord file.
 */
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const LANG = new Set(['0500','0501','0502','0508','0509','0510','0520','0524','0600','0696','9093','8021']);
const ER_DIR    = join(ROOT, 'public', 'er-cache');
const COORD_DIR = join(ROOT, 'public', 'question-coords');
const PDF_DIRS  = [
  join(ROOT, 'public', 'pdfs'),
  join(__dirname, 'pastpapers'),
  join(__dirname, 'pastpapers-alevels'),
];

function hasPdf(paperId) {
  return PDF_DIRS.some(d => existsSync(join(d, `${paperId}.pdf`)));
}

// Build list of papers needing coords
const erFiles = readdirSync(ER_DIR).filter(f => f.match(/^\d{4}_[msw]\d{2}_er_\d\d\.json$/));
const todo = [];
for (const ef of erFiles) {
  const m = ef.match(/^(\d{4})_([msw]\d{2})_er_(\d)(\d)\.json$/);
  if (!m) continue;
  const [, sub, sess, comp, var_] = m;
  if (LANG.has(sub)) continue;
  const paperId = `${sub}_${sess}_qp_${comp}${var_}`;
  if (existsSync(join(COORD_DIR, `${paperId}_coords.json`))) continue;
  if (!hasPdf(paperId)) continue;
  todo.push(paperId);
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`  Generating coords for ${todo.length} papers with missing coord files`);
console.log(`${'─'.repeat(60)}\n`);

if (todo.length === 0) {
  console.log('Nothing to do — all papers already have coord files!');
  process.exit(0);
}

// Group by subject for logging
const bySub = {};
for (const p of todo) { const c = p.substring(0,4); bySub[c] = (bySub[c]||0)+1; }
console.log('By subject:', Object.entries(bySub).map(([k,v]) => `${k}:${v}`).join(' '), '\n');

// Run in batches of 30 to avoid arg length limits
const BATCH = 30;
const GENERATOR = join(__dirname, 'generate-coords.mjs');

async function runBatch(batch) {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, [GENERATOR, ...batch], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    proc.on('close', code => resolve(code === 0));
  });
}

let done = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  process.stdout.write(`Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(todo.length/BATCH)} (${batch.length} papers)...\n`);
  await runBatch(batch);
  done += batch.length;
  console.log(`  → ${done}/${todo.length} done\n`);
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Done! Generated coords for up to ${todo.length} papers.`);
console.log(`  Output: public/question-coords/`);
console.log(`${'═'.repeat(60)}\n`);
