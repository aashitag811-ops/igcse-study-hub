/**
 * Generates src/lib/data/alevels-papers-manifest.ts from public/papers/
 * Scans for all A-level subject codes and builds the manifest.
 *
 * Usage: node scripts/generate-alevels-manifest.js
 */

const fs   = require('fs');
const path = require('path');

const PAPERS_DIR = path.join(__dirname, '../public/papers');
const PDFS_DIR   = path.join(__dirname, '../public/pdfs');
const OUT_TS     = path.join(__dirname, '../src/lib/data/alevels-papers-manifest.ts');

// A-level subject codes recognised by this script
// 2010–2025 — matches download script
const YEAR_RANGE = Array.from({ length: 16 }, (_, i) => 2010 + i);

const ALEVEL_CODES = new Set([
  '9700','9701','9702',   // Sciences
  '9709','9231',          // Mathematics
  '9608','9618',          // Computer Science (both syllabi)
  '9609','9708','9706',   // Business / Economics / Accounting
  '9093','8021',          // English
]);

// MCQ-capable subject-component pairs (verified against actual paper structures):
//   Sciences P1         → image-based MCQ, 40q
//   Economics P1 & P3   → text-only MCQ, 30q each (P1=AS, P3=A2)
//   Accounting P1       → text-only MCQ, 30q
//   CS (9608/9618)      → NO MCQ papers — all structured theory
const MCQ_COMPONENTS = {
  '9700': [1],
  '9701': [1],
  '9702': [1],
  '9708': [1, 3],  // two separate MCQ papers: P1 (AS) and P3 (A2)
  '9706': [1],
  // 9608/9618 intentionally omitted — no standalone MCQ paper
};

function isMcqEligible(subjectCode, component) {
  return (MCQ_COMPONENTS[subjectCode] || []).includes(component);
}

// ── Scan papers directory ─────────────────────────────────────────────────────
const files = fs.readdirSync(PAPERS_DIR).filter(f => f.endsWith('.json'));

const qpIds = new Set(
  files
    .filter(f => f.includes('_qp_'))
    .map(f => f.replace('.json', ''))
);

const papers = [];

for (const file of files) {
  const base = file.replace('.json', '');

  // Pattern: 9700_s23_qp_11
  const m = base.match(/^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)$/);
  if (!m) continue;

  const subjectCode = m[1];
  if (!ALEVEL_CODES.has(subjectCode)) continue;   // skip IGCSE files

  const d = JSON.parse(fs.readFileSync(path.join(PAPERS_DIR, file), 'utf8'));
  const qs = d.questions || [];
  if (qs.length === 0) continue;

  const isViewOnly = d.viewOnly || (qs[0] && qs[0].viewOnly);

  // Skip view-only stubs that have no PDF on disk
  if (isViewOnly && !fs.existsSync(path.join(PDFS_DIR, base + '.pdf'))) continue;

  const year      = 2000 + parseInt(m[3]);
  const component = parseInt(m[4]);
  const variant   = parseInt(m[5]);

  // Determine testModeAvailable:
  // If the paper was MCQ-parsed it will have real question objects with imageUrl
  // or text-only options. The MCQ parser sets isMcqParsed:true on the JSON.
  let testModeAvailable = false;

  if (!isViewOnly && d.isMcqParsed) {
    testModeAvailable = isMcqEligible(subjectCode, component);
  }

  // Also accept papers where all questions have imageUrl (image-based MCQ)
  const allHaveImg = !isViewOnly && qs.every(q => q.imageUrl && !q.imageUrl.includes('/images/mcq/'));
  if (allHaveImg && isMcqEligible(subjectCode, component)) {
    testModeAvailable = true;
  }

  papers.push({
    id: base,
    subjectCode,
    year,
    session: m[2],
    component,
    variant,
    testModeAvailable,
  });
}

// Sort: subject → year desc → session
papers.sort((a, b) => {
  if (a.subjectCode !== b.subjectCode) return a.subjectCode.localeCompare(b.subjectCode);
  if (a.year !== b.year) return b.year - a.year;
  return a.session.localeCompare(b.session);
});

// ── Write TypeScript manifest ─────────────────────────────────────────────────
const out = `// AUTO-GENERATED — do not edit manually
// Regenerate: node scripts/generate-alevels-manifest.js

export interface ALevelPaperEntry {
  id: string;
  subjectCode: string;
  year: number;
  session: string;
  component: number;
  variant: number;
  testModeAvailable: boolean;
}

const aLevelPapers: ALevelPaperEntry[] = ${JSON.stringify(papers, null, 2)};

export default aLevelPapers;
`;

fs.writeFileSync(OUT_TS, out);
console.log(`Generated ${papers.length} A-level papers → src/lib/data/alevels-papers-manifest.ts`);

const bySubject = {};
const testReady = {};
for (const p of papers) {
  bySubject[p.subjectCode] = (bySubject[p.subjectCode] || 0) + 1;
  if (p.testModeAvailable) testReady[p.subjectCode] = (testReady[p.subjectCode] || 0) + 1;
}
console.log('Total by subject:', JSON.stringify(bySubject, null, 2));
console.log('Test-mode ready :', JSON.stringify(testReady, null, 2));
