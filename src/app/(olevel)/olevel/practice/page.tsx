import { Suspense } from 'react';
import PracticeContentOLevel from './components/PracticeContentOLevel';

export default function PracticeSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PracticeContentOLevel />
    </Suspense>
  );
}
