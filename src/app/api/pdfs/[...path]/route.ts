import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

const GITHUB_OWNER = 'aashitag811-ops';
const GITHUB_REPO  = 'igcse-study-hub';
const GITHUB_BRANCH = '31-july';

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
      // Fall through to GitHub API fetch
    }
  }

  // ── Production: fetch via GitHub Contents API (supports auth + LFS) ─────────
  // This endpoint returns the real file content for LFS files when authenticated
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return new NextResponse('GITHUB_TOKEN not configured', { status: 503 });
  }

  try {
    // Step 1: Get the file metadata + download URL via GitHub Contents API
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public/pdfs/${filename}?ref=${GITHUB_BRANCH}`;
    
    const metaRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3.raw',  // Returns raw file content directly
        'User-Agent': 'StudentArchive-PDF-Proxy/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!metaRes.ok) {
      console.error(`GitHub API error: ${metaRes.status} for ${filename}`);
      return new NextResponse('PDF not found', { status: 404 });
    }

    const pdfBuffer = await metaRes.arrayBuffer();

    // Sanity check — if response is tiny it's probably an error JSON, not a PDF
    if (pdfBuffer.byteLength < 1000) {
      const text = new TextDecoder().decode(pdfBuffer);
      console.error(`Unexpected small response for ${filename}:`, text.slice(0, 200));
      return new NextResponse('PDF not found', { status: 404 });
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error proxying PDF:', error);
    return new NextResponse('PDF not found', { status: 404 });
  }
}
