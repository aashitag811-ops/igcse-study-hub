// Test the TRAILING_SUBJECT_RE fix
const TRAILING_SUBJECT_RE = /\s+[A-Z]{3,}(?:\s+[A-Z]{3,}|\s+(?:AND|OF|TO|FOR|THE|IN))*\s*$/;

const tests = [
  ['INFORMATION AND', '(b) were better answered than part (c). However, there were a few brand names given. INFORMATION AND'],
  ['INFORMATION AND COMMUNICATION TECHNOLOGY', 'candidates found it hard. INFORMATION AND COMMUNICATION TECHNOLOGY'],
  ['BUSINESS STUDIES', 'good answers were given. BUSINESS STUDIES'],
  ['BIOLOGY', 'well answered by most. BIOLOGY'],
  ['normal sentence', 'candidates gained full marks.'],
  ['word ending', 'The answer was correct and valid'],
  ['ends with number', 'scored 42 marks overall'],
  ['ends in mixed case', 'Some candidates did not attempt this question'],
];

let pass = 0, fail = 0;
for (const [label, text] of tests) {
  const shouldMatch = !label.startsWith('normal') && !label.startsWith('word') && !label.startsWith('ends in') && !label.startsWith('ends with number');
  const matched = TRAILING_SUBJECT_RE.test(text);
  const ok = matched === shouldMatch;
  console.log(ok ? '✅' : '❌', label, '->', matched ? 'MATCH' : 'no match', ok ? '' : `(expected ${shouldMatch})`);
  if (ok) pass++; else fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);

// Also test the strip itself
const example = '(b) were better answered. INFORMATION AND';
const stripped = example.replace(TRAILING_SUBJECT_RE, '').trim();
console.log('\nStrip test:', JSON.stringify(stripped));
