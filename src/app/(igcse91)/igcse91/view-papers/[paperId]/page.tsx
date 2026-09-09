'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ViewPastPapersPDFMode } from '@/components/past-papers/ViewPastPapersPDFMode';
import BackButton from '@/components/BackButton';

interface PageProps {
  params: Promise<{ paperId: string }>;
}

const SUBJECT_MAP: { [key: string]: string } = {
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
};

const SEASON_MAP: { [key: string]: string } = { m: 'February/March', s: 'May/June', w: 'October/November' };

export default function ViewPapersPageIGCSE91({ params }: PageProps) {
  const router = useRouter();
  const { paperId } = use(params);

  const match = paperId.match(/(\d{4})_([msw])(\d{2})_qp_(\d)(\d)/);
  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Paper ID</h2>
          <button onClick={() => router.push('/igcse91/practice')} className="px-6 py-3 bg-blue-500 text-white rounded-lg">Back to Practice</button>
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
        onExit={() => router.push('/igcse91/practice')}
        resources={[]}
        showCalculator={['0980','0985'].includes(code)}
      />
    </>
  );
}
