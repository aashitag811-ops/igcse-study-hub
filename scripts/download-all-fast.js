/**
 * Fast concurrent downloader for all IGCSE past papers from PapaCambridge.
 * Skips files already downloaded. Uses concurrency to be fast.
 * node scripts/download-all-fast.js [subject] [--resume]
 * e.g.: node scripts/download-all-fast.js 0610
 *       node scripts/download-all-fast.js all
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/';
const OUT_DIR = path.join(__dirname, 'pastpapers');
const MIN_SIZE = 30 * 1024; // 30KB
const CONCURRENCY = 8;
const TIMEOUT_MS = 30000;

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Subject definitions ──────────────────────────────────────────────────────
// For each subject: which paper components + variants exist
// Format: "CV" = component C, variant V (e.g. "12" = paper 1, variant 2)
const SUBJECTS = {
  // ── Sciences ─────────────────────────────────────────────────────────────────
  '0610': { name: 'Biology',                    sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  '0620': { name: 'Chemistry',                  sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  '0625': { name: 'Physics',                    sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  // ── Mathematics ──────────────────────────────────────────────────────────────
  '0580': { name: 'Mathematics',                sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '0606': { name: 'Additional Mathematics',     sessions: ['m','s','w'], papers: ['11','12','13','21','22','23'] },
  // ── Computer Science ─────────────────────────────────────────────────────────
  '0478': { name: 'Computer Science',           sessions: ['m','s','w'], papers: ['11','12','13','21','22','23'] },
  // ── Commerce ─────────────────────────────────────────────────────────────────
  '0455': { name: 'Economics',                  sessions: ['m','s','w'], papers: ['11','12','13','21','22','23'] },
  '0452': { name: 'Accounting',                 sessions: ['m','s','w'], papers: ['11','12','13','21','22','23'] },
  '0450': { name: 'Business Studies',           sessions: ['m','s','w'], papers: ['11','12','13','21','22','23'] },
  '0417': { name: 'ICT',                        sessions: ['s','w'],     papers: ['11','12','13','21','22','31','32'] },
  '0448': { name: 'Travel and Tourism',         sessions: ['m','s','w'], papers: ['11','12','13','21','22','23'] },
  // ── Languages ────────────────────────────────────────────────────────────────
  '0500': { name: 'First Language English',     sessions: ['m','s','w'], papers: ['11','12','13','21','22','23'] },
  '0510': { name: 'English as Second Language', sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','31','32','33'] },
  '0520': { name: 'French',                     sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','41','42','43'] },
  '0549': { name: 'Hindi',                      sessions: ['s','w'],     papers: ['11','12','21','22'] },
  // ── Humanities ───────────────────────────────────────────────────────────────
  '0457': { name: 'Global Perspectives',        sessions: ['s','w'],     papers: ['11','12','13'] },
  '0470': { name: 'History',                    sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','41','42','43'] },
  '0460': { name: 'Geography',                  sessions: ['m','s','w'], papers: ['11','12','13','21','22','23','41','42','43'] },
  '0490': { name: 'Religious Studies',          sessions: ['s','w'],     papers: ['11','12','13','21','22','23'] },
};

const YEARS = Array.from({length: 17}, (_, i) => String(10 + i).padStart(2,'0')); // 10-26

// ── Build full file list ─────────────────────────────────────────────────────
function buildList(subjectCode) {
  const s = SUBJECTS[subjectCode];
  if (!s) { console.error('Unknown subject:', subjectCode); process.exit(1); }
  const list = [];
  for (const yr of YEARS) {
    for (const sess of s.sessions) {
      const pfx = `${subjectCode}_${sess}${yr}`;
      // QP + MS per variant
      for (const v of s.papers) {
        list.push(`${pfx}_qp_${v}`);
        list.push(`${pfx}_ms_${v}`);
      }
      // ER + GT shared per session (not per variant)
      list.push(`${pfx}_er`);
      list.push(`${pfx}_gt`);
    }
  }
  return list;
}

// ── Download a single file ────────────────────────────────────────────────────
function download(code) {
  return new Promise((resolve) => {
    const outPath = path.join(OUT_DIR, code + '.pdf');
    // Skip if already exists and valid
    if (fs.existsSync(outPath)) {
      const size = fs.statSync(outPath).size;
      if (size > MIN_SIZE) { resolve({ code, result: 'skip' }); return; }
      fs.unlinkSync(outPath);
    }

    const url = BASE + code + '.pdf';
    const tmpPath = outPath + '.tmp';
    const file = fs.createWriteStream(tmpPath);

    const request = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        file.destroy();
        fs.unlink(tmpPath, () => {});
        resolve({ code, result: 'notfound' });
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const size = fs.existsSync(tmpPath) ? fs.statSync(tmpPath).size : 0;
          if (size > MIN_SIZE) {
            // verify PDF header
            const fd = fs.openSync(tmpPath, 'r');
            const buf = Buffer.alloc(4);
            fs.readSync(fd, buf, 0, 4, 0);
            fs.closeSync(fd);
            if (buf[0] === 0x25 && buf[1] === 0x50) {
              fs.renameSync(tmpPath, outPath);
              resolve({ code, result: 'ok', size });
            } else {
              fs.unlink(tmpPath, () => {});
              resolve({ code, result: 'notpdf' });
            }
          } else {
            fs.unlink(tmpPath, () => {});
            resolve({ code, result: 'toosmall' });
          }
        });
      });
      file.on('error', () => {
        fs.unlink(tmpPath, () => {});
        resolve({ code, result: 'fileerr' });
      });
    });

    request.on('timeout', () => { request.destroy(); fs.unlink(tmpPath, () => {}); resolve({ code, result: 'timeout' }); });
    request.on('error', () => { fs.unlink(tmpPath, () => {}); resolve({ code, result: 'err' }); });
  });
}

// ── Concurrent runner ─────────────────────────────────────────────────────────
async function runAll(codes) {
  let idx = 0, done = 0, ok = 0, skipped = 0, failed = 0;
  const total = codes.length;

  async function worker() {
    while (idx < total) {
      const code = codes[idx++];
      const r = await download(code);
      done++;
      if (r.result === 'ok') { ok++; }
      else if (r.result === 'skip') { skipped++; }
      else if (r.result === 'notfound' || r.result === 'notpdf' || r.result === 'toosmall') { /* expected misses */ }
      else { failed++; }

      if (done % 50 === 0 || done === total) {
        process.stdout.write(`\r[${done}/${total}] New: ${ok}  Skip: ${skipped}  Miss: ${total-done-ok-skipped-failed}  Err: ${failed}   `);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);
  console.log(`\n\nDone. Downloaded: ${ok} | Skipped: ${skipped} | Failed: ${failed}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const arg = process.argv[2] || 'all';
let codes = [];

if (arg === 'all') {
  for (const code of Object.keys(SUBJECTS)) {
    codes.push(...buildList(code));
  }
} else {
  codes = buildList(arg);
}

console.log(`Downloading ${codes.length} files for ${arg} (concurrency=${CONCURRENCY})...`);
runAll(codes);
