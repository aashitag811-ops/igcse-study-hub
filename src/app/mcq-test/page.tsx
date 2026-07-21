import { redirect } from 'next/navigation';

// /mcq-test redirects to /practice which has the full dynamic paper selector
export default async function MCQSelectionDashboard({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.subject) qs.set('subject', params.subject);
  qs.set('mode', params.mode || 'test');
  redirect(`/practice?${qs.toString()}`);
}
