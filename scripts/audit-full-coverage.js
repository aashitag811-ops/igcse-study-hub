/**
 * audit-full-coverage.js
 * Full audit of MCQ image coverage AND view-mode PDF coverage.
 * Run: node scripts/audit-full-coverage.js
 */
const fs   = require('fs');
const path = require('path');

const PAPERS_DIR  = path.join(__dirname, '../public/papers');
const IMAGES_DIR  = path.join(__dirname, '../public/images');
const PDFS_DIR    = path.join(__dirname, '../public/pdfs');

// Load manifest
const manifestRaw = fs.readFileSync(path.join(__dirname, '../src/lib/data/papers-manifest.ts'), 'utf8');
const arrMatch = manifestRaw.match(/const papers: PaperEntry\[\] = (\[[\s\S]*?\]);\s*export/);
const manifest = JSON.parse(arrMatch[1]);

let mcqOK = 0, mcqBroken = [];
let viewOK = 0, viewMissingQP = [], viewMissingMS = [];

for (const p of manifest) {
  const jsonPath = path.join(PAPERS_DIR, `${p.id}.json`);
  if (!fs.existsSync(jsonPath)) continue;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const qs = data.questions || [];

  // ── MCQ check ────────────────────────────────────────────────
  if (p.testModeAvailable) {
    let bad = [];
    for (const q of qs) {
      if (!q.imageUrl) {
        if (!q.correctAnswer) bad.push(`q${q.questionNumber}:no-answer`);
        continue;
      }
      const imgPath = q.imageUrl.split('?')[0].replace(/^\//, '');
      if (!fs.existsSync(path.join(__dirname, '../public', imgPath))) {
        bad.push(`q${q.questionNumber}`);
      }
    }
    if (bad.length) mcqBroken.push({ id: p.id, missing: bad });
    else mcqOK++;
  }

  // ── View Mode PDF check ───────────────────────────────────────
  const qpFile = `${p.id}.pdf`;
  const msFile = p.id.replace('_qp_', '_ms_') + '.pdf';
  const hasQP = fs.existsSync(path.join(PDFS_DIR, qpFile));
  const hasMS = fs.existsSync(path.join(PDFS_DIR, msFile));
  if (hasQP) viewOK++;
  else viewMissingQP.push(p.id);
  if (!hasMS) viewMissingMS.push(p.id);
}

// Summary
console.log('═══════════════════════════════════════════════');
console.log('  MCQ PAPERS');
console.log('═══════════════════════════════════════════════');
console.log(`✅ MCQ OK:     ${mcqOK}`);
if (mcqBroken.length) {
  console.log(`❌ MCQ broken: ${mcqBroken.length}`);
  mcqBroken.forEach(b => console.log(`   ${b.id} — missing: ${b.missing.slice(0,4).join(', ')}${b.missing.length>4?'...':''}`));
} else {
  console.log('🎉 All MCQ papers fully verified!');
}

console.log('\n═══════════════════════════════════════════════');
console.log('  VIEW MODE (PDF coverage)');
console.log('═══════════════════════════════════════════════');
console.log(`✅ QP PDFs found: ${viewOK} / ${manifest.length}`);
if (viewMissingQP.length) {
  console.log(`❌ Missing QP PDFs (${viewMissingQP.length}):`);
  viewMissingQP.slice(0, 20).forEach(id => console.log(`   ${id}`));
  if (viewMissingQP.length > 20) console.log(`   ... and ${viewMissingQP.length - 20} more`);
} else {
  console.log('🎉 All QP PDFs present!');
}
if (viewMissingMS.length) {
  console.log(`⚠️  Missing MS PDFs (${viewMissingMS.length}) — first 10:`);
  viewMissingMS.slice(0, 10).forEach(id => console.log(`   ${id}`));
}

// Per-subject MCQ breakdown
console.log('\n═══════════════════════════════════════════════');
console.log('  MCQ TEST-MODE PAPERS BY SUBJECT');
console.log('═══════════════════════════════════════════════');
const bySubject = {};
for (const p of manifest) {
  if (!p.testModeAvailable) continue;
  bySubject[p.subjectCode] = (bySubject[p.subjectCode] || 0) + 1;
}
Object.entries(bySubject).sort().forEach(([code, count]) => {
  console.log(`  ${code}: ${count} papers`);
});
