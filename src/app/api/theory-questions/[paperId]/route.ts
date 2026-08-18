import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const { paperId } = await params;

  // Basic sanity-check on the ID
  if (!/^\d{4}_[msw]\d{2}_qp_\d{2}$/.test(paperId)) {
    return NextResponse.json({ error: 'Invalid paper ID format' }, { status: 400 });
  }

  try {
    const filePath = join(process.cwd(), 'public', 'theory-questions', `${paperId}.json`);
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Theory questions not found for this paper', paperId },
      { status: 404 }
    );
  }
}

// Made with Bob
