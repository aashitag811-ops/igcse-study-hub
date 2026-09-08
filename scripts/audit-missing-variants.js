/**
 * Comprehensive audit: what QP stubs are missing from public/papers/
 * compared to the full expected set of all variants/sessions/years.
 *
 * Run: node scripts/audit-missing-variants.js
 */

const fs   = require('fs');
const path = require('path');

const PAPERS_DIR = path.join(__dirname, '../public/papers');
const existing   = new Set(fs.readdirSync(PAPERS_DIR).map(f => f.replace('.json', '')));

// ── IGCSE subject definitions ────────────────────────────────────────────────
const IGCSE = {
  '0610': { name:'Biology',                 sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  '0620': { name:'Chemistry',               sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  '0625': { name:'Physics',                 sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  '0580': { name:'Mathematics',             sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '0606': { name:'Additional Mathematics',  sessions:['m','s','w'], papers:['11','12','13','21','22','23'] },
  '0478': { name:'Computer Science',        sessions:['m','s','w'], papers:['11','12','13','21','22','23'] },
  '0455': { name:'Economics',               sessions:['m','s','w'], papers:['11','12','13','21','22','23'] },
  '0452': { name:'Accounting',              sessions:['m','s','w'], papers:['11','12','13','21','22','23'] },
  '0450': { name:'Business Studies',        sessions:['m','s','w'], papers:['11','12','13','21','22','23'] },
  '0417': { name:'ICT',                     sessions:['s','w'],     papers:['11','12','13','21','22','31','32'] },
  '0448': { name:'Travel and Tourism',      sessions:['m','s','w'], papers:['11','12','13','21','22','23'] },
  '0500': { name:'First Language English',  sessions:['m','s','w'], papers:['11','12','13','21','22','23'] },
  '0510': { name:'ESL',                     sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33'] },
  '0520': { name:'French',                  sessions:['m','s','w'], papers:['11','12','13','21','22','23','41','42','43'] },
  '0549': { name:'Hindi',                   sessions:['s','w'],     papers:['11','12','21','22'] },
  '0457': { name:'Global Perspectives',     sessions:['s','w'],     papers:['11','12','13'] },
  '0470': { name:'History',                 sessions:['m','s','w'], papers:['11','12','13','21','22','23','41','42','43'] },
  '0460': { name:'Geography',               sessions:['m','s','w'], papers:['11','12','13','21','22','23','41','42','43'] },
  '0490': { name:'Religious Studies',       sessions:['s','w'],     papers:['11','12','13','21','22','23'] },
};

// ── A-Level subject definitions ───────────────────────────────────────────────
const ALEVEL = {
  '9700': { name:'Biology',                  sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'] },
  '9701': { name:'Chemistry',                sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'] },
  '9702': { name:'Physics',                  sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'] },
  '9709': { name:'Mathematics',              sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63','71','72','73'] },
  '9231': { name:'Further Mathematics',      sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '9608': { name:'Computer Science (9608)',  sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33'] },
  '9618': { name:'Computer Science (9618)',  sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33'] },
  '9609': { name:'Business',                 sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33'] },
  '9708': { name:'Economics',                sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '9706': { name:'Accounting',               sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33'] },
  '9093': { name:'English Language',         sessions:['m','s','w'], papers:['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '8021': { name:'English General Paper',    sessions:['s','w'],     papers:['11','12','13','21','22','23'] },
};

const YEARS = [];
for (let y = 10; y <= 25; y++) YEARS.push(String(y).padStart(2,'0'));

function audit(subjects, label) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label} — MISSING QP STUBS (2010–2025)`);
  console.log('═'.repeat(60));
  
  let totalMissing = 0;
  const allMissing = [];

  for (const [code, s] of Object.entries(subjects)) {
    const missing = [];
    for (const yr of YEARS) {
      for (const sess of s.sessions) {
        for (const paper of s.papers) {
          const id = `${code}_${sess}${yr}_qp_${paper}`;
          if (!existing.has(id)) missing.push(id);
        }
      }
    }
    if (missing.length === 0) {
      console.log(`✅ ${code} ${s.name}: complete`);
    } else {
      const expected = s.sessions.length * YEARS.length * s.papers.length;
      const pct = Math.round((1 - missing.length / expected) * 100);
      console.log(`❌ ${code} ${s.name}: MISSING ${missing.length}/${expected} (${pct}% covered)`);
      // Show first 5 examples
      missing.slice(0, 5).forEach(id => console.log(`     ${id}`));
      if (missing.length > 5) console.log(`     ... and ${missing.length - 5} more`);
      totalMissing += missing.length;
      allMissing.push(...missing);
    }
  }
  console.log(`\nTotal missing for ${label}: ${totalMissing}`);
  return allMissing;
}

const igcseMissing  = audit(IGCSE,  'IGCSE');
const alevelMissing = audit(ALEVEL, 'A-Level');

console.log(`\n${'═'.repeat(60)}`);
console.log(`  GRAND TOTAL`);
console.log('═'.repeat(60));
console.log(`IGCSE missing:   ${igcseMissing.length}`);
console.log(`A-Level missing: ${alevelMissing.length}`);
console.log(`TOTAL:           ${igcseMissing.length + alevelMissing.length}`);

// Write the missing IDs to files for reference
fs.writeFileSync(path.join(__dirname, 'missing-igcse-stubs.txt'),  igcseMissing.join('\n'));
fs.writeFileSync(path.join(__dirname, 'missing-alevels-stubs.txt'), alevelMissing.join('\n'));
console.log('\nFull lists saved to scripts/missing-igcse-stubs.txt and scripts/missing-alevels-stubs.txt');
