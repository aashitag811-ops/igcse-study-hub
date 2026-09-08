/**
 * _chunk_downloader.js
 * ─────────────────────────────────────────────────────────────────
 * Downloads one chunk of files from scripts/_chunk_jobs.json
 * Called by run-download-chunked.py — do not run directly.
 */

const https        = require("https");
const fs           = require("fs");
const path         = require("path");
const EventEmitter = require("events");

EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);

const OUT_DIR    = path.join(__dirname, "pastpapers");
const JOBS_FILE  = path.join(__dirname, "_chunk_jobs.json");
const MIN_SIZE   = 20 * 1024;
const TIMEOUT_MS = 25_000;
const CONCURRENCY = 3;

fs.mkdirSync(OUT_DIR, { recursive: true });

// Fresh agent per process — no leftover TIME_WAIT from previous runs
const AGENT = new https.Agent({
  keepAlive:      true,
  maxSockets:     CONCURRENCY,
  maxFreeSockets: CONCURRENCY,
  timeout:        TIMEOUT_MS,
});

const jobs = JSON.parse(fs.readFileSync(JOBS_FILE, "utf8")); // [[url, filename], ...]

function download(url, filename) {
  const outPath = path.join(OUT_DIR, filename);
  return new Promise(resolve => {
    // Skip if already valid
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > MIN_SIZE) {
      resolve("skip"); return;
    }

    const tmpPath = outPath + ".tmp";
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    const file = fs.createWriteStream(tmpPath);

    const req = https.get(url, { agent: AGENT, timeout: TIMEOUT_MS,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ArchiveBot/1.0)" }
    }, res => {
      if (res.statusCode !== 200) {
        res.resume(); file.destroy();
        fs.unlink(tmpPath, () => {}); resolve("notfound"); return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => {
        const size = fs.existsSync(tmpPath) ? fs.statSync(tmpPath).size : 0;
        if (size > MIN_SIZE) {
          try {
            const fd  = fs.openSync(tmpPath, "r");
            const buf = Buffer.alloc(4);
            fs.readSync(fd, buf, 0, 4, 0);
            fs.closeSync(fd);
            if (buf[0] === 0x25 && buf[1] === 0x50) {
              fs.renameSync(tmpPath, outPath);
              resolve("ok"); return;
            }
          } catch {}
        }
        fs.unlink(tmpPath, () => {});
        resolve("toosmall");
      }));
      file.on("error", () => { fs.unlink(tmpPath, () => {}); resolve("fileerr"); });
    });
    req.on("timeout", () => { req.destroy(); fs.unlink(tmpPath, () => {}); resolve("timeout"); });
    req.on("error",   () => {               fs.unlink(tmpPath, () => {}); resolve("err"); });
  });
}

async function run() {
  let idx = 0, done = 0, ok = 0, skipped = 0, failed = 0;
  const total = jobs.length;

  async function worker() {
    while (idx < total) {
      const [url, filename] = jobs[idx++];
      let result = await download(url, filename);

      // One retry for transient failures
      if (["timeout", "err", "fileerr"].includes(result)) {
        await new Promise(r => setTimeout(r, 2000));
        result = await download(url, filename);
      }

      done++;
      if      (result === "ok")   ok++;
      else if (result === "skip") skipped++;
      else if (!["notfound", "notpdf", "toosmall"].includes(result)) failed++;

      if (done % 50 === 0 || done === total) {
        process.stdout.write(`\r  [${done}/${total}] New:${ok} Skip:${skipped} Err:${failed}   `);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n  Done. New:${ok} Skip:${skipped} Err:${failed}`);
  process.exit(0);
}

run();
