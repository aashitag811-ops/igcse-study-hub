const fs = require('fs');

// Check alevels manifest for 2026 papers with testModeAvailable: true
const content = fs.readFileSync('./src/lib/data/alevels-papers-manifest.ts', 'utf8');
const lines = content.split('\n');

let inBlock = false;
let current = {};
let results = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line === '{') { current = {}; inBlock = true; continue; }
  if (inBlock) {
    const idMatch = line.match(/"id":\s*"([^"]+)"/);
    if (idMatch) current.id = idMatch[1];
    const tmMatch = line.match(/"testModeAvailable":\s*(true|false)/);
    if (tmMatch) current.testMode = tmMatch[1] === 'true';
    if (line === '},' || line === '}') {
      if (current.id && current.id.includes('26')) {
        results.push({ id: current.id, testMode: current.testMode });
      }
      inBlock = false;
    }
  }
}

const enabled = results.filter(r => r.testMode);
const disabled = results.filter(r => !r.testMode);
console.log('2026 A-level papers with testModeAvailable: true (' + enabled.length + '):');
enabled.forEach(r => console.log('  ' + r.id));
console.log('\nTotal 2026 A-level papers:', results.length);
console.log('MCQ-enabled:', enabled.length);
