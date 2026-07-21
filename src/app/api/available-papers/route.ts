import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const manifestPath = join(process.cwd(), 'public', 'papers-manifest.json');
    const raw = await readFile(manifestPath, 'utf-8');
    const papers = JSON.parse(raw);
    return NextResponse.json(papers);
  } catch (error) {
    console.error('Error reading papers manifest:', error);
    return NextResponse.json({ error: 'Failed to load papers manifest' }, { status: 500 });
  }
}
