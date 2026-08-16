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
// Show first 300 chars of text
console.log('FULL TEXT START:\n', text.slice(0, 300));
// Find all Paper headers — allow spaces around slash
const re = /Paper\s*[\d]{4}\s*[/]\s*[\d]{2}/gi;
let m;
while ((m = re.exec(text)) !== null) {
  console.log('PAPER HEADER at', m.index, ':', JSON.stringify(m[0]));
}
console.log('TOTAL TEXT LENGTH:', text.length);
