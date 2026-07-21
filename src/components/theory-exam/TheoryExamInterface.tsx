'use client';

import React from 'react';
import BackButton from '@/components/BackButton';

interface TheoryExamInterfaceProps {
  paperId: string;
  pdfUrl: string;
  subjectName: string;
  displayName: string;
}

export function TheoryExamInterface({
  displayName,
  subjectName,
}: TheoryExamInterfaceProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <BackButton />
      <div className="flex items-center justify-center py-32">
        <div className="text-center max-w-md px-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {displayName}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-2">{subjectName}</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm">
            Interactive theory workspace coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
