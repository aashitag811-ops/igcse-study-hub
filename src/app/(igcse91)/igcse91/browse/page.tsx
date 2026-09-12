'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function RedirectBrowse() {
  const router = useRouter();
  const params = useSearchParams();
  const subject = params.get('subject') || '';
  useEffect(() => {
    router.replace(`/igcse/browse${subject ? `?subject=${subject}` : ''}`);
  }, [subject]);
  return null;
}

export default function IGCSE91BrowsePage() {
  return (
    <Suspense fallback={null}>
      <RedirectBrowse />
    </Suspense>
  );
}
