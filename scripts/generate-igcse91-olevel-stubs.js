/**
 * generate-igcse91-olevel-stubs.js
 * Generates view-only JSON stubs for IGCSE (9-1) and O-Level papers
 * from the PDFs already downloaded in scripts/pastpapers/
 */

const fs = require('fs');
const path = require('path');

const PDF_DIR    = path.join(__dirname, 'pastpapers');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'papers');

const IGCSE91_CODES = new Set([
  '0970','0971','0972','0973','0976','0977','0978','0980',
  '0984','0985','0986','0987','0989','0990','0992','0994','0995','7184',
]);

const OLEVEL_CODES = new Set([
  '1123','2059','2210','2281','3204','4024','4037','4040',
  '5054','5070','5090','7010','7094','7100','7110','7115','7707',
]);

const SUBJECT_NAMES = {
  // IGCSE 9-1
  '0970': 'Biology',
  '0971': 'Chemistry',
  '0972': 'Physics',
  '0973': 'Co-ordinated Sciences',
  '0976': 'Geography',
  '0977': 'History',
  '0978': 'Music',
  '0980': 'Mathematics',
  '0984': 'Computer Science',
  '0985': 'Accounting',
  '0986': 'Business Studies',
  '0987': 'Economics',
  '0989': 'Art and Design',
  '0990': 'English — First Language',
  '0992': 'English Literature',
  '0994': 'Drama',
  '0995': 'Physical Education',
  '7184': 'Arabic — First Language',
  // O-Level
  '1123': 'English Language',
  '2059': 'Pakistan Studies',
  '2210': 'Computer Science',
  '2281': 'Economics',
  '3204': 'Bengali',
  '4024': 'Mathematics D',
  '4037': 'Additional Mathematics',
  '4040': 'Statistics',
  '5054': 'Physics',
  '5070': 'Chemistry',
  '5090': 'Biology',
  '7010': 'Computer Studies',
  '7094': 'Bangladesh Studies',
  '7100': 'Commerce',
  '7110': 'Principles of Accounts',
  '7115': 'Business Studies',
  '7707': 'Accounting',
};

const PAPER_TYPES = {
  'qp': 'Question Paper',
  'ms': 'Mark Scheme',
  'er': 'Examiner Report',
  'gt': 'Grade Threshold',
  'ci': 'Confidential Instructions',
  'in': 'Insert',
};

const SESSION_NAMES = { m: 'February/March', s: 'May/June', w: 'October/November' };

let created = 0;
let skipped = 0;

const pdfs = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));

for (const pdf of pdfs) {
  const base = pdf.replace('.pdf', '');
  const parts = base.split('_');
  if (parts.length < 4) continue;

  const code = parts[0];
  if (!IGCSE91_CODES.has(code) && !OLEVEL_CODES.has(code)) continue;

  const stubPath = path.join(PUBLIC_DIR, base + '.json');
  if (fs.existsSync(stubPath)) { skipped++; continue; }

  // Parse: CODE_SESS##_TYPE_COMP[VAR]
  // e.g. 0970_s18_qp_11 → code=0970, sess=s, yr=18, type=qp, comp=1, var=1
  const sessPart = parts[1]; // e.g. "s18"
  const sess = sessPart[0].toLowerCase();
  const yr = parseInt(sessPart.slice(1), 10);
  const year = 2000 + yr;

  const typePart = parts[2]; // e.g. "qp", "ms", "er", "gt"
  const compVarStr = parts[3]; // e.g. "11", "21", "12", "1"

  let component = 0;
  let variant = 0;
  if (compVarStr.length === 2) {
    component = parseInt(compVarStr[0], 10);
    variant   = parseInt(compVarStr[1], 10);
  } else if (compVarStr.length === 1) {
    component = parseInt(compVarStr, 10);
    variant   = 0;
  }

  const paperType = PAPER_TYPES[typePart] || typePart.toUpperCase();
  const subjName  = SUBJECT_NAMES[code] || code;
  const sessionName = SESSION_NAMES[sess] || sess.toUpperCase();

  const section  = IGCSE91_CODES.has(code) ? 'igcse91' : 'olevel';

  const stub = {
    id: base,
    subject: subjName,
    subjectCode: code,
    year,
    session: sess,
    sessionName,
    component,
    variant,
    paperType,
    section,
    pdfUrl: `/api/pdfs/${pdf}`,
    viewOnly: true,
    testModeAvailable: false,
    questions: [],
  };

  fs.writeFileSync(stubPath, JSON.stringify(stub, null, 2));
  created++;
}

console.log(`Done: ${created} stubs created, ${skipped} already existed`);
console.log(`Total IGCSE91/OLevel stubs now in public/papers/`);
