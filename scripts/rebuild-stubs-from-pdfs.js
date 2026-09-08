/**
 * rebuild-stubs-from-pdfs.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Deletes ALL viewOnly stubs in public/papers/ and regenerates them
 * strictly from PDFs that actually exist in scripts/pastpapers/.
 *
 * Parsed MCQ papers (questions.length > 0) are NEVER touched.
 *
 * Usage: node scripts/rebuild-stubs-from-pdfs.js
 */

const fs   = require('fs');
const path = require('path');

const PDF_DIR    = path.join(__dirname, 'pastpapers');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'papers');

// ── Subject name maps ─────────────────────────────────────────────────────────

const IGCSE_NAMES = {
  '0400':'Art & Design','0410':'Music','0411':'Drama',
  '0413':'Physical Education','0417':'ICT',
  '0447':'Co-ordinated Sciences (Double)','0448':'Co-ordinated Sciences (Single)',
  '0450':'Business Studies','0452':'Accounting','0454':'Enterprise',
  '0455':'Economics','0457':'Global Perspectives','0460':'Geography',
  '0470':'History','0471':'Travel & Tourism','0475':'English Literature',
  '0478':'Computer Science','0490':'Religious Studies (Islamiyat)',
  '0493':'Islamiyat','0495':'Sociology','0500':'First Language English',
  '0508':'English as a Second Language (Count-in Speaking)',
  '0510':'English as a Second Language','0520':'French',
  '0549':'Hindi as a Second Language','0580':'Mathematics',
  '0600':'Agriculture','0606':'Additional Mathematics',
  '0610':'Biology','0620':'Chemistry','0625':'Physics',
  '0648':'Food & Nutrition','0654':'Co-ordinated Sciences',
  '0680':'Environmental Management',
};

const IGCSE91_NAMES = {
  '0970':'Biology','0971':'Chemistry','0972':'Physics',
  '0973':'Co-ordinated Sciences','0976':'Geography','0977':'History',
  '0978':'Music','0980':'Mathematics','0984':'Computer Science',
  '0985':'Accounting','0986':'Business Studies','0987':'Economics',
  '0989':'Art and Design','0990':'English — First Language',
  '0992':'English Literature','0994':'Drama','0995':'Physical Education',
  '7184':'Arabic — First Language',
};

const ALEVEL_NAMES = {
  '8021':'English General Paper',
  '9084':'Law','9093':'English Language','9231':'Further Mathematics',
  '9395':'Physical Education',
  '9488':'Islamic Studies','9489':'History',
  '9608':'Computer Science','9609':'Business',
  '9618':'Computer Science','9691':'Computing',
  '9698':'Psychology','9699':'Sociology','9700':'Biology',
  '9701':'Chemistry','9702':'Physics','9706':'Accounting',
  '9707':'Business Studies','9708':'Economics','9709':'Mathematics',
  '9713':'Applied ICT','9990':'Psychology',
};

const OLEVEL_NAMES = {
  '1123':'English Language','2059':'Pakistan Studies',
  '2210':'Computer Science','2281':'Economics','3204':'Bengali',
  '4024':'Mathematics D','4037':'Additional Mathematics',
  '4040':'Statistics','5054':'Physics','5070':'Chemistry',
  '5090':'Biology','7010':'Computer Studies','7094':'Bangladesh Studies',
  '7100':'Commerce','7110':'Principles of Accounts',
  '7115':'Business Studies','7707':'Accounting',
};

const ALL_NAMES = { ...IGCSE_NAMES, ...IGCSE91_NAMES, ...ALEVEL_NAMES, ...OLEVEL_NAMES };

const IGCSE_CODES   = new Set(Object.keys(IGCSE_NAMES));
const IGCSE91_CODES = new Set(Object.keys(IGCSE91_NAMES));
const ALEVEL_CODES  = new Set(Object.keys(ALEVEL_NAMES));
const OLEVEL_CODES  = new Set(Object.keys(OLEVEL_NAMES));

