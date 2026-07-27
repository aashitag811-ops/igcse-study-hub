/**
 * Generate view-only JSON stubs for every QP PDF that doesn't have one yet.
 * These stubs register papers in the manifest so they appear in the selector.
 * Run: node scripts/generate-all-stubs.js
 */

const fs = require('fs');
const path = require('path');

const PDF_DIR = path.join(__dirname, 'pastpapers');
const JSON_DIR = path.join(__dirname, '../public/papers');

const SUBJECT_NAMES = {
  '0417': 'Information and Communication Technology',
  '0450': 'Business Studies',
  '0452': 'Accounting',
  '0455': 'Economics',
  '0457': 'Global Perspectives',
  '0500': 'First Language English',
  '0520': 'French - Foreign Language',
  '0549': 'Hindi as a Second Language',
  '0580': 'Mathematics',
  '0606': 'Additional Mathematics',
  '0610': 'Biology',
  '0620': 'Chemistry',
  '0625': 'Physics',
};

const SEASON_NAMES = { m: 'February/March', s: 'May/June', w: 'October/November' };

// MCQ-eligible subjects — these will be parsed later, stubs are placeholders
const MCQ_SUBJECTS = new Set(['0610','0620','0625','0455','0452']);

let created = 0, skipped = 0, updated = 0;

const pdfs = fs.readdirSync(PDF_DIR)
  .filter(f => f.includes('_qp_') && f.endsWith('.pdf'));

for (const pdfFile of pdfs) {
  const m = pdfFile.match(/^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)\.pdf$/);
  if (!m) continue;
  const [, code, sess, yy, comp, vari] = m;
  const paperId = pdfFile.replace('.pdf', '');
  const jsonPath = path.join(JSON_DIR, paperId + '.json');

  // Skip if already has a real parsed JSON with actual questions (not view-only stub)
  if (fs.existsSync(jsonPath)) {
    const d = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const qs = d.questions || [];
    // Keep real parsed papers (have imageUrl), only update view-only stubs
    const isReal = qs.length > 0 && !qs[0].viewOnly && qs[0].imageUrl;
    if (isReal) { skipped++; continue; }
    // Update existing view-only stubs to ensure correct metadata
    if (qs.length > 0 && qs[0].viewOnly) {
      // Already correct, skip
      skipped++;
      continue;
    }
  }

  const year = 2000 + parseInt(yy);
  const seasonName = SEASON_NAMES[sess];
  const subjectName = SUBJECT_NAMES[code] || code;
  const component = parseInt(comp);
  const variant = parseInt(vari);

  const stub = {
    paperId,
    paperName: `${subjectName} ${year} ${seasonName} Paper ${comp}`,
    subject: subjectName,
    subjectCode: code,
    year,
    session: sess,
    component,
    variant,
    totalQuestions: 0,
    viewOnly: true,
    questions: [{ viewOnly: true }],
  };

  fs.writeFileSync(jsonPath, JSON.stringify(stub, null, 2));
  created++;
}

console.log(`Done. Created: ${created} | Skipped (real/exist): ${skipped} | Updated: ${updated}`);
console.log(`Total JSONs in public/papers: ${fs.readdirSync(JSON_DIR).filter(f=>f.endsWith('.json')).length}`);
