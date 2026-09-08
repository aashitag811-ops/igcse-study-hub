/**
 * download-from-bestexamhelp.js  (resume-safe, max-listeners fixed)
 * ─────────────────────────────────────────────────────────────────────────────
 * Downloads ALL PDFs catalogued in scripts/beh-catalogue.json from
 * bestexamhelp.com and saves them to scripts/pastpapers/ (flat folder,
 * same naming convention used by the archive uploaders).
 *
 * Usage:
 *   node scripts/download-from-bestexamhelp.js          — all subjects
 *   node scripts/download-from-bestexamhelp.js 0610     — one subject code
 *   node scripts/download-from-bestexamhelp.js igcse    — IGCSE section only
 *   node scripts/download-from-bestexamhelp.js alevel   — A-Level section only
 *   node scripts/download-from-bestexamhelp.js olevel   — O-Level section only
 *   node scripts/download-from-bestexamhelp.js igcse91  — IGCSE (9-1) section only
 *
 * Requires: scripts/beh-catalogue.json (run scrape-beh-all.js first)
 */

const https        = require("https");
const fs           = require("fs");
const path         = require("path");
const EventEmitter = require("events");

// ── Prevent "MaxListenersExceededWarning" crash ───────────────────────────────
EventEmitter.defaultMaxListeners = 100;
process.setMaxListeners(100);

// ── Catch any unhandled crash and keep going ──────────────────────────────────
process.on("uncaughtException",    e => console.error("\n[uncaughtException]", e.message));
process.on("unhandledRejection",   e => console.error("\n[unhandledRejection]", e));

const CATALOGUE   = path.join(__dirname, "beh-catalogue.json");
const OUT_DIR     = path.join(__dirname, "pastpapers");
const MIN_SIZE    = 20 * 1024;    // 20 KB — anything smaller is an error page
// Windows exhausts its ~5000 ephemeral ports with many concurrent connections.
// keepAlive=true reuses sockets (avoids TIME_WAIT), maxSockets=2 keeps port
// usage tiny. This is slower but will run to completion without crashing.
const CONCURRENCY = 2;
const TIMEOUT_MS  = 30_000;
const RETRY_MAX   = 3;

// ── Reusable HTTPS agent ── defined AFTER constants ───────────────────────────
const AGENT = new https.Agent({
  keepAlive:      true,
  maxSockets:     2,
  maxFreeSockets: 2,
  timeout:        TIMEOUT_MS,
});

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(CATALOGUE)) {
  console.error("❌  beh-catalogue.json not found. Run: node scripts/scrape-beh-all.js first");
  process.exit(1);
}

const CATALOGUE_DATA = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));

// ── URL builder ───────────────────────────────────────────────────────────────
// bestexamhelp URL pattern:
//   IGCSE:    https://bestexamhelp.com/exam/cambridge-igcse/{slug}/{year}/{filename}
//   IGCSE9-1: https://bestexamhelp.com/exam/cambridge-igcse-9-1/{slug}/{year}/{filename}
//   A-Level:  https://bestexamhelp.com/exam/cambridge-international-a-level/{slug}/{year}/{filename}
//   O-Level:  https://bestexamhelp.com/exam/cambridge-o-level/{slug}/{year}/{filename}

const SECTION_BASE = {
  igcse:   "cambridge-igcse",
  igcse91: "cambridge-igcse-9-1",
  alevel:  "cambridge-international-a-level",
  olevel:  "cambridge-o-level",
};

function urlFor(label, slug, filename) {
  // Extract year from filename: 0610_s22_qp_11.pdf → 2022, 9700_w10_qp_11.pdf → 2010
  const m = filename.match(/_[msw](\d{2})_/);
  if (!m) return null;
  const yr = parseInt(m[1]);
  const year = yr < 50 ? 2000 + yr : 1900 + yr;
  const base = SECTION_BASE[label];
  if (!base) return null;
  return `https://bestexamhelp.com/exam/${base}/${slug}/${year}/${filename}`;
}

