'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { TheoryExamInterface } from '@/components/theory-exam/TheoryExamInterface';
import { pdfUrl } from '@/lib/assetUrl';

interface PageProps {
  params: Promise<{
    paperId: string;
  }>;
}

// Subject code mapping
const SUBJECT_MAP: { [key: string]: string } = {
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

export default function TheoryExamPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  // Parse paper ID: 0610_m25_qp_42
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
      displayName: `${season} ${year} Paper ${component}${variant} - Theory`,
      year,
      season,
      paperComponent: parseInt(component),
      variant: parseInt(variant)
    };
  };

  const paperInfo = parsePaperId(resolvedParams.paperId);

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
            onClick={() => router.push('/igcse/mcq-test')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  // Generate PDF URL — resolves to R2 in production, local API proxy in dev
  const resolvedPdfUrl = pdfUrl(resolvedParams.paperId);

  return (
    <TheoryExamInterface
      paperId={resolvedParams.paperId}
      pdfUrl={resolvedPdfUrl}
      subjectName={paperInfo.subjectName}
      displayName={paperInfo.displayName}
    />
  );
}

// Made with Bob