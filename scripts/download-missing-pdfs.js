/**
 * download-missing-pdfs.js
 * Downloads only the PDFs that are in the manifest but missing from public/pdfs/
 * Run: node scripts/download-missing-pdfs.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const PDFS_DIR = path.join(__dirname, '../public/pdfs');
const BASE_URL = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload';

// Known to not exist on PapaCambridge (Hindi QPs, some ICT Feb/March)
const KNOWN_MISSING = new Set([
  '0417_m23_qp_12','0417_m22_qp_12','0417_m21_qp_12',
]);
// 0549 Hindi QPs - don't exist anywhere
const HINDI_SKIP = /^0549_.*_qp_/;

function download(url, dest) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
      } else {
        file.close();
        fs.unlink(dest, () => {});
        resolve(false);
      }
    }).on('error', () => { fs.unlink(dest, () => {}); resolve(false); });
  });
}

async function main() {
  // Get missing list
  const manifestRaw = fs.readFileSync(path.join(__dirname, '../src/lib/data/papers-manifest.ts'), 'utf8');
  const arr = JSON.parse(manifestRaw.match(/const papers: PaperEntry\[\] = (\[[\s\S]*?\]);\s*export/)[1]);
  const missing = arr.filter(p => !fs.existsSync(path.join(PDFS_DIR, p.id + '.pdf')));

  const toDownload = missing.filter(p => !KNOWN_MISSING.has(p.id) && !HINDI_SKIP.test(p.id));
  console.log(`Missing: ${missing.length} | Will attempt: ${toDownload.length} | Skipping known-missing: ${missing.length - toDownload.length}`);

  let ok = 0, failed = [];
  const CONCURRENCY = 8;

  for (let i = 0; i < toDownload.length; i += CONCURRENCY) {
    const batch = toDownload.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (p) => {
      const filename = `${p.id}.pdf`;
      const url = `${BASE_URL}/${filename}`;
      const dest = path.join(PDFS_DIR, filename);
      const success = await download(url, dest);
      if (success) { ok++; process.stdout.write('.'); }
      else { failed.push(p.id); process.stdout.write('x'); }
    }));
  }

  console.log(`\n\nDownloaded: ${ok} | Failed: ${failed.length}`);
  if (failed.length) {
    console.log('Failed:', failed.slice(0, 20).join(', '));
  }
}

main();
