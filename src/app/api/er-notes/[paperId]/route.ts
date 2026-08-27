import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params;

    const match = paperId.match(/(\d{4})_([msw]\d{2})_qp_(\d)(\d)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid paper ID format' }, { status: 400 });
    }

    const [, subjectCode, sessionYear, component, variant] = match;
    const componentCode = `${component}${variant}`;

    const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

    const tryFile = (filePath: string) => {
      if (!fs.existsSync(filePath)) return null;
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data.notes) {
        return { notes: data.notes, labels: data.labels ?? {}, pages: data.pages ?? {} };
      }
      return { notes: data, labels: {}, pages: {} };
    };

    // Try component-specific file first: 0417_m20_er_12.json
    const specificPath = path.join(process.cwd(), 'public', 'er-cache',
      `${subjectCode}_${sessionYear}_er_${componentCode}.json`);
    const specific = tryFile(specificPath);
    if (specific) return NextResponse.json(specific, { headers });

    // Fallback to general file: 0417_m20_er_notes.json
    const generalPath = path.join(process.cwd(), 'public', 'er-cache',
      `${subjectCode}_${sessionYear}_er_notes.json`);
    const general = tryFile(generalPath);
    if (general) return NextResponse.json(general, { headers });

    return NextResponse.json({ notes: {}, labels: {}, pages: {}, erFileExists: false }, { headers });

  } catch (error) {
    console.error('Error fetching ER notes:', error);
    return NextResponse.json({ error: 'Failed to fetch ER notes' }, { status: 500 });
  }
}

// Made with Bob
