import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

const IGCSE_ARCHIVE    = 'https://archive.org/download/student-archive-igcse-pastpapers';
const IGCSE91_ARCHIVE  = 'https://archive.org/download/student-archive-igcse91-pastpapers';
const ALEVELS_ARCHIVE  = 'https://archive.org/download/student-archive-alevels-pastpapers';
const OLEVEL_ARCHIVE   = 'https://archive.org/download/student-archive-olevel-pastpapers';

// A-level subject codes (9xxx / 8xxx)
const ALEVEL_PREFIXES = [
  '9700_', '9701_', '9702_',
  '9709_', '9231_',
  '9608_', '9618_', '9691_',
  '9609_', '9708_', '9706_', '9707_',
  '9093_', '8021_',
  '9489_', '9084_', '9699_', '9698_', '9990_',
  '9607_', '9713_', '9488_',
];

// IGCSE (9-1) subject codes — newer graded syllabus
const IGCSE91_PREFIXES = [
  '0970_', '0971_', '0972_', '0973_',
  '0976_', '0977_', '0978_', '0980_',
  '0984_', '0985_', '0986_', '0987_',
  '0989_', '0990_', '0992_', '0994_', '0995_',
  '7184_',
];

// O-Level subject codes (1xxx–7xxx non-IGCSE)
const OLEVEL_PREFIXES = [
  '1123_', '2059_', '2210_', '2281_',
  '3204_', '4024_', '4037_', '4040_',
  '5054_', '5070_', '5090_',
  '7010_', '7094_', '7100_', '7110_', '7115_', '7707_',
];

function archiveBaseFor(filename: string): string {
  if (ALEVEL_PREFIXES.some(p => filename.startsWith(p)))  return ALEVELS_ARCHIVE;
  if (IGCSE91_PREFIXES.some(p => filename.startsWith(p))) return IGCSE91_ARCHIVE;
  if (OLEVEL_PREFIXES.some(p => filename.startsWith(p)))  return OLEVEL_ARCHIVE;
  return IGCSE_ARCHIVE;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const filename = resolvedParams.path.join('/');

  // ── Development: serve from local public/pdfs/ ──────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    try {
      const flatPath = join(process.cwd(), 'public', 'pdfs', filename);
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
      // Fall through to archive.org
    }
  }

  // ── Production: proxy from archive.org (avoids browser CORS restrictions) ─
  try {
    const archiveUrl = `${archiveBaseFor(filename)}/${filename}`;
    const pdfRes = await fetch(archiveUrl, {
      headers: { 'User-Agent': 'StudentArchive-PDF-Proxy/1.0' },
    });

    if (!pdfRes.ok) {
      console.error(`[PDF proxy] archive.org returned ${pdfRes.status} for ${filename}`);
      return new NextResponse('PDF not found', { status: 404 });
    }

    return new NextResponse(pdfRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[PDF proxy] error:', error);
    return new NextResponse('PDF not found', { status: 404 });
  }
}
