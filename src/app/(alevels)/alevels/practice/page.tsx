import { Suspense } from 'react';
import PracticeContentALevels from './components/PracticeContentALevels';

export default function ALevelsPracticeSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PracticeContentALevels />
    </Suspense>
  );
}

// Made with Bob
