/**
 * Generates view-only JSON stubs for ALL missing IGCSE and A-Level papers.
 * Only creates stubs that don't already exist — never overwrites parsed papers.
 *
 * Run: node scripts/generate-all-missing-stubs.js
 */

const fs   = require('fs');
const path = require('path');

const PAPERS_DIR = path.join(__dirname, '../public/papers');
fs.mkdirSync(PAPERS_DIR, { recursive: true });

const SEASON_NAMES = { m:'February/March', s:'May/June', w:'October/November' };
const YEARS = [];
for (let y = 10; y <= 25; y++) YEARS.push(String(y).padStart(2, '0'));

// ── IGCSE subject definitions ─────────────────────────────────────────────────
const IGCSE = {
  '0610': {
    name: 'Biology',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice'                },
      { c:2, desc:'Core Theory'                    },
      { c:3, desc:'Extended Theory'                },
      { c:4, desc:'Coursework / Alternative'       },
      { c:5, desc:'Practical Test'                 },
      { c:6, desc:'Alternative to Practical'       },
    ],
    variants: [1,2,3],
  },
  '0620': {
    name: 'Chemistry',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice'                },
      { c:2, desc:'Core Theory'                    },
      { c:3, desc:'Extended Theory'                },
      { c:4, desc:'Coursework / Alternative'       },
      { c:5, desc:'Practical Test'                 },
      { c:6, desc:'Alternative to Practical'       },
    ],
    variants: [1,2,3],
  },
  '0625': {
    name: 'Physics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice'                },
      { c:2, desc:'Core Theory'                    },
      { c:3, desc:'Extended Theory'                },
      { c:4, desc:'Coursework / Alternative'       },
      { c:5, desc:'Practical Test'                 },
      { c:6, desc:'Alternative to Practical'       },
    ],
    variants: [1,2,3],
  },
  '0580': {
    name: 'Mathematics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Core (Short Answer)' },
      { c:2, desc:'Extended (Short Answer)' },
      { c:3, desc:'Core (Structured)' },
      { c:4, desc:'Extended (Structured)' },
    ],
    variants: [1,2,3],
  },
  '0606': {
    name: 'Additional Mathematics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1' },
      { c:2, desc:'Paper 2' },
    ],
    variants: [1,2,3],
  },
  '0478': {
    name: 'Computer Science',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Theory' },
      { c:2, desc:'Paper 2 — Problem Solving & Programming' },
    ],
    variants: [1,2,3],
  },
  '0455': {
    name: 'Economics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice' },
      { c:2, desc:'Structured Questions' },
    ],
    variants: [1,2,3],
  },
  '0452': {
    name: 'Accounting',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice' },
      { c:2, desc:'Structured Questions' },
    ],
    variants: [1,2,3],
  },
  '0450': {
    name: 'Business Studies',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Short Answer & Data Response' },
      { c:2, desc:'Case Study' },
    ],
    variants: [1,2,3],
  },
  '0417': {
    name: 'ICT',
    sessions: ['s','w'],
    papers: [
      { c:1, desc:'Written Paper' },
      { c:2, desc:'Practical Test' },
      { c:3, desc:'Practical Test' },
    ],
    variants: [1,2,3],
  },
  '0448': {
    name: 'Travel and Tourism',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Core' },
      { c:2, desc:'Paper 2 — Options' },
    ],
    variants: [1,2,3],
  },
  '0500': {
    name: 'First Language English',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Reading' },
      { c:2, desc:'Writing' },
    ],
    variants: [1,2,3],
  },
  '0510': {
    name: 'English as a Second Language',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Reading & Writing' },
      { c:2, desc:'Listening' },
      { c:3, desc:'Speaking' },
    ],
    variants: [1,2,3],
  },
  '0520': {
    name: 'French',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Listening' },
      { c:2, desc:'Reading & Directed Writing' },
      { c:3, desc:'Speaking' },
      { c:4, desc:'Writing' },
    ],
    variants: [1,2,3],
  },
  '0549': {
    name: 'Hindi as a Second Language',
    sessions: ['s','w'],
    papers: [
      { c:1, desc:'Reading & Writing' },
      { c:2, desc:'Listening' },
    ],
    variants: [1,2],
  },
  '0457': {
    name: 'Global Perspectives',
    sessions: ['s','w'],
    papers: [
      { c:1, desc:'Written Examination' },
    ],
    variants: [1,2,3],
  },
  '0470': {
    name: 'History',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Core Content' },
      { c:2, desc:'Depth Studies' },
      { c:4, desc:'Alternative to Coursework' },
    ],
    variants: [1,2,3],
  },
  '0460': {
    name: 'Geography',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Geographical Themes' },
      { c:2, desc:'Geographical Skills' },
      { c:4, desc:'Alternative to Coursework' },
    ],
    variants: [1,2,3],
  },
  '0490': {
    name: 'Religious Studies',
    sessions: ['s','w'],
    papers: [
      { c:1, desc:'Paper 1' },
      { c:2, desc:'Paper 2' },
    ],
    variants: [1,2,3],
  },
};

