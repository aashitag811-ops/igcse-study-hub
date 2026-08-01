/**
 * verify-mcq-papers.js
 * Checks every paper in the manifest that has testModeAvailable=true
 * and verifies that all question images actually exist on disk.
 * Run: node scripts/verify-mcq-papers.js
 */
const fs = require('fs');
const path = require('path');

// Read manifest
const manifestPath = path.join(__dirname, '../src/lib/data/papers-manifest.ts');
const raw = fs.readFileSync(manifestPath, 'utf8');

// Extract the array via simple regex
const arrMatch = raw.match(/const papers: PaperEntry\[\] = (\[[\s\S]*?\]);\s*export/);
if (!arrMatch) { console.error('Cannot parse manifest'); process.exit(1); }
const papers = JSON.parse(arrMatch[1]);

const mcqPapers = papers.filter(p => p.testModeAvailable);
console.log(`Total MCQ papers in manifest: ${mcqPapers.length}`);

let ok = 0, broken = [];

for (const p of mcqPapers) {
  const jsonPath = path.join(__dirname, '../public/papers', `${p.id}.json`);
  if (!fs.existsSync(jsonPath)) {
    broken.push(`MISSING JSON: ${p.id}`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const qs = data.questions || [];

  if (qs.length === 0) {
    broken.push(`EMPTY QUESTIONS: ${p.id}`);
    continue;
  }

  let missingImages = [];
  for (const q of qs) {
    if (!q.imageUrl) {
      // Text-based question (Accounting) - just check correctAnswer exists
      if (!q.correctAnswer) missingImages.push(`q${q.questionNumber}:no-answer`);
      continue;
    }
    // Strip query string and leading slash
    const imgPath = q.imageUrl.split('?')[0].replace(/^\//, '');
    const fullPath = path.join(__dirname, '../public', imgPath);
    if (!fs.existsSync(fullPath)) {
      missingImages.push(`q${q.questionNumber}:${imgPath}`);
    }
  }

  if (missingImages.length > 0) {
    broken.push(`MISSING IMAGES (${missingImages.length}): ${p.id} — ${missingImages.slice(0,3).join(', ')}${missingImages.length > 3 ? '...' : ''}`);
  } else {
    ok++;
  }
}

console.log(`\n✅ Verified OK: ${ok}`);
if (broken.length > 0) {
  console.log(`\n❌ Broken papers (${broken.length}):`);
  broken.forEach(b => console.log('  ' + b));
} else {
  console.log('🎉 All MCQ papers have their images on disk!');
}
