// Run this whenever you add new papers to public/papers/
// node scripts/generate-papers-manifest.js

const fs = require('fs');
const path = require('path');

const papersDir = path.join(__dirname, '../public/papers');

const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json'));

// Build a set of all _qp_ paper base IDs so we can skip short-format dupes
const qpIds = new Set(
  files
    .filter(f => f.includes('_qp_'))
    .map(f => f.replace('.json', ''))
);

const papers = [];

for (const file of files) {
  const base = file.replace('.json', '');

  // Pattern 1: 0610_m20_qp_22  (canonical format)
  let m = base.match(/^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)$/);
  if (m) {
    const d = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
    const qs = d.questions || [];

    // Skip completely empty papers — nothing to show
    if (qs.length === 0) continue;

    const subjectCode = m[1];
    const year = 2000 + parseInt(m[3]);
    const component = parseInt(m[4]); // first digit of variant e.g. "12" -> component 1
    const variant = parseInt(m[5]);   // second digit

    // testModeAvailable rules:
    // - ALL questions must have a subject-folder imageUrl (not /images/mcq/ partial path)
    // - Economics Paper 2 (component 2) = theory, never test mode
    // - Accounting pre-2020 = mixed format, never test mode
    // - Sciences Paper 1/2 variant 2 only = test mode if images present
    const allHaveSubjectImg = qs.every(q => q.imageUrl && !q.imageUrl.includes('/images/mcq/'));
    const anyMcqPath = qs.some(q => q.imageUrl && q.imageUrl.includes('/images/mcq/'));

    let testModeAvailable = allHaveSubjectImg && !anyMcqPath;

    // Economics Paper 2 = structured theory essay, not MCQ
    if (subjectCode === '0455' && component === 2) testModeAvailable = false;
    // Accounting pre-2020 = combined theory+MCQ format, not pure MCQ
    if (subjectCode === '0452' && year < 2020) testModeAvailable = false;
    // Non-MCQ subjects
    if (['0417','0520','0549','0580','0606','0500','0457'].includes(subjectCode)) testModeAvailable = false;

    papers.push({
      id: base,
      subjectCode: m[1],
      year: 2000 + parseInt(m[3]),
      session: m[2],
      component: parseInt(m[4]),
      variant: parseInt(m[5]),
      testModeAvailable,
    });
    continue;
  }

  // Pattern 2: 0455_m15_12  (no _qp_) — only include if no _qp_ version exists
  m = base.match(/^(\d{4})_([msw])(\d{2})_(\d)(\d)$/);
  if (m) {
    const qpEquivalent = `${m[1]}_${m[2]}${m[3]}_qp_${m[4]}${m[5]}`;
    if (qpIds.has(qpEquivalent)) continue; // skip — _qp_ version already included

    const d = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
    const qs = d.questions || [];
    if (qs.length === 0) continue;

    const subjectCode2 = m[1];
    const year2 = 2000 + parseInt(m[3]);
    const component2 = parseInt(m[4]);

    const allHaveSubjectImg = qs.every(q => q.imageUrl && !q.imageUrl.includes('/images/mcq/'));
    const anyMcqPath = qs.some(q => q.imageUrl && q.imageUrl.includes('/images/mcq/'));
    let testModeAvailable = allHaveSubjectImg && !anyMcqPath;

    if (subjectCode2 === '0455' && component2 === 2) testModeAvailable = false;
    if (subjectCode2 === '0452' && year2 < 2020) testModeAvailable = false;
    if (['0417','0520','0549','0580','0606','0500','0457'].includes(subjectCode2)) testModeAvailable = false;

    papers.push({
      id: base,
      subjectCode: m[1],
      year: year2,
      session: m[2],
      component: component2,
      variant: parseInt(m[5]),
      testModeAvailable,
    });
  }
}

papers.sort((a, b) => {
  if (a.subjectCode !== b.subjectCode) return a.subjectCode.localeCompare(b.subjectCode);
  if (a.year !== b.year) return b.year - a.year;
  return a.session.localeCompare(b.session);
});

const out = `// AUTO-GENERATED — do not edit manually
// Regenerate: node scripts/generate-papers-manifest.js

export interface PaperEntry {
  id: string;
  subjectCode: string;
  year: number;
  session: string;
  component: number;
  variant: number;
  testModeAvailable: boolean;
}

const papers: PaperEntry[] = ${JSON.stringify(papers, null, 2)};

export default papers;
`;

fs.writeFileSync(path.join(__dirname, '../src/lib/data/papers-manifest.ts'), out);
console.log(`Generated ${papers.length} papers → src/lib/data/papers-manifest.ts`);

const bySubject = {};
const testReady = {};
for (const p of papers) {
  bySubject[p.subjectCode] = (bySubject[p.subjectCode] || 0) + 1;
  if (p.testModeAvailable) testReady[p.subjectCode] = (testReady[p.subjectCode] || 0) + 1;
}
console.log('Total by subject:', JSON.stringify(bySubject));
console.log('Test-mode ready:', JSON.stringify(testReady));
