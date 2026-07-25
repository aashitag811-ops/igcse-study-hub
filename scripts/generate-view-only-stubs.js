// Generates minimal view-only JSON stubs for subjects that have no MCQ papers.
// These stubs let the manifest generator include them so they appear in the
// paper selector under View Mode (testModeAvailable stays false for these codes).
//
// Usage: node scripts/generate-view-only-stubs.js

const fs = require('fs');
const path = require('path');

const papersDir = path.join(__dirname, '../public/papers');

// Subject name map
const SUBJECT_NAMES = {
  '0450': 'Business Studies',
  '0457': 'Global Perspectives',
  '0549': 'Hindi as a Second Language',
};

// Paper descriptions
const PAPER_DESCS = {
  '0450': { 1: 'Short Answer and Data Response', 2: 'Case Study' },
  '0457': { 1: 'Written Examination (70 marks)' },
  '0549': { 1: 'Reading and Writing', 2: 'Listening' },
};

// Sessions available per subject (GP and Hindi don't have February/March series)
const SESSIONS = {
  '0450': ['m', 's', 'w'],
  '0457': ['s', 'w'],       // GP: May/June + Oct/Nov only
  '0549': ['s', 'w'],       // Hindi: May/June + Oct/Nov only
};

// Papers (components+variants) per subject
// All view-only so variant doesn't matter much — use variant 1 as the single entry
const PAPER_VARIANTS = {
  '0450': [{ component: 1, variant: 1 }, { component: 2, variant: 1 }],
  '0457': [{ component: 1, variant: 1 }],
  '0549': [{ component: 1, variant: 1 }, { component: 2, variant: 1 }],
};

// Year range
const YEARS = [];
for (let y = 2010; y <= 2025; y++) YEARS.push(y);

let created = 0;
let skipped = 0;

for (const [code, subjectName] of Object.entries(SUBJECT_NAMES)) {
  const sessions = SESSIONS[code];
  const paperVariants = PAPER_VARIANTS[code];
  const paperDescs = PAPER_DESCS[code];

  for (const year of YEARS) {
    const yy = String(year).slice(-2);
    for (const session of sessions) {
      for (const { component, variant } of paperVariants) {
        const paperId = `${code}_${session}${yy}_qp_${component}${variant}`;
        const filePath = path.join(papersDir, `${paperId}.json`);

        if (fs.existsSync(filePath)) {
          skipped++;
          continue;
        }

        const seasonName = { m: 'February/March', s: 'May/June', w: 'October/November' }[session];
        const stub = {
          paperId,
          paperName: `${subjectName} ${year} ${seasonName} Paper ${component}`,
          subject: subjectName,
          subjectCode: code,
          year,
          session,
          component,
          variant,
          totalQuestions: 0,
          viewOnly: true,
          questions: [{ viewOnly: true }], // non-empty so manifest generator includes it
        };

        fs.writeFileSync(filePath, JSON.stringify(stub, null, 2));
        created++;
      }
    }
  }
}

console.log(`Done. Created: ${created}, Skipped (already exist): ${skipped}`);
