const fs = require('fs');
const path = require('path');
const dir = 'public/papers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const MCQ_ELIGIBLE = {
  '0610': [1, 2], '0620': [1, 2], '0625': [1, 2],
  '0455': [1], '0452': [1]
};
const needsParse = [];
for (const f of files) {
  const m = f.match(/^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)\.json$/);
  if (!m) continue;
  const [,code,,yy,comp] = m;
  if (!MCQ_ELIGIBLE[code]) continue;
  if (!MCQ_ELIGIBLE[code].includes(parseInt(comp))) continue;
  const d = JSON.parse(fs.readFileSync(path.join(dir, f)));
  const qs = d.questions || [];
  const id = f.replace('.json','');
  const allGood = qs.length > 0 && qs.every(q => q.imageUrl && !q.imageUrl.includes('/images/mcq/'));
  if (!allGood) needsParse.push(id);
}
needsParse.sort();

let haveQP = [], missingQP = [];
for (const id of needsParse) {
  const qpFile = path.join('scripts/pastpapers', id + '.pdf');
  if (fs.existsSync(qpFile)) haveQP.push(id);
  else missingQP.push(id);
}
console.log('Total needing parse:', needsParse.length);
console.log('Have QP PDF already:', haveQP.length);
console.log('Missing QP PDF:', missingQP.length);
if (missingQP.length > 0) {
  console.log('\nMissing PDFs:');
  missingQP.forEach(id => console.log(id));
}
