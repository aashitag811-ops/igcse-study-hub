'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ViewPastPapersPDFMode } from '@/components/past-papers/ViewPastPapersPDFMode';
import BackButton from '@/components/BackButton';

interface PageProps {
  params: Promise<{ paperId: string }>;
}

const SUBJECT_MAP: { [key: string]: string } = {
  '9700': 'Biology',
  '9701': 'Chemistry',
  '9702': 'Physics',
  '9709': 'Mathematics',
  '9231': 'Further Mathematics',
  '9608': 'Computer Science',
  '9618': 'Computer Science',
  '9609': 'Business',
  '9708': 'Economics',
  '9706': 'Accounting',
  '9093': 'English Language',
  '8021': 'English General Paper',
};

const SEASON_MAP: { [key: string]: string } = {
  'm': 'February/March',
  's': 'May/June',
  'w': 'October/November',
};

// ── Resources (served from /public/resources/) ────────────────────────────────
import type { Resource } from '@/components/past-papers/ViewPastPapersPDFMode';

function getResources(code: string, comp: string): Resource[] {
  if (code === '9701') {
    const resources: Resource[] = [
      { label: 'Periodic Table', src: '/resources/periodic-table.html', type: 'html', accent: 'teal' },
    ];
    // Qualitative analysis notes — Paper 3 only
    if (comp === '3') {
      resources.push({ label: 'Qualitative Analysis', src: '/resources/chem-qualitative-analysis.html', type: 'html', accent: 'blue' });
    }
    return resources;
  }
  return [];
}

export default function ALevelsViewPapersPage({ params }: PageProps) {
  const router           = useRouter();
  const { paperId }      = use(params);

  const m = paperId.match(/^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)$/);
  if (!m) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Paper ID</h2>
          <button onClick={() => router.push('/alevels/practice')} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg">
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  const [, code, sess, yr, comp] = m;
  const subjectName  = SUBJECT_MAP[code] ?? `Subject ${code}`;
  const season       = SEASON_MAP[sess] ?? sess;
  const year         = 2000 + parseInt(yr);
  const displayName  = `${subjectName} — ${season} ${year} Paper ${comp}`;
  const resources    = getResources(code, comp);

  return (
    <div className="min-h-screen" style={{ background: '#03060a' }}>
      <div className="p-4">
        <BackButton />
      </div>
      <ViewPastPapersPDFMode
        paperId={paperId}
        subjectCode={code}
        subjectName={subjectName}
        displayName={displayName}
        resources={resources}
      />
    </div>
  );
}

// Made with Bob
