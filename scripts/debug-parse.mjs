// debug-parse.mjs - trace parse decisions for a specific paper
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDFS_DIR = join(__dirname, 'pastpapers');

const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url
).href;

async function extractText(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf  = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc   = await page.getTextContent();
    const rows = {};
    for (const item of tc.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x: item.transform[4], w: item.width ?? 0, str: item.str });
    }
    const ys = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const y of ys) {
      const sorted = rows[y].sort((a, b) => a.x - b.x);
      let line = '';
      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        if (i === 0) line += item.str;
        else {
          const prev = sorted[i - 1];
          const gap  = item.x - (prev.x + prev.w);
          line += gap < 1.5 ? item.str : ' ' + item.str;
        }
      }
      line = line.replace(/  +/g, ' ').trim();
      if (line) text += line + '\n';
    }
    text += '<<<PAGE_BREAK>>>\n';
  }
  await pdf.destroy();
  return text;
}

const NOISE_RE = [
  /^\* [\d ]+ \*( DFD)?$/,
  /^[\x80-\uFFFF]{3,}$/,
  /^\d{4}\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}$/,
  /^©\s*(UCLES\s*)?\d{4}$/i,
  /^\d{4}\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}\s*©.*$/i,
  /^DO NOT WRITE IN THIS MARGIN$/i,
  /^\d{1,3}$/,
  /^\[?Turn over\]?$/i,
  /^BLANK PAGE$/i,
  /^DFD$/,
  /^©\s*(UCLES|Cambridge)\s+\d{4}/i,
  /^©\s*Cambridge University Press/i,
  /^Cambridge Assessment International Education/i,
  /^This document has \d+ pages?/i,
  /^NOT TO$/i,
  /^SCALE$/i,
  /^NOT TO SCALE$/i,
  /^Trace ID:\s*PC-/i,
  /^Re-uploading,?\s*mirroring/i,
  /^Licensed for hosting on papacambridge/i,
  /^\d{4}\/\d{2} Question Paper .* \| Source:/i,
  /^PapaCambridge\s*[·•]\s*papacambridge/i,
  /^Downloaded from PapaCambridge/i,
  /^Cambridge IGCSE$/i,
  /^Calculators must not be used in this paper\.?$/i,
];

function isNoise(line, keepBareQNumbers = false) {
  const t = line.trim();
  if (!t) return true;
  if (keepBareQNumbers && /^\d{1,2}$/.test(t) && parseInt(t) >= 1 && parseInt(t) <= 30) return false;
  if (t.length < 2) return true;
  if (/^[,\s\u0000-\u001F\u007F-\u009F]+$/.test(t)) return true;
  const controlCount = (t.match(/[\u0000-\u001F\u007F-\u009F]/g) ?? []).length;
  if (controlCount > 2) return true;
  return NOISE_RE.some(r => r.test(t));
}

const paperId = process.argv[2] ?? '0580_m26_qp_22';
const pdfPath = join(PDFS_DIR, `${paperId}.pdf`);
const raw = await extractText(pdfPath);

const afterPageBreak = new Set();
const pageHeaderIndices = new Set();
const lines = [];

let firstAfterBreak = true;
for (const rawLine of raw.split('\n')) {
  const t = rawLine.trimEnd();
  if (t === '<<<PAGE_BREAK>>>') { firstAfterBreak = true; continue; }
  const norm = t; // skip normaliseSymbols for debug
  if (isNoise(norm, true)) continue;
  if (firstAfterBreak) {
    afterPageBreak.add(lines.length);
    if (/^\d{1,2}$/.test(norm) && parseInt(norm) >= 1 && parseInt(norm) <= 30) {
      pageHeaderIndices.add(lines.length);
    }
    firstAfterBreak = false;
  }
  lines.push(norm);
}

const TOP_LEVEL_Q_RE = /^(\d+)(?:\s{1,5}(.+)|$)/;

console.log('\n=== LINES AROUND EXPECTED Q8-Q12 ===');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = TOP_LEVEL_Q_RE.exec(line);
  const num = m ? parseInt(m[1]) : null;
  if (num && num >= 7 && num <= 15) {
    const flags = [];
    if (afterPageBreak.has(i)) flags.push('ABK');
    if (pageHeaderIndices.has(i)) flags.push('PHI');
    console.log(`  [${i}] ${JSON.stringify(line)} num=${num} ${flags.join(',')}`);
  } else if (num && num >= 1 && num <= 30 && afterPageBreak.has(i)) {
    console.log(`  [${i}] ${JSON.stringify(line)} num=${num} ABK${pageHeaderIndices.has(i)?',PHI':''}`);
  }
}

console.log('\n=== BARE DIGIT LINES ===');
for (let i = 0; i < lines.length; i++) {
  if (/^\d{1,2}$/.test(lines[i]) && parseInt(lines[i]) >= 1 && parseInt(lines[i]) <= 30) {
    const flags = [];
    if (afterPageBreak.has(i)) flags.push('ABK');
    if (pageHeaderIndices.has(i)) flags.push('PHI');
    // Look back
    let prevBare = null;
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      if (pageHeaderIndices.has(j)) { prevBare = `PHI@${j}`; break; }
      if (/^\d{1,2}$/.test(lines[j]) && parseInt(lines[j]) >= 1 && parseInt(lines[j]) <= 100) {
        prevBare = `bare:${lines[j]}@${j}`; break;
      }
      if (lines[j].trim()) break;
    }
    console.log(`  [${i}] bare=${lines[i]} ${flags.join(',')} prevLook=${prevBare ?? 'none'}`);
  }
}