function sectionFor(code) {
  if (ALEVEL_CODES.has(code))   return 'alevel';
  if (IGCSE91_CODES.has(code))  return 'igcse91';
  if (OLEVEL_CODES.has(code))   return 'olevel';
  if (IGCSE_CODES.has(code))    return 'igcse';
  return null;
}

const SESSION_NAMES = { m:'February/March', s:'May/June', w:'October/November' };

const PAPER_TYPES = {
  'qp':'Question Paper','ms':'Mark Scheme','er':'Examiner Report',
  'gt':'Grade Threshold','ci':'Confidential Instructions','in':'Insert',
  'sm':'Specimen Mark Scheme','sp':'Specimen Paper',
};

// ── Step 1: collect existing parsed MCQ paper IDs (protect them) ─────────────

const protectedIds = new Set();
for (const fn of fs.readdirSync(PUBLIC_DIR)) {
  if (!fn.endsWith('.json')) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, fn), 'utf8'));
    if (d.questions && d.questions.length > 0) {
      protectedIds.add(fn.replace('.json', ''));
    }
  } catch {}
}
console.log(`Protected parsed MCQ papers: ${protectedIds.size}`);

// ── Step 2: delete all viewOnly stubs ────────────────────────────────────────

let deleted = 0;
for (const fn of fs.readdirSync(PUBLIC_DIR)) {
  if (!fn.endsWith('.json')) continue;
  const id = fn.replace('.json', '');
  if (protectedIds.has(id)) continue;
  fs.unlinkSync(path.join(PUBLIC_DIR, fn));
  deleted++;
}
console.log(`Deleted ${deleted} old viewOnly stubs`);

// ── Step 3: regenerate stubs only from real PDFs ──────────────────────────────

const FILENAME_RE = /^(\d{3,4})_([mswMSW])(\d{2})_([a-z]+)_(\d{1,2})\.pdf$/i;

let created = 0;
let skipped = 0;
let unknown = 0;

for (const pdf of fs.readdirSync(PDF_DIR).sort()) {
  if (!pdf.endsWith('.pdf')) continue;

  const m = pdf.match(FILENAME_RE);
  if (!m) { unknown++; continue; }

  const [, code, sessRaw, yrStr, typeRaw, compVar] = m;
  const sess   = sessRaw.toLowerCase();
  const yr     = parseInt(yrStr, 10);
  const year   = 2000 + yr;
  const type   = typeRaw.toLowerCase();
  const base   = pdf.replace('.pdf', '');

  // Only generate stubs for qp (question papers) — those are what the viewer loads
  if (type !== 'qp') { skipped++; continue; }

  const section = sectionFor(code);
  if (!section) { unknown++; continue; }

  // Parse component and variant from last segment e.g. "12" → comp=1 var=2
  let component, variant;
  if (compVar.length === 2) {
    component = parseInt(compVar[0], 10);
    variant   = parseInt(compVar[1], 10);
  } else {
    component = parseInt(compVar, 10);
    variant   = 0;
  }

  const stubPath = path.join(PUBLIC_DIR, base + '.json');

  // Don't overwrite a protected parsed paper
  if (protectedIds.has(base)) { skipped++; continue; }

  const subjName = ALL_NAMES[code] || code;
  const sessionName = SESSION_NAMES[sess] || sess;

  const stub = {
    id: base,
    subject: subjName,
    subjectCode: code,
    year,
    session: sess,
    sessionName,
    component,
    variant,
    paperType: 'Question Paper',
    section,
    pdfUrl: `/api/pdfs/${pdf}`,
    viewOnly: true,
    testModeAvailable: false,
    questions: [],
  };

  fs.writeFileSync(stubPath, JSON.stringify(stub, null, 2));
  created++;
}

console.log(`Created ${created} new stubs from real PDFs`);
console.log(`Skipped ${skipped} (non-qp or protected)`);
console.log(`Unknown/unmatched: ${unknown}`);
console.log(`\nTotal stubs now: ${fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.json')).length}`);
