/**
 * Generates minimal view-only JSON stubs for ALL A-level subjects & papers.
 * Stubs let the manifest include every paper in View Mode before MCQ parsing.
 * Only creates a stub if the corresponding PDF exists in public/pdfs/.
 *
 * Usage: node scripts/generate-view-only-stubs-alevels.js
 */

const fs   = require('fs');
const path = require('path');

const PAPERS_DIR = path.join(__dirname, '../public/papers');
const PDFS_DIR   = path.join(__dirname, '../public/pdfs');
fs.mkdirSync(PAPERS_DIR, { recursive: true });

// ── Accurate A-level paper definitions ───────────────────────────────────────
// mcq:true marks papers that will be replaced by the MCQ parser later.
// Paper 3 for sciences = Advanced Practical Skills (handwritten, NO PDF) → omitted.
// CS Paper 4 = computer-based practical (NO PDF) → omitted.
// GP 8021 only has May/June and Oct/Nov sessions.

const SUBJECTS = {
  '9700': {
    name: 'Biology', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice (40 questions, 1h15m)',    mcq:true  },
      { c:2, desc:'AS Level Structured Questions (1h15m)'              },
      // c:3 = Advanced Practical Skills — no PDF, skip
      { c:4, desc:'A Level Structured Questions (2h)'                  },
      { c:5, desc:'Planning, Analysis and Evaluation (1h15m)'          },
    ],
  },
  '9701': {
    name: 'Chemistry', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice (40 questions, 1h15m)',    mcq:true  },
      { c:2, desc:'AS Level Structured Questions (1h15m)'              },
      { c:4, desc:'A Level Structured Questions (2h)'                  },
      { c:5, desc:'Planning, Analysis and Evaluation (1h15m)'          },
    ],
  },
  '9702': {
    name: 'Physics', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Multiple Choice (40 questions, 1h15m)',    mcq:true  },
      { c:2, desc:'AS Level Structured Questions (1h15m)'              },
      { c:4, desc:'A Level Structured Questions (2h)'                  },
      { c:5, desc:'Planning, Analysis and Evaluation (1h15m)'          },
    ],
  },
  '9709': {
    name: 'Mathematics', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Pure Mathematics 1 (AS, 1h50m)' },
      { c:2, desc:'Paper 2 — Pure Mathematics 2 (AS, 1h15m)' },
      { c:3, desc:'Paper 3 — Pure Mathematics 3 (A2, 1h50m)' },
      { c:4, desc:'Paper 4 — Mechanics (AS, 1h15m)'           },
      { c:5, desc:'Paper 5 — Probability & Statistics 1 (1h15m)' },
      { c:6, desc:'Paper 6 — Probability & Statistics 2 (1h15m)' },
      { c:7, desc:'Paper 7 — Further Mechanics (1h15m)'       },
    ],
  },
  '9231': {
    name: 'Further Mathematics', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Further Pure Mathematics 1 (2h)' },
      { c:2, desc:'Paper 2 — Further Pure Mathematics 2 (2h)' },
      { c:3, desc:'Paper 3 — Further Statistics (1h15m)'      },
      { c:4, desc:'Paper 4 — Further Mechanics (1h15m)'       },
    ],
  },
  // 9608: old CS syllabus (used up to ~2022) — no MCQ paper
  '9608': {
    name: 'Computer Science (9608)', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Theory Fundamentals (1h45m)'    },
      { c:2, desc:'Paper 2 — Fundamental Problem-solving & Programming (1h45m)' },
      { c:3, desc:'Paper 3 — Further Problem-solving & Programming (1h45m)' },
      // c:4 = computer-based practical — no PDF
    ],
  },
  // 9618: new CS syllabus (from 2021) — no MCQ paper
  '9618': {
    name: 'Computer Science (9618)', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Theory Fundamentals (1h30m)'    },
      { c:2, desc:'Paper 2 — Fundamental Problem-solving & Programming (1h30m)' },
      { c:3, desc:'Paper 3 — Advanced Theory (1h30m)'        },
      // c:4 = computer-based practical — no PDF
    ],
  },
  '9609': {
    name: 'Business', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Short Answer & Essay (AS, 1h30m)' },
      { c:2, desc:'Paper 2 — Data Response (AS, 1h30m)'        },
      { c:3, desc:'Paper 3 — Case Study (A2, 3h)'              },
    ],
  },
  '9708': {
    name: 'Economics', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Multiple Choice AS (30 questions, 1h)', mcq:true },
      { c:2, desc:'Paper 2 — Data Response & Essay AS (2h)'                   },
      { c:3, desc:'Paper 3 — Multiple Choice A2 (30 questions, 1h)', mcq:true },
      { c:4, desc:'Paper 4 — Data Response & Essay A2 (2h15m)'                },
    ],
  },
  '9706': {
    name: 'Accounting', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Multiple Choice (30 questions, 1h)', mcq:true },
      { c:2, desc:'Paper 2 — Structured Questions AS (1h30m)'               },
      { c:3, desc:'Paper 3 — Structured Questions A2 (3h)'                  },
    ],
  },
  '9093': {
    name: 'English Language', sessions: ['m','s','w'],
    papers: [
      { c:1, desc:'Paper 1 — Reading (2h15m)'       },
      { c:2, desc:'Paper 2 — Writing (2h)'           },
      { c:3, desc:'Paper 3 — Text Analysis (2h15m)'  },
      { c:4, desc:'Paper 4 — Language Topics (2h)'   },
    ],
  },
  '8021': {
    name: 'English General Paper', sessions: ['s','w'], // no Feb/March for GP
    papers: [
      { c:1, desc:'Paper 1 — Essay (1h45m)'          },
      { c:2, desc:'Paper 2 — Comprehension (1h45m)'  },
    ],
  },
};

const YEAR_RANGE   = Array.from({ length: 16 }, (_, i) => 2010 + i); // 2010–2025
const SEASON_NAMES = { m:'February/March', s:'May/June', w:'October/November' };
const VARIANTS     = [1, 2, 3];

let created = 0, skipped = 0;

for (const [code, subject] of Object.entries(SUBJECTS)) {
  for (const year of YEAR_RANGE) {
    const yy = String(year).slice(-2);
    for (const sess of subject.sessions) {
      for (const paper of subject.papers) {
        for (const variant of VARIANTS) {
          const paperId  = `${code}_${sess}${yy}_qp_${paper.c}${variant}`;
          const filePath = path.join(PAPERS_DIR, `${paperId}.json`);

          // Never overwrite a properly parsed (non-stub) JSON
          if (fs.existsSync(filePath)) {
            const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!existing.viewOnly) { skipped++; continue; }
          }

          // Only create stub when PDF is already on disk
          const pdfPath = path.join(PDFS_DIR, `${paperId}.pdf`);
          if (!fs.existsSync(pdfPath)) { skipped++; continue; }

          const stub = {
            paperId,
            paperName: `${subject.name} ${year} ${SEASON_NAMES[sess]} Paper ${paper.c}`,
            subject:      subject.name,
            subjectCode:  code,
            year,
            session:      sess,
            component:    paper.c,
            variant,
            totalQuestions: 0,
            viewOnly:     true,
            isMcqPaper:   paper.mcq || false,
            questions:    [{ viewOnly: true }],
          };

          fs.writeFileSync(filePath, JSON.stringify(stub, null, 2));
          created++;
        }
      }
    }
  }
}

console.log(`A-level view-only stubs — Done!`);
console.log(`  Created : ${created}`);
console.log(`  Skipped : ${skipped} (no PDF on disk, or already parsed)`);
console.log(`\nNext: node scripts/generate-alevels-manifest.js`);
