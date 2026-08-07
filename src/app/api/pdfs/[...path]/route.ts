import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

// GitHub LFS media URL — server-side fetch bypasses browser X-Frame-Options restrictions
const GITHUB_LFS_BASE =
  'https://media.githubusercontent.com/media/aashitag811-ops/igcse-study-hub/31-july';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const filename = resolvedParams.path.join('/');

  // ── Development: serve from local public/pdfs/ ─────────────────────────────
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
      // Fall through to GitHub LFS fetch
    }
  }

  // ── Production: proxy from GitHub LFS (server-side, no browser auth needed) ─
  try {
    const lfsUrl = `${GITHUB_LFS_BASE}/public/pdfs/${filename}`;
    const upstream = await fetch(lfsUrl, {
      headers: { 'User-Agent': 'StudentArchive-PDF-Proxy/1.0' },
    });

    if (!upstream.ok) {
      return new NextResponse('PDF not found', { status: 404 });
    }

    const pdfBuffer = await upstream.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error proxying PDF from GitHub LFS:', error);
    return new NextResponse('PDF not found', { status: 404 });
  }
}
