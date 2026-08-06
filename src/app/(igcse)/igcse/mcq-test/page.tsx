import { redirect } from 'next/navigation';

// /igcse/mcq-test redirects to /igcse/practice
export default async function MCQSelectionDashboard({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.subject) qs.set('subject', params.subject);
  qs.set('mode', params.mode || 'test');
  redirect(`/igcse/practice?${qs.toString()}`);
}