// ── A-Level subject definitions ───────────────────────────────────────────────
const ALEVEL = {
  '9700': {
    name: 'Biology',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice (40 questions, 1h15m)', mcq:true  },
      { c:2, desc:'AS Level Structured Questions (1h15m)'            },
      { c:3, desc:'Advanced Practical Skills (2h)'                   },
      { c:4, desc:'A Level Structured Questions (2h)'                },
      { c:5, desc:'Planning, Analysis and Evaluation (1h15m)'        },
    ],
    variants: [1,2,3],
  },
  '9701': {
    name: 'Chemistry',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice (40 questions, 1h15m)', mcq:true  },
      { c:2, desc:'AS Level Structured Questions (1h15m)'            },
      { c:3, desc:'Advanced Practical Skills (2h)'                   },
      { c:4, desc:'A Level Structured Questions (2h)'                },
      { c:5, desc:'Planning, Analysis and Evaluation (1h15m)'        },
    ],
    variants: [1,2,3],
  },
  '9702': {
    name: 'Physics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice (40 questions, 1h15m)', mcq:true  },
      { c:2, desc:'AS Level Structured Questions (1h15m)'            },
      { c:3, desc:'Advanced Practical Skills (2h)'                   },
      { c:4, desc:'A Level Structured Questions (2h)'                },
      { c:5, desc:'Planning, Analysis and Evaluation (1h15m)'        },
    ],
    variants: [1,2,3],
  },
  '9709': {
    name: 'Mathematics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Pure Mathematics 1 (AS, 1h50m)' },
      { c:2, desc:'Paper 2 — Pure Mathematics 2 (AS, 1h15m)' },
      { c:3, desc:'Paper 3 — Pure Mathematics 3 (A2, 1h50m)' },
      { c:4, desc:'Paper 4 — Mechanics (AS, 1h15m)' },
      { c:5, desc:'Paper 5 — Probability & Statistics 1 (1h15m)' },
      { c:6, desc:'Paper 6 — Probability & Statistics 2 (1h15m)' },
      { c:7, desc:'Paper 7 — Further Mechanics (1h15m)' },
    ],
    variants: [1,2,3],
  },
  '9231': {
    name: 'Further Mathematics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Further Pure Mathematics 1 (2h)' },
      { c:2, desc:'Paper 2 — Further Pure Mathematics 2 (2h)' },
      { c:3, desc:'Paper 3 — Further Statistics (1h15m)' },
      { c:4, desc:'Paper 4 — Further Mechanics (1h15m)' },
    ],
    variants: [1,2,3],
  },
  '9608': {
    name: 'Computer Science (9608)',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Theory Fundamentals (1h45m)' },
      { c:2, desc:'Paper 2 — Fundamental Problem-solving & Programming (1h45m)' },
      { c:3, desc:'Paper 3 — Further Problem-solving & Programming (1h45m)' },
    ],
    variants: [1,2,3],
  },
  '9618': {
    name: 'Computer Science (9618)',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Theory Fundamentals (1h30m)' },
      { c:2, desc:'Paper 2 — Fundamental Problem-solving & Programming (1h30m)' },
      { c:3, desc:'Paper 3 — Advanced Theory (1h30m)' },
    ],
    variants: [1,2,3],
  },
  '9609': {
    name: 'Business',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Short Answer & Essay (AS, 1h30m)' },
      { c:2, desc:'Paper 2 — Data Response (AS, 1h30m)' },
      { c:3, desc:'Paper 3 — Case Study (A2, 3h)' },
    ],
    variants: [1,2,3],
  },
  '9708': {
    name: 'Economics',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Multiple Choice AS (30 questions, 1h)', mcq:true },
      { c:2, desc:'Paper 2 — Data Response & Essay AS (2h)'                   },
      { c:3, desc:'Paper 3 — Multiple Choice A2 (30 questions, 1h)', mcq:true },
      { c:4, desc:'Paper 4 — Data Response & Essay A2 (2h15m)'                },
    ],
    variants: [1,2,3],
  },
  '9706': {
    name: 'Accounting',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Multiple Choice (30 questions, 1h)', mcq:true },
      { c:2, desc:'Paper 2 — Structured Questions AS (1h30m)'               },
      { c:3, desc:'Paper 3 — Structured Questions A2 (3h)'                  },
    ],
    variants: [1,2,3],
  },
  '9093': {
    name: 'English Language',
    sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Reading (2h15m)' },
      { c:2, desc:'Paper 2 — Writing (2h)' },
      { c:3, desc:'Paper 3 — Text Analysis (2h15m)' },
      { c:4, desc:'Paper 4 — Language Topics (2h)' },
    ],
    variants: [1,2,3],
  },
  '8021': {
    name: 'English General Paper',
    sessions: ['s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Essay (1h45m)' },
      { c:2, desc:'Paper 2 — Comprehension (1h45m)' },
    ],
    variants: [1,2,3],
  },
};

