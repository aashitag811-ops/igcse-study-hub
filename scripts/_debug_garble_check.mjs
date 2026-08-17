import fs from 'fs';
const raw = JSON.parse(fs.readFileSync('public/er-cache/0450_s25_er_11.json','utf-8'));
const text = raw.notes['1a'];
const GARBLE_RE = /\b[A-Z] [a-z]+\b|\b[a-z]{1,3} [a-z]{1,3} [a-z]/;
const match = GARBLE_RE.exec(text);
console.log('Match found:', match && match[0]);
console.log('Context:', match ? text.slice(Math.max(0, match.index - 30), match.index + 60) : 'no match');
console.log('\nFull text preview:', text.slice(0, 300));
