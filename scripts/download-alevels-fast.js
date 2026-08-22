/**
 * A-Level Past Papers Concurrent Downloader
 * Downloads QP, MS, ER, GT for all A-level subjects from PapaCambridge (2015–2025)
 *
 * Usage:
 *   node scripts/download-alevels-fast.js           — all subjects
 *   node scripts/download-alevels-fast.js 9700       — Biology only
 *   node scripts/download-alevels-fast.js 9700 9701  — multiple subjects
 *
 * Output: scripts/pastpapers-alevels/<code>.pdf  (flat folder, same convention as IGCSE)
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE        = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/';
const OUT_DIR     = path.join(__dirname, 'pastpapers-alevels');
const MIN_SIZE    = 30 * 1024;   // 30 KB — anything smaller is an error page
const CONCURRENCY = 8;
const TIMEOUT_MS  = 30_000;

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── A-Level subject definitions ───────────────────────────────────────────────
// sessions: s = May/June, m = Feb/March, w = Oct/Nov
// papers:   each entry = component+variant string (e.g. "12" = Paper 1 Variant 2)
//
// Paper structure per subject:
//  Sciences (9700/9701/9702):
//    Paper 1 = MCQ (40q), Paper 2 = AS Structured, Paper 3 = Advanced Practical
//    Paper 4 = A2 Structured, Paper 5 = Planning/Analysis/Evaluation
//  Mathematics (9709):
//    Paper 1 = Pure 1 (AS), Paper 2 = Pure 2 (AS), Paper 3 = Pure 3 (A2)
//    Paper 4 = Mechanics (AS), Paper 5 = Probability & Stats 1 (AS)
//    Paper 6 = Probability & Stats 2 (A2), Paper 7 = Further Mechanics (A2)
//    (pre-2020 also had Papers 5,6 split differently)
//  Further Maths (9231):
//    Paper 1 = Further Pure 1, Paper 2 = Further Pure 2
//    Paper 3 = Further Statistics, Paper 4 = Further Mechanics
//  Computer Science (9608/9618):
//    Paper 1 = Theory 1, Paper 2 = Theory 2, Paper 3 = Pre-release
//    Paper 4 = Practical (not a PDF on PapaCambridge)
//  Business (9609): Papers 1, 2, 3
//  Economics (9708): Papers 1 (MCQ 30q), 2, 3, 4
//  Accounting (9706): Papers 1 (MCQ), 2, 3
//  English Language (9093): Papers 1, 2, 3, 4
//  English General (8021): Papers 1, 2
// ─────────────────────────────────────────────────────────────────────────────

// Paper variant strings: "CV" = component C, variant V
// Sciences: P1(MCQ) P2(AS struct) P3(practical — NO PDF) P4(A2 struct) P5(planning)
//   → skip P3 entirely; only download P1,P2,P4,P5
// Economics: P1(MCQ AS) P2(AS essay) P3(MCQ A2) P4(A2 essay)
// Accounting: P1(MCQ) P2(AS struct) P3(A2 struct)
// CS 9608: P1,P2,P3 structured (P4 = practical, no PDF)
// CS 9618: P1,P2,P3 structured (P4 = practical, no PDF)
// Maths 9709: P1-P7 structured (from 2020 syllabus); pre-2020 also had P4-P7
// Further Maths 9231: P1-P4 structured
// Business 9609: P1,P2,P3 structured
// Languages: structured only

const SUBJECTS = {
  // ── Sciences ──────────────────────────────────────────────────────────────
  // Paper 3 = Advanced Practical Skills exam (2h, handwritten in lab) — NO PDF on PapaCambridge
  // Paper 5 = Planning, Analysis & Evaluation — IS a real PDF
  '9700': { name: 'Biology',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','41','42','43','51','52','53'] },
  '9701': { name: 'Chemistry',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','41','42','43','51','52','53'] },
  '9702': { name: 'Physics',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','41','42','43','51','52','53'] },

  // ── Mathematics ───────────────────────────────────────────────────────────
  // 9709 post-2020: Papers 1(Pure1) 2(Pure2) 3(Pure3) 4(Mech) 5(Stats1) 6(Stats2) 7(FurtherMech)
  // All variants 1,2,3 for each
  '9709': { name: 'Mathematics',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63','71','72','73'] },
  '9231': { name: 'Further Mathematics',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] },

  // ── Computer Science ──────────────────────────────────────────────────────
  // Paper 4 = Practical (computer-based) — NO PDF on PapaCambridge
  '9608': { name: 'Computer Science (9608)',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33'] },
  '9618': { name: 'Computer Science (9618)',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33'] },

  // ── Social Sciences ───────────────────────────────────────────────────────
  '9609': { name: 'Business',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33'] },
  // Economics: P1 = MCQ AS (30q), P2 = essay AS, P3 = MCQ A2 (30q), P4 = essay A2
  '9708': { name: 'Economics',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] },
  // Accounting: P1 = MCQ (30q), P2 = AS structured, P3 = A2 structured
  '9706': { name: 'Accounting',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33'] },

  // ── Languages ─────────────────────────────────────────────────────────────
  '9093': { name: 'English Language',
    sessions: ['m','s','w'],
    papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '8021': { name: 'English General Paper',
    sessions: ['s','w'],        // Feb/March series does not exist for GP
    papers: ['11','12','13','21','22','23'] },
};

// 2010–2025 → two-digit year suffixes "10" … "25"
const YEARS = Array.from({ length: 16 }, (_, i) => String(10 + i).padStart(2, '0'));

// ── Build full download list for one subject ──────────────────────────────────
function buildList(code) {
  const s = SUBJECTS[code];
  if (!s) { console.error('Unknown subject:', code); process.exit(1); }
  const list = [];
  for (const yr of YEARS) {
    for (const sess of s.sessions) {
      const pfx = `${code}_${sess}${yr}`;
      for (const v of s.papers) {
        list.push(`${pfx}_qp_${v}`);   // question paper
        list.push(`${pfx}_ms_${v}`);   // mark scheme
      }
      list.push(`${pfx}_er`);           // examiner report (one per session)
      list.push(`${pfx}_gt`);           // grade thresholds
    }
  }
  return list;
}

// ── Download one file (returns a promise) ─────────────────────────────────────
function download(code) {
  return new Promise((resolve) => {
    const outPath = path.join(OUT_DIR, code + '.pdf');

    // Skip if already present and large enough
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > MIN_SIZE) {
      resolve({ code, result: 'skip' });
      return;
    }
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath); // stale tiny file

    const url     = BASE + code + '.pdf';
    const tmpPath = outPath + '.tmp';
    const file    = fs.createWriteStream(tmpPath);

    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
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
            // Verify PDF magic bytes %PDF
            const fd  = fs.openSync(tmpPath, 'r');
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
      file.on('error', () => { fs.unlink(tmpPath, () => {}); resolve({ code, result: 'fileerr' }); });
    });

    req.on('timeout', () => { req.destroy(); fs.unlink(tmpPath, () => {}); resolve({ code, result: 'timeout' }); });
    req.on('error',   () => {               fs.unlink(tmpPath, () => {}); resolve({ code, result: 'err' }); });
  });
}

// ── Concurrent runner ─────────────────────────────────────────────────────────
async function runAll(codes) {
  let idx = 0, done = 0, ok = 0, skipped = 0, failed = 0;
  const total = codes.length;

  async function worker() {
    while (idx < total) {
      const code = codes[idx++];
      const r    = await download(code);
      done++;
      if      (r.result === 'ok')       ok++;
      else if (r.result === 'skip')     skipped++;
      else if (!['notfound','notpdf','toosmall'].includes(r.result)) failed++;

      if (done % 100 === 0 || done === total) {
        process.stdout.write(
          `\r[${done}/${total}]  New: ${ok}  Skip: ${skipped}  Err: ${failed}   `
        );
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);
  console.log(`\n\nFinished.  Downloaded: ${ok}  |  Skipped: ${skipped}  |  Errors: ${failed}`);
  console.log(`Output folder: ${OUT_DIR}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let codes  = [];

if (args.length === 0 || args[0] === 'all') {
  for (const code of Object.keys(SUBJECTS)) codes.push(...buildList(code));
} else {
  for (const code of args) codes.push(...buildList(code));
}

const subjectNames = (args.length === 0 || args[0] === 'all')
  ? 'ALL A-Level subjects'
  : args.map(c => SUBJECTS[c]?.name ?? c).join(', ');

console.log(`A-Level Past Papers Downloader`);
console.log(`Subjects  : ${subjectNames}`);
console.log(`Years     : 2010 – 2025`);
console.log(`Files     : ${codes.length} (QP + MS + ER + GT)`);
console.log(`Output    : ${OUT_DIR}`);
console.log(`\nStarting download (concurrency = ${CONCURRENCY})...\n`);

runAll(codes);