// ── Download one file ─────────────────────────────────────────────────────────
function download(url, outPath) {
  return new Promise(resolve => {
    if (fs.existsSync(outPath)) {
      const size = fs.statSync(outPath).size;
      if (size > MIN_SIZE) { resolve("skip"); return; }
      fs.unlinkSync(outPath);
    }

    const tmpPath = outPath + ".tmp";
    const file    = fs.createWriteStream(tmpPath);

    const req = https.get(url, {
      agent:   AGENT,
      timeout: TIMEOUT_MS,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ArchiveBot/1.0)" }
    }, res => {
      if (res.statusCode !== 200) {
        res.resume(); file.destroy(); fs.unlink(tmpPath, () => {});
        resolve("notfound");
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          const size = fs.existsSync(tmpPath) ? fs.statSync(tmpPath).size : 0;
          if (size > MIN_SIZE) {
            // Verify PDF magic bytes
            const fd  = fs.openSync(tmpPath, "r");
            const buf = Buffer.alloc(4);
            fs.readSync(fd, buf, 0, 4, 0);
            fs.closeSync(fd);
            if (buf[0] === 0x25 && buf[1] === 0x50) {
              fs.renameSync(tmpPath, outPath);
              resolve("ok");
            } else {
              fs.unlink(tmpPath, () => {});
              resolve("notpdf");
            }
          } else {
            fs.unlink(tmpPath, () => {});
            resolve("toosmall");
          }
        });
      });
      file.on("error", () => { fs.unlink(tmpPath, () => {}); resolve("fileerr"); });
    });

    req.on("timeout", () => { req.destroy(); fs.unlink(tmpPath, () => {}); resolve("timeout"); });
    req.on("error",   () => {               fs.unlink(tmpPath, () => {}); resolve("err"); });
  });
}

// ── Concurrent runner with retry ─────────────────────────────────────────────
async function runAll(jobs) {
  let idx = 0, done = 0, ok = 0, skipped = 0, failed = 0;
  const total = jobs.length;
  const retryQueue = [];

  async function worker() {
    while (idx < total) {
      const job    = jobs[idx++];
      let result   = await download(job.url, job.outPath);

      // Retry transient errors up to RETRY_MAX times
      let attempts = 1;
      while (["timeout","err","fileerr"].includes(result) && attempts < RETRY_MAX) {
        await new Promise(r => setTimeout(r, 2000 * attempts)); // back-off
        result = await download(job.url, job.outPath);
        attempts++;
      }

      done++;
      if      (result === "ok")   { ok++;     await new Promise(r => setTimeout(r, 80)); } // small delay after each success
      else if (result === "skip") skipped++;
      else if (["timeout","err","fileerr"].includes(result)) {
        failed++;
        retryQueue.push(job);
      }

      if (done % 100 === 0 || done === total) {
        process.stdout.write(
          `\r[${done}/${total}]  New: ${ok}  Skip: ${skipped}  Err: ${failed}   `
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Final pass: retry anything still failing
  if (retryQueue.length > 0) {
    console.log(`\n\nRetrying ${retryQueue.length} failed files...`);
    for (const job of retryQueue) {
      await new Promise(r => setTimeout(r, 500));
      const result = await download(job.url, job.outPath);
      if (result === "ok") { ok++; failed--; }
    }
  }

  console.log(`\n\nFinished.  Downloaded: ${ok}  |  Skipped: ${skipped}  |  Errors: ${failed}`);
  return { ok, skipped, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const arg = (process.argv[2] || "all").toLowerCase();

// Build job list
const jobs = [];
let totalSubjects = 0;

for (const [code, data] of Object.entries(CATALOGUE_DATA)) {
  // Filter by argument
  if (arg !== "all" && arg !== data.label && arg !== code) continue;

  totalSubjects++;
  for (const filename of data.files) {
    const url = urlFor(data.label, data.slug, filename);
    if (!url) continue;
    const outPath = path.join(OUT_DIR, filename);
    jobs.push({ url, outPath, code, filename });
  }
}

if (jobs.length === 0) {
  console.error(`No jobs found for filter: "${arg}"`);
  console.error(`Valid filters: all, igcse, igcse91, alevel, olevel, or a subject code like 0610`);
  process.exit(1);
}

console.log(`BestExamHelp → PastPapers Downloader`);
console.log(`Filter    : ${arg}`);
console.log(`Subjects  : ${totalSubjects}`);
console.log(`Files     : ${jobs.length}`);
console.log(`Output    : ${OUT_DIR}`);
console.log(`\nStarting download (concurrency = ${CONCURRENCY})...\n`);

runAll(jobs).then(({ ok }) => {
  console.log(`\nOutput folder: ${OUT_DIR}`);
  console.log(`Total files now in pastpapers/: ${fs.readdirSync(OUT_DIR).length}`);
});
