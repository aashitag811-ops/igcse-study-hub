/**
 * Simple test script for the Exam Marking System
 * Run with: node test-exam-api.js
 *
 * Make sure your dev server is running first: npm run dev
 */

const BASE_URL = 'http://localhost:3001';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testGetPaper() {
  log('\n📄 TEST 1: Get Question Paper', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  try {
    const response = await fetch(
      `${BASE_URL}/api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    log(`✓ Paper ID: ${data.id}`, 'green');
    log(`✓ Title: ${data.title}`, 'green');
    log(`✓ Total Questions: ${data.questions.length}`, 'green');
    log(`✓ Sample Question: ${data.questions[0].qid} - ${data.questions[0].prompt}`, 'green');
    
    return data;
  } catch (error) {
    log(`✗ Failed: ${error.message}`, 'red');
    return null;
  }
}

async function testMarkPerfectScore() {
  log('\n✅ TEST 2: Mark Perfect Score Submission', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  const answers = [
    { qid: '1', answer: ['keyboard', 'mouse'] },
    { qid: '2ai', answer: 'A computer program that organizes data in rows and columns' },
    { qid: '2aii', answer: ['computer program', 'structured data'] },
    { qid: '2aiii', answer: 'A small computer program that runs within a larger application' },
    { qid: '2b', answer: ['compiler', 'linker', 'device driver'] },
  ];
  
  try {
    const response = await fetch(`${BASE_URL}/api/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: '0417_2025_feb_march_12',
        answers,
        mode: 'practice_strict',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    log(`✓ Mode: ${result.mode}`, 'green');
    log(`✓ Score: ${result.totalAwarded}/${result.totalAvailable} (${result.percentage}%)`, 'green');
    
    result.questions.forEach((q) => {
      const status = q.awarded === q.maxMarks ? '✓' : '⚠';
      const color = q.awarded === q.maxMarks ? 'green' : 'yellow';
      log(`  ${status} Q${q.qid}: ${q.awarded}/${q.maxMarks} marks`, color);
      q.feedback.forEach((fb) => log(`    ${fb}`, color));
    });
    
    return result;
  } catch (error) {
    log(`✗ Failed: ${error.message}`, 'red');
    return null;
  }
}

async function testMarkPartialScore() {
  log('\n⚠️  TEST 3: Mark Partial Score Submission', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  const answers = [
    { qid: '1', answer: ['keyboard', 'printer'] }, // 1/2 marks
    { qid: '2ai', answer: 'software for organizing data' }, // Partial match
    { qid: '2b', answer: ['compiler', 'operating system'] }, // 2/3 marks
  ];
  
  try {
    const response = await fetch(`${BASE_URL}/api/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: '0417_2025_feb_march_12',
        answers,
        mode: 'practice_strict',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    log(`✓ Mode: ${result.mode}`, 'green');
    log(`✓ Score: ${result.totalAwarded}/${result.totalAvailable} (${result.percentage}%)`, 'yellow');
    
    result.questions.forEach((q) => {
      const status = q.awarded === q.maxMarks ? '✓' : q.awarded > 0 ? '⚠' : '✗';
      const color = q.awarded === q.maxMarks ? 'green' : q.awarded > 0 ? 'yellow' : 'red';
      log(`  ${status} Q${q.qid}: ${q.awarded}/${q.maxMarks} marks`, color);
      q.feedback.forEach((fb) => log(`    ${fb}`, color));
    });
    
    return result;
  } catch (error) {
    log(`✗ Failed: ${error.message}`, 'red');
    return null;
  }
}

async function testCompareModes() {
  log('\n🔄 TEST 4: Compare Strict vs Lenient Modes', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  const answers = [
    { qid: '1', answer: ['keypad', 'pointing device'] }, // Fuzzy matches
    { qid: '2ai', answer: 'program for data in tables' }, // Partial match
  ];
  
  try {
    // Test strict mode
    const strictResponse = await fetch(`${BASE_URL}/api/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: '0417_2025_feb_march_12',
        answers,
        mode: 'practice_strict',
      }),
    });
    
    const strictResult = await strictResponse.json();
    
    // Test lenient mode
    const lenientResponse = await fetch(`${BASE_URL}/api/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: '0417_2025_feb_march_12',
        answers,
        mode: 'cambridge_like',
      }),
    });
    
    const lenientResult = await lenientResponse.json();
    
    log(`Strict Mode:   ${strictResult.totalAwarded}/${strictResult.totalAvailable} (${strictResult.percentage}%)`, 'yellow');
    log(`Lenient Mode:  ${lenientResult.totalAwarded}/${lenientResult.totalAvailable} (${lenientResult.percentage}%)`, 'green');
    
    const difference = lenientResult.totalAwarded - strictResult.totalAwarded;
    if (difference > 0) {
      log(`✓ Lenient mode awarded ${difference} more mark(s)`, 'green');
    } else if (difference === 0) {
      log(`= Both modes gave the same score`, 'yellow');
    }
    
    return { strict: strictResult, lenient: lenientResult };
  } catch (error) {
    log(`✗ Failed: ${error.message}`, 'red');
    return null;
  }
}

async function testImageFormats() {
  log('\n🖼️  TEST 5: Image Format Question (Acronyms)', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  const testCases = [
    { answer: ['PNG', 'JPEG'], description: 'Exact acronyms' },
    { answer: ['png', 'jpg'], description: 'Lowercase acronyms' },
    { answer: ['Portable Network Graphics', 'Joint Photographic Experts Group'], description: 'Full names' },
  ];
  
  for (const testCase of testCases) {
    log(`\nTesting: ${testCase.description}`, 'blue');
    
    try {
      const response = await fetch(`${BASE_URL}/api/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: '0417_2025_feb_march_12',
          answers: [{ qid: '13b', answer: testCase.answer }],
          mode: 'practice_strict',
        }),
      });
      
      const result = await response.json();
      const q = result.questions[0];
      
      log(`  Score: ${q.awarded}/${q.maxMarks}`, q.awarded === q.maxMarks ? 'green' : 'yellow');
      q.feedback.forEach((fb) => log(`  ${fb}`, 'blue'));
    } catch (error) {
      log(`  ✗ Failed: ${error.message}`, 'red');
    }
  }
}

async function runAllTests() {
  log('\n' + '═'.repeat(60), 'blue');
  log('🧪 EXAM MARKING SYSTEM - TEST SUITE', 'blue');
  log('═'.repeat(60), 'blue');
  log('\nMake sure your dev server is running: npm run dev\n', 'yellow');
  
  await testGetPaper();
  await testMarkPerfectScore();
  await testMarkPartialScore();
  await testCompareModes();
  await testImageFormats();
  
  log('\n' + '═'.repeat(60), 'blue');
  log('✅ ALL TESTS COMPLETED', 'blue');
  log('═'.repeat(60), 'blue');
  log('\nFor more details, see TEST_EXAM_SYSTEM.md\n', 'cyan');
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});

// Made with Bob
