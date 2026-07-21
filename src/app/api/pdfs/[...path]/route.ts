import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

// Session name mapping (used for legacy nested-folder fallback)
const SESSION_MAP: { [key: string]: string } = {
  'm': 'March',
  's': 'Summer',
  'w': 'Winter'
};

const SUBJECT_MAP: { [key: string]: string } = {
  '0417': '0417-Information and Communication Technology',
  '0450': '0450-Business Studies',
  '0452': '0452-Accounting',
  '0455': '0455-Economics',
  '0457': '0457-Global Perspectives',
  '0500': '0500-First Language English',
  '0520': '0520-French - Foreign Language',
  '0549': '0549-Hindi as a Second Language',
  '0580': '0580-Mathematics',
  '0606': '0606-Additional Mathematics',
  '0610': '0610-Biology',
  '0620': '0620-Chemistry',
  '0625': '0625-Physics'
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.path.join('/');

    // ── Primary path: public/pdfs/<filename> (flat structure) ──────────────
    const flatPath = join(process.cwd(), 'public', 'pdfs', filename);
    try {
      await access(flatPath);
      const pdfBuffer = await readFile(flatPath);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // Not in flat structure — try legacy nested path below
    }

    // ── Fallback: scripts/pastpapers/<nested>/<filename> ───────────────────
    const matchWithVariant = filename.match(/(\d{4})_([msw])(\d{2})_(qp|ms)_(\d)(\d)\.pdf/);
    const matchER          = filename.match(/(\d{4})_([msw])(\d{2})_(er)\.pdf/);

    if (!matchWithVariant && !matchER) {
      return new NextResponse('PDF not found', { status: 404 });
    }

    let subjectCode: string, sessionCode: string, yearShort: string;

    if (matchER) {
      [, subjectCode, sessionCode, yearShort] = matchER;
    } else {
      [, subjectCode, sessionCode, yearShort] = matchWithVariant!;
    }

    const year          = `20${yearShort}`;
    const sessionName   = SESSION_MAP[sessionCode];
    const subjectFolder = SUBJECT_MAP[subjectCode];

    if (!sessionName || !subjectFolder) {
      return new NextResponse('PDF not found', { status: 404 });
    }

    const nestedPath = join(
      process.cwd(), 'scripts', 'pastpapers',
      subjectFolder, year, sessionName, filename
    );

    const pdfBuffer = await readFile(nestedPath);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return new NextResponse('PDF not found', { status: 404 });
  }
}