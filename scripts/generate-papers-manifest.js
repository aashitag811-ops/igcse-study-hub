// Run this whenever you add new papers to public/papers/
// node scripts/generate-papers-manifest.js

const fs = require('fs');
const path = require('path');

const papersDir = path.join(__dirname, '../public/papers');
const imagesDir = path.join(__dirname, '../public/images');

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

  // Pattern 1: 0610_m20_qp_22  (canonical format with images)
  let m = base.match(/^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)$/);
  if (m) {
    // Only include if the JSON actually has imageUrl on first question
    // OR if there's no image system for this subject (accounting, economics text papers)
    const d = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
    const qs = d.questions || [];
    const hasImage = qs.length > 0 && qs[0].imageUrl;
    const hasOptions = qs.length > 0 && qs[0].options && qs[0].options.length > 0;
    // Include if: has images (image-based MCQ) OR has text options (text-based MCQ like accounting)
    if (hasImage || hasOptions) {
      papers.push({ id: base, subjectCode: m[1], year: 2000 + parseInt(m[3]), session: m[2], component: parseInt(m[4]), variant: parseInt(m[5]) });
    }
    continue;
  }

  // Pattern 2: 0455_m15_12  (no _qp_) — only include if no _qp_ version exists
  m = base.match(/^(\d{4})_([msw])(\d{2})_(\d)(\d)$/);
  if (m) {
    const qpEquivalent = `${m[1]}_${m[2]}${m[3]}_qp_${m[4]}${m[5]}`;
    if (qpIds.has(qpEquivalent)) continue; // skip — the _qp_ version is already included
    const d = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
    const qs = d.questions || [];
    const hasImage = qs.length > 0 && qs[0].imageUrl;
    const hasOptions = qs.length > 0 && qs[0].options && qs[0].options.length > 0;
    if (hasImage || hasOptions) {
      papers.push({ id: base, subjectCode: m[1], year: 2000 + parseInt(m[3]), session: m[2], component: parseInt(m[4]), variant: parseInt(m[5]) });
    }
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
}

const papers: PaperEntry[] = ${JSON.stringify(papers, null, 2)};

export default papers;
`;

fs.writeFileSync(path.join(__dirname, '../src/lib/data/papers-manifest.ts'), out);
console.log(`Generated ${papers.length} papers → src/lib/data/papers-manifest.ts`);

// Breakdown
const bySubject = {};
for (const p of papers) bySubject[p.subjectCode] = (bySubject[p.subjectCode] || 0) + 1;
console.log(JSON.stringify(bySubject, null, 2));
