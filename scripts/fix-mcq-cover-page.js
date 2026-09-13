/**
 * fix-mcq-cover-page.js
 * Removes spurious "question 1" entries that are actually the paper cover page.
 * A cover-page entry has no valid A/B/C/D options and contains cover-page keywords.
 * After removal, question numbers are NOT renumbered — the correct answer keys
 * in the remaining questions already reference the right question numbers.
 *
 * Run: node scripts/fix-mcq-cover-page.js
 */

const fs   = require('fs');
const path = require('path');

const PAPERS_DIR = path.join(__dirname, '../public/papers');

const COVER_SIGNALS = [
  'INSTRUCTIONS',
  'multiple choice answer sheet',
  'You must answer on',
  'There are forty questions',
  'There are 40 questions',
];

function isCoverPage(q) {
  if (!q) return false;
  const text = q.questionText || '';
  // Must have no real options (empty object or missing)
  const opts = q.options || {};
  const hasRealOptions =
    opts.A !== undefined || opts.B !== undefined ||
    opts.C !== undefined || opts.D !== undefined;
  if (hasRealOptions) return false;
  // Must contain at least one cover-page signal
  return COVER_SIGNALS.some(sig => text.includes(sig));
}

let fixed = 0, skipped = 0, errors = 0;

for (const file of fs.readdirSync(PAPERS_DIR)) {
  if (!file.endsWith('.json')) continue;
  const filePath = path.join(PAPERS_DIR, file);
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!json.isMcqParsed || !Array.isArray(json.questions) || json.questions.length === 0) {
      skipped++;
      continue;
    }

    const q1 = json.questions[0];
    if (!isCoverPage(q1)) {
      skipped++;
      continue;
    }

    // Remove the cover-page entry
    json.questions = json.questions.slice(1);
    // Update totalQuestions to match actual parsed count
    json.totalQuestions = json.questions.length;

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    fixed++;
  } catch (e) {
    console.error('Error processing', file, e.message);
    errors++;
  }
}

console.log(`Fixed: ${fixed} | Skipped: ${skipped} | Errors: ${errors}`);
