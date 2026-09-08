const https = require('https');
const BASE = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/';

function head(code) {
  return new Promise(resolve => {
    const url = BASE + code + '.pdf';
    const req = https.request(url, { method: 'HEAD', timeout: 8000 }, res => {
      res.resume();
      resolve({ code, exists: res.statusCode === 200, status: res.statusCode });
    });
    req.on('error', () => resolve({ code, exists: false, status: 'err' }));
    req.on('timeout', () => { req.destroy(); resolve({ code, exists: false, status: 'timeout' }); });
    req.end();
  });
}

async function probeSubject(subjectCode, sessions, papers, years, label) {
  const toProbe = [];
  for (const yr of years) {
    for (const sess of sessions) {
      // Only probe variant 1 of each component to check existence
      for (const paper of papers) {
        toProbe.push(`${subjectCode}_${sess}${yr}_qp_${paper}1`);
      }
    }
  }

  // Run in batches of 20
  const BATCH = 20;
  const found = [];
  for (let i = 0; i < toProbe.length; i += BATCH) {
    const batch = toProbe.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(head));
    results.filter(r => r.exists).forEach(r => found.push(r.code));
  }
  return found;
}

const YEARS = [];
for (let y = 10; y <= 25; y++) YEARS.push(String(y).padStart(2,'0'));

// Key subjects to probe for component existence
const PROBES = [
  // IGCSE
  { code: '0448', sessions: ['m','s','w'], components: [1,2,3,4,5,6], label: 'Travel and Tourism 0448' },
  { code: '0510', sessions: ['m','s','w'], components: [1,2,3,4,5,6], label: 'ESL 0510' },
  { code: '0490', sessions: ['s','w'],     components: [1,2,3,4,5,6], label: 'Religious Studies 0490' },
  { code: '0470', sessions: ['m','s','w'], components: [1,2,3,4,5,6], label: 'History 0470' },
  { code: '0460', sessions: ['m','s','w'], components: [1,2,3,4,5,6], label: 'Geography 0460' },
  // A-Level
  { code: '9489', sessions: ['m','s','w'], components: [1,2,3,4,5,6], label: 'History 9489' },
  { code: '9084', sessions: ['m','s','w'], components: [1,2,3,4],     label: 'Law 9084' },
  { code: '9699', sessions: ['m','s','w'], components: [1,2,3,4],     label: 'Sociology 9699' },
  { code: '9698', sessions: ['m','s','w'], components: [1,2,3,4],     label: 'Psychology 9698' },
  { code: '9990', sessions: ['m','s','w'], components: [1,2,3,4],     label: 'Psychology 9990' },
  { code: '9607', sessions: ['m','s','w'], components: [1,2,3,4],     label: 'Media Studies 9607' },
  { code: '9707', sessions: ['m','s','w'], components: [1,2,3,4],     label: 'Business Studies 9707' },
  { code: '9691', sessions: ['m','s','w'], components: [1,2,3,4],     label: 'Computing 9691' },
];

(async () => {
  for (const p of PROBES) {
    const found = await probeSubject(p.code, p.sessions, p.components, YEARS, p.label);
    if (found.length === 0) {
      console.log(`${p.label}: NO papers found`);
      continue;
    }
    // Show which component+sessions+years have papers
    const byComp = {};
    for (const id of found) {
      const m = id.match(/_([msw])(\d+)_qp_(\d)/);
      if (m) {
        const comp = m[3];
        if (!byComp[comp]) byComp[comp] = { sessions: new Set(), years: new Set() };
        byComp[comp].sessions.add(m[1]);
        byComp[comp].years.add(m[2]);
      }
    }
    console.log(`${p.label} (${p.code}):`);
    for (const [comp, data] of Object.entries(byComp).sort()) {
      const years = [...data.years].sort().join(',');
      const sess = [...data.sessions].sort().join('');
      console.log(`  Paper ${comp}: sessions=[${sess}] years=[${years}]`);
    }
  }
})();
