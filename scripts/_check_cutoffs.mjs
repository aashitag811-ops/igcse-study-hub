import fs from 'fs';
import path from 'path';

const dir = 'public/er-cache';
let count = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const [k, v] of Object.entries(d.notes || {})) {
    const text = v.trim();
    if (text.length < 20) continue;
    const lastChar = text[text.length - 1];
    // Flag if ends with a mid-sentence character (not a sentence-ender or semicolon)
    if (!/[.!?)\]"'\u2019\u201d;:]/.test(lastChar)) {
      count++;
      if (count <= 15) console.log(f, k, JSON.stringify(text.slice(-100)));
    }
  }
}
console.log('\nTotal potential real cut-offs:', count);
