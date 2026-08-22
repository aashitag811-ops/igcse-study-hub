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
  '9608': 'Computer Science (9608)',
  '9618': 'Computer Science (9618)',
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
      />
    </div>
  );
}

// Made with Bob
