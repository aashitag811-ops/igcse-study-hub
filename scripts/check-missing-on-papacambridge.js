/**
 * check-missing-on-papacambridge.js
 * ─────────────────────────────────────────────────────────────────
 * For every file that failed on bestexamhelp, HEAD-check PapaCambridge.
 * Saves found ones to scripts/missing-on-beh-found-on-papa.json
 *
 * Run: node scripts/check-missing-on-papacambridge.js
 */

const https        = require("https");
const fs           = require("fs");
const path         = require("path");
const EventEmitter = require("events");

EventEmitter.defaultMaxListeners = 100;
process.setMaxListeners(100);

const PAPA_BASE  = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/";
const OUT_DIR    = path.join(__dirname, "pastpapers");
const CATALOGUE  = path.join(__dirname, "beh-catalogue.json");
const OUT_JSON   = path.join(__dirname, "missing-on-beh-found-on-papa.json");
const CONCURRENCY = 20;  // HEAD requests are cheap
const TIMEOUT_MS  = 8000;

const AGENT = new https.Agent({ keepAlive: true, maxSockets: 20, maxFreeSockets: 10 });

const existing   = new Set(fs.readdirSync(OUT_DIR).map(f => f));
const catalogue  = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));

// Build list of missing files
const missing = [];
for (const [code, data] of Object.entries(catalogue)) {
  for (const filename of data.files) {
    if (!existing.has(filename)) missing.push(filename);
  }
}

console.log(`Files missing from bestexamhelp: ${missing.length}`);
console.log(`Checking against PapaCambridge...\n`);

function headPapa(filename) {
  return new Promise(resolve => {
    const url = PAPA_BASE + filename;
    const req = https.request(url, { method: "HEAD", agent: AGENT, timeout: TIMEOUT_MS,
      headers: { "User-Agent": "Mozilla/5.0" }
    }, res => {
      res.resume();
      resolve({ filename, exists: res.statusCode === 200, size: res.headers["content-length"] });
    });
    req.on("error",   () => resolve({ filename, exists: false }));
    req.on("timeout", () => { req.destroy(); resolve({ filename, exists: false }); });
    req.end();
  });
}

async function run() {
  let done = 0, found = 0, notFound = 0;
  const total   = missing.length;
  const results = [];

  // Run in batches
  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch   = missing.slice(i, i + CONCURRENCY);
    const checked = await Promise.all(batch.map(headPapa));

    for (const r of checked) {
      done++;
      if (r.exists) { found++; results.push(r.filename); }
      else notFound++;
    }

    if (done % 500 === 0 || done === total) {
      process.stdout.write(`\r[${done}/${total}]  Found on Papa: ${found}  Not anywhere: ${notFound}   `);
    }
  }

  console.log(`\n\nResults:`);
  console.log(`  Found on PapaCambridge: ${found}`);
  console.log(`  Not found anywhere:     ${notFound}`);

  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\nSaved to: ${OUT_JSON}`);

  // Summary by subject
  const byCode = {};
  for (const f of results) {
    const code = f.split("_")[0];
    byCode[code] = (byCode[code] || 0) + 1;
  }
  console.log("\nFound on PapaCambridge by subject:");
  Object.entries(byCode).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c}: ${n}`));
}

run();
