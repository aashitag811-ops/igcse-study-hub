/**
 * audit-missing-from-beh.js
 * Compares beh-catalogue.json against scripts/pastpapers/ and reports
 * which files are listed in the catalogue but not yet downloaded.
 * 
 * Run: node scripts/audit-missing-from-beh.js
 */

const fs   = require("fs");
const path = require("path");

const CATALOGUE = path.join(__dirname, "beh-catalogue.json");
const PP_DIR    = path.join(__dirname, "pastpapers");

const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));

// Build a set of all existing filenames (lowercase for case-insensitive compare)
const existing = new Set(
  fs.readdirSync(PP_DIR).map(f => f.toLowerCase())
);

let totalMissing = 0;
const bySec = {};
const missingBySec = {};

for (const [code, data] of Object.entries(catalogue)) {
  const sec = data.label;
  if (!bySec[sec]) bySec[sec] = { subjects: 0, total: 0, missing: 0 };
  if (!missingBySec[sec]) missingBySec[sec] = [];

  bySec[sec].subjects++;
  bySec[sec].total += data.files.length;

  const missing = data.files.filter(f => !existing.has(f.toLowerCase()));
  bySec[sec].missing += missing.length;
  totalMissing += missing.length;

  if (missing.length > 0) {
    missingBySec[sec].push({ code, slug: data.slug, missing });
    console.log(`  [${sec}] ${code} (${data.slug}): ${missing.length} missing / ${data.files.length} total`);
    if (missing.length <= 10) {
      missing.forEach(f => console.log(`      - ${f}`));
    } else {
      missing.slice(0, 5).forEach(f => console.log(`      - ${f}`));
      console.log(`      ... and ${missing.length - 5} more`);
    }
  }
}

console.log("\n=== SUMMARY ===");
for (const [sec, stats] of Object.entries(bySec)) {
  const pct = ((stats.total - stats.missing) / stats.total * 100).toFixed(1);
  console.log(`  ${sec}: ${stats.subjects} subjects | ${stats.total} catalogued | ${stats.missing} missing (${pct}% downloaded)`);
}
console.log(`\nTotal missing: ${totalMissing} files`);
console.log(`Total in catalogue: ${Object.values(catalogue).reduce((s,d) => s + d.files.length, 0)}`);
console.log(`Total in pastpapers/: ${existing.size}`);
