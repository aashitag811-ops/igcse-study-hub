// audit-math-deep.mjs — deep audit of 0580 question counts by component type

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIR = join(ROOT, 'public', 'theory-questions');

const files = readdirSync(DIR).filter(f => f.startsWith('0580_') && f.endsWith('.json'));

// Group by component type
const groups = { mcq: [], theory: [], other: [] };

let totalQ = 0;
let totalSubparts = 0;
const lowQ = [];   // papers with suspiciously low question count

function countSubparts(parts) {
  if (!Array.isArray(parts)) return 0;
  let n = parts.length;
  for (const p of parts) n += countSubparts(p.parts);
  return n;
}

for (const f of files) {
  const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const comp = raw.component ? parseInt(raw.component) : 0;
  const qCount = raw.questions?.length ?? 0;
  let spCount = 0;
  for (const q of (raw.questions ?? [])) spCount += countSubparts(q.parts);

  totalQ += qCount;
  totalSubparts += spCount;

  const type = comp <= 29 ? 'mcq' : 'theory';
  groups[type].push({ f, comp, qCount, spCount });

  // Flag papers where question count looks wrong
  if (comp >= 10 && comp <= 29 && qCount < 15) lowQ.push({ f, comp, qCount, expected: '20-40' });
  if (comp >= 30 && comp <= 49 && qCount < 3)  lowQ.push({ f, comp, qCount, expected: '6-12' });
}

// Stats per component group
function stats(arr) {
  if (!arr.length) return 'none';
  const counts = arr.map(x => x.qCount);
  const min = Math.min(...counts), max = Math.max(...counts);
  const avg = (counts.reduce((a,b)=>a+b,0)/counts.length).toFixed(1);
  return `min=${min}  max=${max}  avg=${avg}  papers=${arr.length}`;
}

console.log('\n=== 0580 Mathematics — deep audit ===\n');
console.log(`Total question entries (questionCount sum): ${totalQ}`);
console.log(`Total sub-parts across all questions:       ${totalSubparts}`);
console.log(`Combined questions+subparts:                ${totalQ + totalSubparts}`);

// break down by component
const byComp = {};
for (const g of [...groups.mcq, ...groups.theory]) {
  const c = g.comp;
  if (!byComp[c]) byComp[c] = [];
  byComp[c].push(g);
}
console.log('\n--- By component ---');
for (const c of Object.keys(byComp).sort((a,b)=>a-b)) {
  const arr = byComp[c];
  const counts = arr.map(x => x.qCount);
  const min = Math.min(...counts), max = Math.max(...counts), avg = (counts.reduce((a,b)=>a+b,0)/counts.length).toFixed(1);
  console.log(`  comp ${String(c).padStart(2,'0')}  papers=${arr.length}  q/paper: min=${min} avg=${avg} max=${max}`);
}

console.log(`\n--- Suspiciously low question count (${lowQ.length} papers) ---`);
lowQ.slice(0, 30).forEach(x => console.log(`  ${x.f}  comp=${x.comp}  got=${x.qCount}  expected=${x.expected}`));
if (lowQ.length > 30) console.log(`  ... and ${lowQ.length - 30} more`);
