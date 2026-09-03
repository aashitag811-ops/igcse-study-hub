import { NextRequest, NextResponse } from 'next/server';
import { groupPastPaperAssets } from '@/lib/exam/storage-discovery';

/**
 * Lightweight parser endpoint for folder naming scheme shown in Supabase storage.
 * Example: 0417_m25_qp_12.pdf, 0417_m25_ms_12.pdf, 0417_m25_gt.pdf, 0417_m25_er.pdf
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { filenames?: string[] };

  if (!Array.isArray(body.filenames)) {
    return NextResponse.json({ error: 'Expected payload: { filenames: string[] }' }, { status: 400 });
  }

  const papers = groupPastPaperAssets(body.filenames);
  return NextResponse.json({ count: papers.length, papers });
}

// Made with Bob