function generateStubs(subjects) {
  let created = 0, skipped = 0;

  for (const [code, s] of Object.entries(subjects)) {
    for (const yr of YEARS) {
      const year = 2000 + parseInt(yr);
      for (const sess of s.sessions) {
        for (const paper of s.papers) {
          for (const variant of s.variants) {
            const paperId  = `${code}_${sess}${yr}_qp_${paper.c}${variant}`;
            const filePath = path.join(PAPERS_DIR, `${paperId}.json`);

            // NEVER overwrite a properly-parsed (non-stub) JSON
            if (fs.existsSync(filePath)) {
              try {
                const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (!existing.viewOnly) { skipped++; continue; }
              } catch {
                // corrupt JSON — overwrite with stub
              }
              skipped++;
              continue;
            }

            const stub = {
              paperId,
              paperName: `${s.name} ${year} ${SEASON_NAMES[sess]} Paper ${paper.c}`,
              subject:        s.name,
              subjectCode:    code,
              year,
              session:        sess,
              component:      paper.c,
              variant,
              totalQuestions: 0,
              viewOnly:       true,
              isMcqPaper:     paper.mcq || false,
              questions:      [{ viewOnly: true }],
            };

            fs.writeFileSync(filePath, JSON.stringify(stub, null, 2));
            created++;
          }
        }
      }
    }
  }
  return { created, skipped };
}

console.log('Generating missing IGCSE view-only stubs...');
const igcse = generateStubs(IGCSE);
console.log(`  IGCSE:   Created ${igcse.created}, Skipped ${igcse.skipped}`);

console.log('Generating missing A-Level view-only stubs...');
const alevel = generateStubs(ALEVEL);
console.log(`  A-Level: Created ${alevel.created}, Skipped ${alevel.skipped}`);

console.log(`\nDone! Total created: ${igcse.created + alevel.created}`);
console.log('\nNext steps:');
console.log('  node scripts/generate-papers-manifest.js');
console.log('  node scripts/generate-alevels-manifest.js');
