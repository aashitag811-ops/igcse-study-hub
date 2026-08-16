// Debug: trace exactly what parseMCQSection does for 0455_m25_er.pdf
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

async function extractText(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
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
  return text;
}

const fullText = await extractText('scripts/pastpapers/0455_m25_er.pdf');

// Find component 12 section
const startM = /Paper\s*0455\s*\/\s*12\b/i.exec(fullText);
const rest = fullText.slice(startM.index + 50);
const endM = /Paper\s*\d{4}\s*\/\s*\d{2}\b/i.exec(rest);
const section = fullText.slice(startM.index, endM ? startM.index + 50 + endM.index : fullText.length);

console.log('SECTION LENGTH:', section.length);
console.log('SECTION:\n', section);
