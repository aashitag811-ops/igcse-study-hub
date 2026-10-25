/**
 * regen-all-coords.mjs
 * Regenerates all IGCSE + A-level coord files by running generate-coords.mjs
 * and generate-alevels-coords.mjs for each subject in parallel batches.
 *
 * Usage:
 *   node scripts/regen-all-coords.mjs
 *   node scripts/regen-all-coords.mjs --concurrency 4
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? '3');

// Collect all unique subject codes from ER cache
const erDir = join(ROOT, 'public', 'er-cache');
const erFiles = readdirSync(erDir).filter(f => f.endsWith('.json') && !f.includes('er_notes'));

const igcseSubjects = new Set();
const alevelsSubjects = new Set();

for (const f of erFiles) {
  const m = f.match(/^(\d{4})_/);
  if (!m) continue;
  const code = m[1];
  if (code.startsWith('0') || code.startsWith('7')) igcseSubjects.add(code);
  else alevelsSubjects.add(code);
}

console.log(`IGCSE subjects: ${igcseSubjects.size}, A-Level subjects: ${alevelsSubjects.size}`);
console.log(`Concurrency: ${CONCURRENCY}\n`);

function runScript(script, subject) {
  return new Promise((resolve) => {
    const proc = spawn('node', [join(__dirname, script), subject], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: ROOT,
    });
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => {}); // suppress warnings
    proc.on('close', code => {
      const match = out.match(/Done\.\s*✓\s*(\d+)\s*written.*?(\d+)\s*skipped.*?(\d+)\s*failed/) ??
                    out.match(/Done:\s*(\d+)\s*generated.*?(\d+)\s*skipped.*?(\d+)\s*failed/);
      if (match) {
        console.log(`[${script.replace('generate-','').replace('.mjs','')}] ${subject}: ✓${match[1]} skip${match[2]} fail${match[3]}`);
      } else {
        console.log(`[${script.replace('generate-','').replace('.mjs','')}] ${subject}: done`);
      }
      resolve();
    });
  });
}

async function runBatch(tasks, concurrency) {
  const queue = [...tasks];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) await task();
    }
  });
  await Promise.all(workers);
}

// Build task lists
const igcseTasks = [...igcseSubjects].sort().map(s => () => runScript('generate-coords.mjs', s));
const alevelsTasks = [...alevelsSubjects].sort().map(s => () => runScript('generate-alevels-coords.mjs', s));

console.log('=== Running IGCSE coord generation ===');
await runBatch(igcseTasks, CONCURRENCY);

console.log('\n=== Running A-Level coord generation ===');
await runBatch(alevelsTasks, CONCURRENCY);

console.log('\n=== Done ===');
