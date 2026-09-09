import { Suspense } from 'react';
import PracticeContentIGCSE91 from './components/PracticeContentIGCSE91';

export default function PracticeSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PracticeContentIGCSE91 />
    </Suspense>
  );
}
