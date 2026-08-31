'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ViewPastPapersPDFMode } from '@/components/past-papers/ViewPastPapersPDFMode';
import type { Resource } from '@/components/past-papers/ViewPastPapersPDFMode';
import BackButton from '@/components/BackButton';

interface PageProps {
  params: Promise<{
    paperId: string;
  }>;
}

// Subject code mapping
const SUBJECT_MAP: { [key: string]: string } = {
  '0417': 'Information and Communication Technology',
  '0450': 'Business Studies',
  '0452': 'Accounting',
  '0455': 'Economics',
  '0457': 'Global Perspectives',
  '0500': 'First Language English',
  '0520': 'French - Foreign Language',
  '0549': 'Hindi as a Second Language',
  '0580': 'Mathematics',
  '0606': 'Additional Mathematics',
  '0610': 'Biology',
  '0620': 'Chemistry',
  '0625': 'Physics'
};

// Season code mapping
const SEASON_MAP: { [key: string]: string } = {
  'm': 'February/March',
  's': 'May/June',
  'w': 'October/November'
};

function getResources(code: string, comp: string): Resource[] {
  if (code === '0620') {
    const resources: Resource[] = [
      { label: 'Periodic Table', src: '/resources/periodic-table-igcse.html', type: 'html', accent: 'teal' },
    ];
    if (comp === '6') {
      resources.push({ label: 'Qualitative Analysis', src: '/resources/chem-igcse-qualitative-analysis.html', type: 'html', accent: 'blue' });
    }
    return resources;
  }
  return [];
}

export default function ViewPapersPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  // Parse paper ID: 0610_m20_qp_22
  const parsePaperId = (paperId: string) => {
    const match = paperId.match(/(\d{4})_([msw])(\d{2})_qp_(\d)(\d)/);
    if (!match) {
      return null;
    }

    const [, code, seasonCode, yearShort, component, variant] = match;
    const year = 2000 + parseInt(yearShort);
    const season = SEASON_MAP[seasonCode] || seasonCode;
    const subjectName = SUBJECT_MAP[code] || `Subject ${code}`;

    return {
      subjectCode: code,
      subjectName,
      displayName: `${season} ${year} Paper ${component} Variant ${variant}`,
      year,
      season,
      paperComponent: parseInt(component),
      variant: parseInt(variant)
    };
  };

  const paperInfo = parsePaperId(resolvedParams.paperId);

  const handleExit = () => {
    router.push('/igcse/practice');
  };

  if (!paperInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <svg className="w-20 h-20 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Invalid Paper ID
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The paper ID format is not recognized.
          </p>
          <button
            onClick={handleExit}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BackButton />
      <ViewPastPapersPDFMode
        paperId={resolvedParams.paperId}
        subjectCode={paperInfo.subjectCode}
        subjectName={paperInfo.subjectName}
        displayName={paperInfo.displayName}
        onExit={handleExit}
        resources={getResources(paperInfo.subjectCode, String(paperInfo.paperComponent))}
      />
    </>
  );
}

// Made with Bob