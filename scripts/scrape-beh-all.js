/**
 * Scrape bestexamhelp.com to discover EVERY subject, year, session, paper and variant.
 * Outputs: scripts/beh-catalogue.json
 *
 * Run: node scripts/scrape-beh-all.js
 */
const https = require("https");
const fs    = require("fs");
const path  = require("path");

const CONCURRENCY = 8;

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error("too many redirects: " + url));
    const req = https.get(url, {
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CambridgePaperBot/1.0)" }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(get(loc, redirects + 1));
      }
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve({ status: res.statusCode, body: data, url }));
    });
    req.on("error", () => resolve({ status: "err", body: "", url }));
    req.on("timeout", () => { req.destroy(); resolve({ status: "timeout", body: "", url }); });
  });
}

async function runPool(tasks, concurrency) {
  let idx = 0;
  const results = [];
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Section definitions ────────────────────────────────────────────────────
const SECTIONS = [
  { label: "igcse",    base: "cambridge-igcse",                 url: "https://bestexamhelp.com/exam/cambridge-igcse/index.php" },
  { label: "igcse91",  base: "cambridge-igcse-9-1",             url: "https://bestexamhelp.com/exam/cambridge-igcse-9-1/index.php" },
  { label: "alevel",   base: "cambridge-international-a-level", url: "https://bestexamhelp.com/exam/cambridge-international-a-level/index.php" },
  { label: "olevel",   base: "cambridge-o-level",               url: "https://bestexamhelp.com/exam/cambridge-o-level/index.php" },
];

// ── Step 1: Get all subject slugs per section ──────────────────────────────
async function getSubjects(section) {
  const r = await get(section.url);
  if (!r.body) return [];
  // Match relative hrefs like "biology-0610/index.php"
  const re = /href="([\w-]+-\d{4}\/index\.php)"/g;
  const matches = [...r.body.matchAll(re)];
  return [...new Set(matches.map(m => m[1].replace("/index.php", "")))];
}

// ── Step 2: For each subject, get year pages ───────────────────────────────
async function getYears(section, slug) {
  const url = `https://bestexamhelp.com/exam/${section.base}/${slug}/index.php`;
  const r = await get(url);
  if (!r.body) return [];
  // Find year links: href="2023/summer.php" or href="2023/march.php" or href="2023/winter.php"
  const re = /href="(\d{4})\/(summer|winter|march|spring|autumn|june|november|march)\.php"/gi;
  const yearSess = [...r.body.matchAll(re)];
  return [...new Set(yearSess.map(m => ({ year: m[1], session: m[2].toLowerCase() })))];
}

// ── Step 3: For each year/session, get paper links ─────────────────────────
async function getPapers(section, slug, year, session) {
  const url = `https://bestexamhelp.com/exam/${section.base}/${slug}/${year}/${session}.php`;
  const r = await get(url);
  if (!r.body || r.status !== 200) return [];
  // Find relative .php links that match paper patterns like "0610-s22-qp-11.php"
  const re = /href="([\w-]+-(?:qp|ms|er|gt|ci|sf|sp|in|ir|rp|ig|il|pm|qr|rr|sm|su|sy|tc|tr|uc|un|us|qr|ct|nq|pt|pq|op|ol|od|oc|ob|oa|nw|nv|ns|nr|nq|np|nm|nl|nk|nj|ni|nh|ng|nf|ne|nd|nc|nb|na)-?\d*\.php)"/gi;
  const links = [...new Set([...r.body.matchAll(re)].map(m => m[1]))];
  // Also catch simpler patterns
  const re2 = /href="(\d{4}-[msw]\d{2}-(?:qp|ms|er|gt|ci|sf)\d*\.php)"/gi;
  const links2 = [...new Set([...r.body.matchAll(re2)].map(m => m[1]))];
  return [...new Set([...links, ...links2])];
}

// ── Step 4: For each paper .php, get the actual PDF link ───────────────────
async function getPdfLink(section, slug, year, phpFile) {
  const pageUrl = `https://bestexamhelp.com/exam/${section.base}/${slug}/${year}/${phpFile}`;
  const r = await get(pageUrl);
  if (!r.body || r.status !== 200) return null;
  const m = r.body.match(/href="([\w_-]+\.pdf)"/i);
  return m ? m[1] : null;
}

// ── Main ───────────────────────────────────────────────────────────────────
(async () => {
  const catalogue = {};   // { "0610": { label:"igcse", slug:"biology-0610", files:["0610_s22_qp_11.pdf",...] } }
  let totalFiles = 0;

  for (const section of SECTIONS) {
    console.log(`\n[${section.label}] Getting subjects from ${section.url}...`);
    const slugs = await getSubjects(section);
    console.log(`  Found ${slugs.length} subjects: ${slugs.join(", ")}`);

    for (const slug of slugs) {
      const codeMatch = slug.match(/(\d{4})$/);
      if (!codeMatch) { console.log(`  SKIP no code: ${slug}`); continue; }
      const code = codeMatch[1];

      process.stdout.write(`  [${code}] ${slug} — getting year list...`);
      const yearSessions = await getYears(section, slug);
      process.stdout.write(` ${yearSessions.length} sessions\n`);

      if (yearSessions.length === 0) continue;

      // For each year/session, get paper php list
      const paperPhpByYearSess = {};
      const yearTasks = yearSessions.map(ys => async () => {
        const papers = await getPapers(section, slug, ys.year, ys.session);
        if (papers.length > 0) paperPhpByYearSess[`${ys.year}/${ys.session}`] = { year: ys.year, session: ys.session, papers };
      });
      await runPool(yearTasks, CONCURRENCY);

      // Collect all unique PDF filenames — we can infer them from the PHP filenames
      // Pattern: 0610-s22-qp-11.php → 0610_s22_qp_11.pdf
      const allPdfs = new Set();
      for (const { papers } of Object.values(paperPhpByYearSess)) {
        for (const php of papers) {
          const pdf = php.replace(/-/g, "_").replace(/\.php$/, ".pdf");
          allPdfs.add(pdf);
        }
      }

      if (!catalogue[code]) catalogue[code] = { label: section.label, slug, files: [] };
      catalogue[code].files = [...new Set([...catalogue[code].files, ...allPdfs])];
      totalFiles += allPdfs.size;
      console.log(`    → ${allPdfs.size} PDFs found (total so far: ${totalFiles})`);
    }
  }

  // Save catalogue
  const outPath = path.join(__dirname, "beh-catalogue.json");
  fs.writeFileSync(outPath, JSON.stringify(catalogue, null, 2));
  console.log(`\n✅ Done! ${Object.keys(catalogue).length} subjects, ${totalFiles} total PDFs`);
  console.log(`Saved to: ${outPath}`);

  // Summary table
  console.log("\n=== SUMMARY ===");
  const bySection = {};
  for (const [code, data] of Object.entries(catalogue)) {
    if (!bySection[data.label]) bySection[data.label] = { subjects: 0, files: 0 };
    bySection[data.label].subjects++;
    bySection[data.label].files += data.files.length;
  }
  for (const [sec, stats] of Object.entries(bySection)) {
    console.log(`  ${sec}: ${stats.subjects} subjects, ${stats.files} files`);
  }
})();
