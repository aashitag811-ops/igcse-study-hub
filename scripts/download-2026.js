/**
 * download-2026.js
 * ─────────────────
 * Downloads all available 2026 (m26 + s26) past papers from PapaCambridge
 * for every IGCSE and A-level subject into scripts/pastpapers-2026/
 *
 * After running this, upload to Archive.org with:
 *   python scripts/upload-2026-to-archive.py
 *
 * Usage:
 *   node scripts/download-2026.js           — all subjects
 *   node scripts/download-2026.js 9700      — single subject
 *   node scripts/download-2026.js igcse     — IGCSE only
 *   node scripts/download-2026.js alevels   — A-level only
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE        = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/';
const OUT_DIR     = path.join(__dirname, 'pastpapers-2026');
const MIN_SIZE    = 30 * 1024;   // 30 KB
const CONCURRENCY = 12;
const TIMEOUT_MS  = 30_000;

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Subject definitions ───────────────────────────────────────────────────────
// Based on verified availability probe — only sessions confirmed live on PapaCambridge

const IGCSE_SUBJECTS = {
  // ── Sciences (m26 + s26 both live) ───────────────────────────────────────────
  '0610': { name: 'Biology',                    sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  '0620': { name: 'Chemistry',                  sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  '0625': { name: 'Physics',                    sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'] },
  // ── Mathematics ──────────────────────────────────────────────────────────────
  '0580': { name: 'Mathematics',                sessions: ['s'],     papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] }, // m26 not yet on PapaCambridge
  '0606': { name: 'Additional Mathematics',     sessions: ['m','s'], papers: ['11','12','13','21','22','23'] },
  // ── Computer Science ─────────────────────────────────────────────────────────
  '0478': { name: 'Computer Science',           sessions: ['m','s'], papers: ['11','12','13','21','22','23'] },
  // ── Commerce ─────────────────────────────────────────────────────────────────
  '0455': { name: 'Economics',                  sessions: ['m','s'], papers: ['11','12','13','21','22','23'] },
  '0452': { name: 'Accounting',                 sessions: ['m','s'], papers: ['11','12','13','21','22','23'] },
  '0450': { name: 'Business Studies',           sessions: ['m','s'], papers: ['11','12','13','21','22','23'] },
  '0417': { name: 'ICT',                        sessions: ['m','s'], papers: ['11','12','13','21','22','31','32'] },
  '0448': { name: 'Travel and Tourism',         sessions: ['m','s'], papers: ['11','12','13','21','22','23'] },
  // ── Languages ────────────────────────────────────────────────────────────────
  '0500': { name: 'First Language English',     sessions: ['m','s'], papers: ['11','12','13','21','22','23'] },
  '0510': { name: 'English as Second Language', sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33'] },
  '0520': { name: 'French',                     sessions: ['s'],     papers: ['11','12','13','21','22','23','41','42','43'] }, // m26 not on PapaCambridge
  // ── Humanities ───────────────────────────────────────────────────────────────
  '0457': { name: 'Global Perspectives',        sessions: ['s'],     papers: ['11','12','13'] }, // s26 confirmed
  '0470': { name: 'History',                    sessions: ['m','s'], papers: ['11','12','13','21','22','23','41','42','43'] },
  '0460': { name: 'Geography',                  sessions: ['m','s'], papers: ['11','12','13','21','22','23','41','42','43'] },
  '0490': { name: 'Religious Studies',          sessions: ['s'],     papers: ['11','12','13','21','22','23'] },
};

const ALEVEL_SUBJECTS = {
  // Sciences (m26 + s26 — P3 now included)
  '9700': { name: 'Biology',        sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'] },
  '9701': { name: 'Chemistry',      sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'] },
  '9702': { name: 'Physics',        sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'] },
  // Mathematics (m26 + s26)
  '9709': { name: 'Mathematics',    sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63','71','72','73'] },
  // Further Maths (s26 only)
  '9231': { name: 'Further Maths',  sessions: ['s'],     papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] },
  // Computer Science (s26 only for 9618; 9608 discontinued)
  '9618': { name: 'CS (9618)',       sessions: ['s'],     papers: ['11','12','13','21','22','23','31','32','33'] },
  // Commerce (m26 + s26)
  '9609': { name: 'Business',        sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33'] },
  '9708': { name: 'Economics',       sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '9706': { name: 'Accounting',      sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33'] },
  // Languages (m26 only for 9093; 8021 s26 only)
  '9093': { name: 'English Lang',    sessions: ['m','s'], papers: ['11','12','13','21','22','23','31','32','33','41','42','43'] },
  '8021': { name: 'English GP',      sessions: ['s'],     papers: ['11','12','13','21','22','23'] },
};

// ── Build file list ───────────────────────────────────────────────────────────

function buildList(subjects) {
  const list = [];
  for (const [code, cfg] of Object.entries(subjects)) {
    for (const sess of cfg.sessions) {
      const pfx = `${code}_${sess}26`;
      list.push(pfx + '_er');          // examiner report (one per session)
      list.push(pfx + '_gt');          // grade thresholds
      for (const v of cfg.papers) {
        list.push(`${pfx}_qp_${v}`);  // question paper
        list.push(`${pfx}_ms_${v}`);  // mark scheme
      }
    }
  }
  return list;
}

// ── Download one file ─────────────────────────────────────────────────────────

function download(code) {
  return new Promise((resolve) => {
    const outPath = path.join(OUT_DIR, code + '.pdf');

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > MIN_SIZE) {
      resolve({ code, result: 'skip' });
      return;
    }
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    const url     = BASE + code + '.pdf';
    const tmpPath = outPath + '.tmp';
    const file    = fs.createWriteStream(tmpPath);

    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        res.resume(); file.destroy();
        fs.unlink(tmpPath, () => {});
        resolve({ code, result: 'notfound' });
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const size = fs.existsSync(tmpPath) ? fs.statSync(tmpPath).size : 0;
          if (size > MIN_SIZE) {
            const fd  = fs.openSync(tmpPath, 'r');
            const buf = Buffer.alloc(4);
            fs.readSync(fd, buf, 0, 4, 0);
            fs.closeSync(fd);
            if (buf[0] === 0x25 && buf[1] === 0x50) {   // %PDF
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
    req.on('error',   () => {               fs.unlink(tmpPath, () => {}); resolve({ code, result: 'err'     }); });
  });
}

// ── Concurrent runner ─────────────────────────────────────────────────────────

async function runAll(codes) {
  let idx = 0, done = 0, ok = 0, skipped = 0, failed = 0;
  const total = codes.length;

  async function worker() {
    while (idx < codes.length) {
      const code   = codes[idx++];
      const result = await download(code);
      done++;
      if (result.result === 'ok')   ok++;
      else if (result.result === 'skip') skipped++;
      else if (result.result === 'notfound') {}  // expected — not all variants exist
      else { failed++; }

      if (result.result === 'ok')
        process.stdout.write(`\r[${done}/${total}] ✅ ${code} (${Math.round(result.size/1024)}KB)        \n`);
      else if (!['notfound','skip'].includes(result.result))
        process.stdout.write(`\r[${done}/${total}] ⚠  ${code}: ${result.result}        \n`);
      else
        process.stdout.write(`\r[${done}/${total}] …                                    `);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');
  return { ok, skipped, failed, total };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];

  let subjects;
  if (!arg || arg === 'all') {
    subjects = { ...IGCSE_SUBJECTS, ...ALEVEL_SUBJECTS };
  } else if (arg === 'igcse') {
    subjects = IGCSE_SUBJECTS;
  } else if (arg === 'alevels') {
    subjects = ALEVEL_SUBJECTS;
  } else if (IGCSE_SUBJECTS[arg] || ALEVEL_SUBJECTS[arg]) {
    subjects = { [arg]: IGCSE_SUBJECTS[arg] || ALEVEL_SUBJECTS[arg] };
  } else {
    console.error('Unknown argument:', arg);
    console.error('Usage: node scripts/download-2026.js [all|igcse|alevels|<subjectCode>]');
    process.exit(1);
  }

  const list = buildList(subjects);
  console.log(`\n📦 2026 Paper Downloader`);
  console.log(`   Subjects : ${Object.keys(subjects).join(', ')}`);
  console.log(`   Files    : ${list.length} to check`);
  console.log(`   Output   : ${OUT_DIR}\n`);

  const { ok, skipped, failed } = await runAll(list);

  console.log(`\n✅ Downloaded : ${ok}`);
  console.log(`⏭  Skipped    : ${skipped} (already present)`);
  console.log(`⚠  Errors     : ${failed}`);
  console.log(`\nNext step: python scripts/upload-2026-to-archive.py`);
}

main().catch(console.error);
