// audit-theory-questions.mjs
// Checks quality of theory-questions JSONs for given subjects

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIR = join(ROOT, 'public', 'theory-questions');

const subjects = process.argv.slice(2).length ? process.argv.slice(2) : ['0580','0455','0620','0625','0610'];

function flattenText(q) {
  const parts = [];
  if (Array.isArray(q.text)) parts.push(...q.text);
  else if (typeof q.text === 'string') parts.push(q.text);
  function walkParts(ps) {
    if (!Array.isArray(ps)) return;
    for (const p of ps) {
      if (p.text) parts.push(typeof p.text === 'string' ? p.text : p.text.join(' '));
      walkParts(p.parts);
    }
  }
  walkParts(q.parts);
  return parts.join(' ').trim();
}

for (const subj of subjects) {
  const files = readdirSync(DIR).filter(f => f.startsWith(subj + '_') && f.endsWith('.json'));
  let totalPapers = files.length;
  let totalQ = 0;
  let emptyPapers = [];
  let shortTextQ = [];   // questions with < 10 chars total text
  let noPartsQ = [];     // theory papers (3x/4x/5x/6x) where questions have NO parts at all
  let totalMarksZero = [];

  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    const comp = parseInt(raw.component);
    const isTheory = comp >= 30;

    totalQ += raw.questionCount;

    if (raw.questions.length === 0) {
      emptyPapers.push(f);
      continue;
    }

    if (raw.totalMarks === 0 && isTheory) {
      totalMarksZero.push(f);
    }

    for (const q of raw.questions) {
      const text = flattenText(q);
      if (text.length < 10) {
        shortTextQ.push(`${f} Q${q.id}`);
      }
      if (isTheory && (!q.parts || q.parts.length === 0)) {
        noPartsQ.push(`${f} Q${q.id}`);
      }
    }
  }

  console.log(`\n=== ${subj} ===`);
  console.log(`  Papers: ${totalPapers}  |  Total questions: ${totalQ}`);
  console.log(`  Empty papers (0 questions): ${emptyPapers.length}`);
  emptyPapers.forEach(f => console.log(`    - ${f}`));
  console.log(`  Theory papers with totalMarks=0: ${totalMarksZero.length}`);
  totalMarksZero.slice(0,5).forEach(f => console.log(`    - ${f}`));
  if (totalMarksZero.length > 5) console.log(`    ... and ${totalMarksZero.length - 5} more`);
  console.log(`  Questions with very short text (<10 chars): ${shortTextQ.length}`);
  shortTextQ.slice(0,10).forEach(q => console.log(`    - ${q}`));
  if (shortTextQ.length > 10) console.log(`    ... and ${shortTextQ.length - 10} more`);
  console.log(`  Theory questions with no parts: ${noPartsQ.length}`);
  noPartsQ.slice(0,10).forEach(q => console.log(`    - ${q}`));
  if (noPartsQ.length > 10) console.log(`    ... and ${noPartsQ.length - 10} more`);
}
