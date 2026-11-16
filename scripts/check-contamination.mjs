import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
const DIR = 'public/theory-questions';
const patterns = new Set();
const files = readdirSync(DIR).filter(f => f.endsWith('.json')).slice(0, 300);
for (const f of files) {
  const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const allText = JSON.stringify(raw);
  const matches = allText.match(/(reasonable effort[^"]{0,120}|UCLES \d{4}[^"]{0,80}|has been made to trace[^"]{0,100}|re-hosting this file[^"]{0,80}|papacambridge[^"]{0,80})/gi);
  if (matches) matches.forEach(m => {
    const clean = m.replace(/\\n/g, ' ').trim().slice(0, 120);
    patterns.add(clean);
  });
}
console.log('Unique footer fragment patterns found:');
[...patterns].slice(0, 25).forEach(p => console.log(JSON.stringify(p)));
