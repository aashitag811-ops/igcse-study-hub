import { NextResponse } from 'next/server';
import aLevelPapers from '@/lib/data/alevels-papers-manifest';

export async function GET() {
  return NextResponse.json(aLevelPapers);
}
