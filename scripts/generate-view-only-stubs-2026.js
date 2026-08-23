/**
 * generate-view-only-stubs-2026.js
 * ─────────────────────────────────
 * Creates minimal view-only JSON stubs in public/papers/ for every 2026 paper
 * that exists in scripts/pastpapers-2026/ (downloaded by download-2026.js).
 *
 * These stubs let the manifest generators include 2026 papers, which then
 * appear in the practice selector and view-papers pages.
 *
 * Run AFTER download-2026.js and BEFORE generate-papers-manifest.js /
 * generate-alevels-manifest.js.
 *
 * Usage: node scripts/generate-view-only-stubs-2026.js
 */

const fs   = require('fs');
const path = require('path');

const STUBS_SRC  = path.join(__dirname, 'pastpapers-2026');
const PAPERS_DIR = path.join(__dirname, '../public/papers');

fs.mkdirSync(PAPERS_DIR, { recursive: true });

if (!fs.existsSync(STUBS_SRC)) {
  console.error(`Directory not found: ${STUBS_SRC}`);
  console.error('Run: node scripts/download-2026.js first');
  process.exit(1);
}

// Minimal view-only stub — same format as existing stubs
function makeStub(paperId) {
  return {
    viewOnly: true,
    questions: [{ viewOnly: true, question: '' }],
  };
}

const pdfs = fs.readdirSync(STUBS_SRC).filter(f => f.endsWith('.pdf'));

// Only QPs get stubs — mark schemes, ERs, grade thresholds don't need them
const qpFiles = pdfs.filter(f => f.includes('_qp_'));

let created = 0, skipped = 0;

for (const pdf of qpFiles) {
  const base    = pdf.replace('.pdf', '');
  const outPath = path.join(PAPERS_DIR, base + '.json');

  if (fs.existsSync(outPath)) {
    skipped++;
    continue;
  }

  fs.writeFileSync(outPath, JSON.stringify(makeStub(base), null, 2));
  created++;
}

console.log(`✅ Created : ${created} stubs`);
console.log(`⏭  Skipped : ${skipped} (already exist)`);
console.log(`\nNext steps:`);
console.log('  node scripts/generate-papers-manifest.js');
console.log('  node scripts/generate-alevels-manifest.js');
