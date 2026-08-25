const fs = require('fs');

// Check IGCSE manifest for 2026 MCQ papers
const content = fs.readFileSync('./src/lib/data/papers-manifest.ts', 'utf8');
const lines = content.split('\n');

let inBlock = false;
let current = {};
let igcse2026MCQ = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line === '{') { current = {}; inBlock = true; continue; }
  if (inBlock) {
    const idMatch = line.match(/"id":\s*"([^"]+)"/);
    if (idMatch) current.id = idMatch[1];
    const tmMatch = line.match(/"testModeAvailable":\s*(true|false)/);
    if (tmMatch) current.testMode = tmMatch[1] === 'true';
    if (line === '},' || line === '}') {
      if (current.id && /^(0452|0455|0610|0620|0625)/.test(current.id) && current.id.includes('26') && current.testMode) {
        igcse2026MCQ.push(current.id);
      }
      inBlock = false;
    }
  }
}

console.log('IGCSE 2026 MCQ enabled papers:', igcse2026MCQ.length);
igcse2026MCQ.forEach(function(id) { console.log('  ' + id); });
