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
    req.on('timeout', () => { req.destroy(); resolve({ code, exists: false }); });
    req.end();
  });
}

const YEARS = [];
for (let y = 10; y <= 25; y++) YEARS.push(String(y).padStart(2,'0'));

async function probeVariants(subjectCode, sessions, components, variants, years) {
  const toProbe = [];
  for (const yr of years) {
    for (const sess of sessions) {
      for (const c of components) {
        for (const v of variants) {
          toProbe.push(`${subjectCode}_${sess}${yr}_qp_${c}${v}`);
        }
      }
    }
  }
  const BATCH = 30;
  const found = new Set();
  for (let i = 0; i < toProbe.length; i += BATCH) {
    const batch = toProbe.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(head));
    results.filter(r => r.exists).forEach(r => found.add(r.code));
  }
  return found;
}

(async () => {
  // 1) Check Feb/March sessions for 0470 History and 0460 Geography
  for (const code of ['0470', '0460']) {
    const march = await probeVariants(code, ['m'], [1,2,4], [1,2,3], YEARS);
    console.log(`${code} March session: ${march.size} papers found`);
    if (march.size > 0) console.log('  examples:', [...march].slice(0,3).join(', '));
  }

  // 2) Check all variants for 0510 ESL (has m session?)
  const eslM = await probeVariants('0510', ['m'], [1,2,3,4], [1,2,3], YEARS);
  console.log(`0510 ESL March session: ${eslM.size} papers`);
  if (eslM.size > 0) console.log('  examples:', [...eslM].slice(0,3).join(', '));

  // 3) Check 0490 Religious Studies summer session
  const rsS = await probeVariants('0490', ['s'], [1,2,3,4,5,6], [1,2,3], YEARS);
  console.log(`0490 ReligiousStudies Summer session: ${rsS.size} papers`);
  if (rsS.size > 0) console.log('  examples:', [...rsS].slice(0,5).join(', '));

  // 4) Check variant distribution for key subjects (how many have v2, v3?)
  for (const code of ['0470', '0460', '0510']) {
    const v2 = await probeVariants(code, ['s','w'], [1,2,4], [2,3], ['15','16','17','18','19','20','21','22','23']);
    console.log(`${code} v2/v3 papers: ${v2.size}`);
    if (v2.size > 0) console.log('  examples:', [...v2].slice(0,3).join(', '));
  }

  // 5) Check new A-level subjects
  for (const [code, sessions, comps, yrs] of [
    ['9489', ['s','w'], [1,2,3,4], ['21','22','23','24','25']],
    ['9084', ['s','w'], [1,2,3,4], YEARS],
    ['9699', ['s','w'], [1,2,3,4], YEARS],
    ['9990', ['s','w'], [1,2,3,4], ['18','19','20','21','22','23','24','25']],
    ['9698', ['s','w'], [1,2,3,4], ['10','11','12','13','14','15','16','17','18']],
    ['9607', ['s'], [1,2,3,4], ['17','18','19','20','21','22','23','24','25']],
    ['9707', ['s','w'], [1,2,3], ['10','11','12','13','14','15']],
    ['9691', ['s','w'], [1,2,3,4], ['10','11','12','13','14','15','16']],
  ]) {
    const found = await probeVariants(code, sessions, comps, [1,2,3], yrs);
    console.log(`\n${code}:`);
    const byComp = {};
    for (const id of found) {
      const m = id.match(/_([msw])(\d+)_qp_(\d)(\d)/);
      if (m) {
        const key = `P${m[3]}v${m[4]}`;
        if (!byComp[key]) byComp[key] = [];
        byComp[key].push(`${m[1]}${m[2]}`);
      }
    }
    for (const [k,v] of Object.entries(byComp).sort()) {
      console.log(`  ${k}: [${v.join(',')}]`);
    }
  }
})();
