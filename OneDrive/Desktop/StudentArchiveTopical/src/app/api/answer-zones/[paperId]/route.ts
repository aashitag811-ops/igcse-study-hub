import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const { paperId } = await params;
  if (!/^\d{4}_[msw]\d{2}_qp_\d{2}$/.test(paperId)) {
    return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
  }
  try {
    const raw = await readFile(
      join(process.cwd(), 'public', 'answer-zones', `${paperId}.json`), 'utf-8'
    );
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: 'Answer zones not found', paperId }, { status: 404 });
  }
}
