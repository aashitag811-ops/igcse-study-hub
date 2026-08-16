import { readFileSync } from 'fs';
const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

const file = process.argv[2];
const data = new Uint8Array(readFileSync(file));
const pdf = await pdfjsLib.getDocument({data, disableWorker:true}).promise;
let text = '';
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const tc = await page.getTextContent();
  const rows = {};
  for (const item of tc.items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!rows[y]) rows[y] = [];
    rows[y].push({ x: item.transform[4], str: item.str });
  }
  const ys = Object.keys(rows).map(Number).sort((a, b) => b - a);
  for (const y of ys) {
    const line = rows[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/  +/g, ' ').trim();
    if (line) text += line + '\n';
  }
}
// Find all Paper headers
const re = /Paper\s*[\d/]+/gi;
let m;
while ((m = re.exec(text)) !== null) {
  console.log('PAPER HEADER at', m.index, ':', JSON.stringify(m[0]));
}
// Also show first 500 chars of each component section
const comps = ['11','12','13','21','22','23'];
for (const c of comps) {
  const pat = new RegExp(`Paper\\s*0450\\s*[/]\\s*${c}\\b|Paper\\s*0*${c}\\b`, 'i');
  const mm = pat.exec(text);
  if (mm) console.log(`\nCOMP ${c} found at ${mm.index}:`, JSON.stringify(text.slice(mm.index, mm.index+200)));
  else console.log(`COMP ${c}: NOT FOUND`);
}
