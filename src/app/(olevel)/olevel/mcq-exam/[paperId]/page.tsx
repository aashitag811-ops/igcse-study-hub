'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ paperId: string }>;
}

export default function OLevelMCQExamPage({ params }: PageProps) {
  const router = useRouter();
  const { paperId } = use(params);

  // MCQ exam component is curriculum-agnostic — redirect to shared exam route
  if (typeof window !== 'undefined') {
    router.replace(`/igcse/mcq-exam/${paperId}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#03060a' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#1a3a5c]/30 border-t-[#1a5a9c] rounded-full animate-spin mx-auto" />
        <p className="text-xs tracking-widest uppercase" style={{ color: '#2a4a6a', fontFamily: 'system-ui' }}>Loading exam...</p>
      </div>
    </div>
  );
}
