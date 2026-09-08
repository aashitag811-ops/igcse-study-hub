/**
 * download-from-papacambridge.js
 * ─────────────────────────────────────────────────────────────────
 * Downloads files listed in scripts/missing-on-beh-found-on-papa.json
 * from PapaCambridge. These are files that 404'd on bestexamhelp but
 * exist on PapaCambridge.
 *
 * Run: node scripts/download-from-papacambridge.js
 */

const https        = require("https");
const fs           = require("fs");
const path         = require("path");
const EventEmitter = require("events");

EventEmitter.defaultMaxListeners = 100;
process.setMaxListeners(100);
process.on("uncaughtException",  e => console.error("\n[uncaughtException]", e.message));
process.on("unhandledRejection", e => console.error("\n[unhandledRejection]", e));

const PAPA_BASE  = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/";
const OUT_DIR    = path.join(__dirname, "pastpapers");
const LIST_FILE  = path.join(__dirname, "missing-on-beh-found-on-papa.json");
const MIN_SIZE   = 20 * 1024;
const CONCURRENCY = 3;
const TIMEOUT_MS  = 30_000;

fs.mkdirSync(OUT_DIR, { recursive: true });

const AGENT = new https.Agent({
  keepAlive:      true,
  maxSockets:     CONCURRENCY,
  maxFreeSockets: CONCURRENCY,
  timeout:        TIMEOUT_MS,
});

const filenames = JSON.parse(fs.readFileSync(LIST_FILE, "utf8"));
console.log(`Files to download from PapaCambridge: ${filenames.length}`);

function download(filename) {
  const outPath = path.join(OUT_DIR, filename);
  return new Promise(resolve => {
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > MIN_SIZE) {
      resolve("skip"); return;
    }
    const url     = PAPA_BASE + filename;
    const tmpPath = outPath + ".tmp";
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    const file = fs.createWriteStream(tmpPath);

    const req = https.get(url, {
      agent: AGENT, timeout: TIMEOUT_MS,
      headers: { "User-Agent": "Mozilla/5.0" }
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
            const fd = fs.openSync(tmpPath, "r");
            const buf = Buffer.alloc(4);
            fs.readSync(fd, buf, 0, 4, 0);
            fs.closeSync(fd);
            if (buf[0] === 0x25 && buf[1] === 0x50) {
              fs.renameSync(tmpPath, outPath);
              resolve("ok"); return;
            }
          } catch {}
        }
        fs.unlink(tmpPath, () => {}); resolve("toosmall");
      }));
      file.on("error", () => { fs.unlink(tmpPath, () => {}); resolve("fileerr"); });
    });
    req.on("timeout", () => { req.destroy(); fs.unlink(tmpPath, () => {}); resolve("timeout"); });
    req.on("error",   () => {               fs.unlink(tmpPath, () => {}); resolve("err"); });
  });
}

async function run() {
  let idx = 0, done = 0, ok = 0, skipped = 0, failed = 0;
  const total = filenames.length;

  async function worker() {
    while (idx < total) {
      const filename = filenames[idx++];
      let result = await download(filename);

      // One retry for transient errors
      if (["timeout","err","fileerr"].includes(result)) {
        await new Promise(r => setTimeout(r, 2000));
        result = await download(filename);
      }

      done++;
      if      (result === "ok")   ok++;
      else if (result === "skip") skipped++;
      else if (!["notfound","toosmall","notpdf"].includes(result)) failed++;

      if (done % 100 === 0 || done === total) {
        process.stdout.write(`\r[${done}/${total}]  New: ${ok}  Skip: ${skipped}  Err: ${failed}   `);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n\nDone.  New: ${ok}  |  Skipped: ${skipped}  |  Errors: ${failed}`);
  console.log(`Total in pastpapers/: ${fs.readdirSync(OUT_DIR).length}`);
}

run();
