const https = require('https');
const BASE = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/';

function head(code) {
  return new Promise(resolve => {
    const url = BASE + code + '.pdf';
    const req = https.request(url, { method: 'HEAD', timeout: 6000 }, res => {
      res.resume();
      resolve({ code, exists: res.statusCode === 200 });
    });
    req.on('error', () => resolve({ code, exists: false }));
    req.on('timeout', () => { req.destroy(); resolve({ code, exists: false })); });
    req.end();
  });
}

const YEARS = [];
for (let y = 10; y <= 25; y++) YEARS.push(String(y).padStart(2,'0'));

async function probe(codes) {
  const BATCH = 30;
  const found = new Set();
  for (let i = 0; i < codes.length; i += BATCH) {
    const batch = codes.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(head));
    results.filter(r => r.exists).forEach(r => found.add(r.code));
  }
  return found;
}

(async () => {
  // 0448 Travel and Tourism - try all component/variant combos
  console.log('=== 0448 Travel and Tourism ===');
  const all448 = [];
  for (const yr of YEARS) for (const sess of ['m','s','w']) for (const c of [1,2,3,4]) for (const v of [1,2,3]) {
    all448.push(`0448_${sess}${yr}_qp_${c}${v}`);
  }
  const found448 = await probe(all448);
  if (found448.size === 0) { console.log('  NONE found - subject has no papers on PapaCambridge'); }
  else { console.log(`  Found ${found448.size}:`); [...found448].slice(0,10).forEach(x => console.log('  '+x)); }

  // 0490 Religious Studies - check exactly what exists
  console.log('\n=== 0490 Religious Studies ===');
  const all490 = [];
  for (const yr of YEARS) for (const sess of ['s','w']) for (const c of [1,2,3,4,5,6]) for (const v of [1,2,3]) {
    all490.push(`0490_${sess}${yr}_qp_${c}${v}`);
  }
  const found490 = await probe(all490);
  console.log(`  Found ${found490.size} papers:`);
  const by490 = {};
  for (const id of found490) {
    const m = id.match(/_([sw])(\d+)_qp_(\d)(\d)/);
    if (m) { const k=`P${m[3]}v${m[4]}`; if(!by490[k]) by490[k]=[]; by490[k].push(m[1]+m[2]); }
  }
  for (const [k,v] of Object.entries(by490).sort()) console.log(`  ${k}: [${v.join(',')}]`);

  // Check 0448 with alternate variant format (just v1)
  console.log('\n=== 0471 Travel and Tourism (alt code) ===');
  const all471 = [];
  for (const yr of YEARS) for (const sess of ['m','s','w']) for (const c of [1,2,3]) for (const v of [1,2,3]) {
    all471.push(`0471_${sess}${yr}_qp_${c}${v}`);
  }
  const found471 = await probe(all471);
  if (found471.size === 0) console.log('  NONE found');
  else { console.log(`  Found ${found471.size}:`); [...found471].slice(0,5).forEach(x => console.log('  '+x)); }

  // 0510 ESL - check which sessions have March papers (we know s17+ has march)
  console.log('\n=== 0510 ESL March session detail ===');
  const eslM = [];
  for (const yr of YEARS) for (const c of [1,2,3,4]) for (const v of [1,2,3]) {
    eslM.push(`0510_m${yr}_qp_${c}${v}`);
  }
  const foundEslM = await probe(eslM);
  const eslByComp = {};
  for (const id of foundEslM) {
    const m = id.match(/_m(\d+)_qp_(\d)(\d)/);
    if (m) { const k=`P${m[2]}v${m[3]}`; if(!eslByComp[k]) eslByComp[k]=[]; eslByComp[k].push('m'+m[1]); }
  }
  for (const [k,v] of Object.entries(eslByComp).sort()) console.log(`  ${k}: [${v.join(',')}]`);
})();
