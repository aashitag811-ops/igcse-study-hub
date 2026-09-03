import { NextResponse } from 'next/server';
import papers from '@/lib/data/papers-manifest';

export async function GET() {
  return NextResponse.json(papers);
}
