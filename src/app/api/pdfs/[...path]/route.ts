import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

const ARCHIVE_BASE = 'https://archive.org/download/student-archive-igcse-pastpapers';

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
    const archiveUrl = `${ARCHIVE_BASE}/${filename}`;
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
