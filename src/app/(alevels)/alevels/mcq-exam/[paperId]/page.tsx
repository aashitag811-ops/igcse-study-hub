'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ paperId: string }>;
}

const SUBJECT_MAP: { [key: string]: string } = {
  '9700': 'Biology',
  '9701': 'Chemistry',
  '9702': 'Physics',
  '9708': 'Economics',
  '9706': 'Accounting',
};

const SEASON_MAP: { [key: string]: string } = {
  'm': 'February/March',
  's': 'May/June',
  'w': 'October/November',
};

export default function ALevelsMCQExamPage({ params }: PageProps) {
  const router      = useRouter();
  const { paperId } = use(params);

  // Reuse the IGCSE MCQ exam page — same component, same JSON format
  // Redirect to the shared MCQ exam route which reads from public/papers/
  if (typeof window !== 'undefined') {
    // The MCQ exam component is curriculum-agnostic — it only needs a paperId
    // pointing to a valid JSON in public/papers/
    router.replace(`/igcse/mcq-exam/${paperId}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#03060a' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#1a3a5c]/30 border-t-[#1a5a9c] rounded-full animate-spin mx-auto" />
        <p className="text-xs tracking-widest uppercase" style={{ color: '#2a4a6a', fontFamily: 'system-ui' }}>
          Loading exam...
        </p>
      </div>
    </div>
  );
}

// Made with Bob
