'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/')}
      className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg transition-all backdrop-blur-sm border border-zinc-700/50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span className="font-medium">Home</span>
    </button>
  );
}

// Made with Bob
