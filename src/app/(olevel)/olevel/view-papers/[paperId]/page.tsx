'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ViewPastPapersPDFMode } from '@/components/past-papers/ViewPastPapersPDFMode';
import BackButton from '@/components/BackButton';

interface PageProps {
  params: Promise<{ paperId: string }>;
}

const SUBJECT_MAP: { [key: string]: string } = {
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
  '7184': 'Arabic — First Language',
  '7707': 'Accounting',
};

const SEASON_MAP: { [key: string]: string } = { m: 'February/March', s: 'May/June', w: 'October/November' };

const CALC_SUBJECTS = new Set(['4024','4037','4040','2281','2210','7110','7115','7707','5054','5070','5090']);

export default function ViewPapersPageOLevel({ params }: PageProps) {
  const router = useRouter();
  const { paperId } = use(params);

  const match = paperId.match(/(\d{4})_([msw])(\d{2})_qp_(\d)(\d)/);
  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Paper ID</h2>
          <button onClick={() => router.push('/olevel/practice')} className="px-6 py-3 bg-blue-500 text-white rounded-lg">Back to Practice</button>
        </div>
      </div>
    );
  }

  const [, code, seasonCode, yearShort, component] = match;
  const year = 2000 + parseInt(yearShort);
  const season = SEASON_MAP[seasonCode] || seasonCode;
  const subjectName = SUBJECT_MAP[code] || `Subject ${code}`;
  const displayName = `${season} ${year} Paper ${component}`;

  return (
    <>
      <BackButton />
      <ViewPastPapersPDFMode
        paperId={paperId}
        subjectCode={code}
        subjectName={subjectName}
        displayName={displayName}
        onExit={() => router.push('/olevel/practice')}
        resources={[]}
        showCalculator={CALC_SUBJECTS.has(code)}
      />
    </>
  );
}
