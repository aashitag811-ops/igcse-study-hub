/**
 * cleanup-igcse91-olevel.js
 * Deletes all IGCSE 9-1 and O-Level PDFs from scripts/pastpapers/
 * and all stubs from public/papers/
 * Run: node scripts/cleanup-igcse91-olevel.js
 */
const fs   = require('fs');
const path = require('path');

const IGCSE91 = new Set(['0970','0971','0972','0973','0976','0977','0978','0980','0984','0985','0986','0987','0989','0990','0992','0994','0995','7184']);
const OLEVEL  = new Set(['1123','2059','2210','2281','3204','4024','4037','4040','5054','5070','5090','7010','7094','7100','7110','7707']);

function deleteFromDir(dir, label) {
  const files = fs.readdirSync(dir);
  let deleted = 0;
  for (const f of files) {
    const code = f.split('_')[0];
    if (IGCSE91.has(code) || OLEVEL.has(code)) {
      fs.unlinkSync(path.join(dir, f));
      deleted++;
    }
  }
  console.log(`${label}: deleted ${deleted} files`);
  return deleted;
}

deleteFromDir(path.join(__dirname, 'pastpapers'),      'scripts/pastpapers');
deleteFromDir(path.join(__dirname, '../public/papers'), 'public/papers');
