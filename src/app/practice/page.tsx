import { Suspense } from 'react';
import PracticeContent from './components/PracticeContent';

export default function PracticeSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PracticeContent />
    </Suspense>
  );
}

// Made with Bob
