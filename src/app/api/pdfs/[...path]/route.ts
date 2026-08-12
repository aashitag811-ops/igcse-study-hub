import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

const GITHUB_OWNER  = 'aashitag811-ops';
const GITHUB_REPO   = 'igcse-study-hub';
const GITHUB_BRANCH = 'production';

/**
 * Gets a signed download URL from GitHub LFS Batch API.
 *
 * Instead of proxying bytes through Vercel (which times out on large PDFs),
 * we resolve the signed URL and redirect the browser to it directly.
 * The browser then downloads straight from GitHub's LFS CDN.
 *
 * Flow:
 *  1. Fetch the LFS pointer via GitHub Contents API → get oid + size
 *  2. Call LFS Batch API → get signed download URL
 *  3. Return a 302 redirect to that URL
 */
async function getLFSDownloadUrl(filename: string, token: string): Promise<string | null> {
  // Step 1: Get the LFS pointer content
  const ptrUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public/pdfs/${filename}?ref=${GITHUB_BRANCH}`;
  const ptrRes = await fetch(ptrUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3.raw',
      'User-Agent': 'StudentArchive-PDF-Proxy/1.0',
    },
  });

  if (!ptrRes.ok) {
    console.error(`[PDF proxy] pointer fetch failed: ${ptrRes.status} for ${filename}`);
    return null;
  }

  const pointer = await ptrRes.text();

  // Parse oid and size from LFS pointer
  const oidMatch  = pointer.match(/oid sha256:([a-f0-9]{64})/);
  const sizeMatch = pointer.match(/size (\d+)/);
  if (!oidMatch || !sizeMatch) {
    // Not an LFS pointer — might be the real file already (edge case)
    console.error('[PDF proxy] not an LFS pointer:', pointer.slice(0, 120));
    return null;
  }

  const oid  = oidMatch[1];
  const size = parseInt(sizeMatch[1], 10);

  // Step 2: Call the Git LFS Batch API to get a signed download URL
  const batchUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git/info/lfs/objects/batch`;
  const batchRes = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.git-lfs+json',
      'Content-Type': 'application/vnd.git-lfs+json',
      'User-Agent': 'StudentArchive-PDF-Proxy/1.0',
    },
    body: JSON.stringify({
      operation: 'download',
      transfers: ['basic'],
      objects: [{ oid, size }],
    }),
  });

  if (!batchRes.ok) {
    console.error(`[PDF proxy] LFS batch failed: ${batchRes.status}`, await batchRes.text());
    return null;
  }

  const batch = await batchRes.json();
  const downloadUrl: string | undefined = batch?.objects?.[0]?.actions?.download?.href;

  if (!downloadUrl) {
    console.error('[PDF proxy] no download URL in batch response:', batch?.objects?.[0]?.error);
    return null;
  }

  return downloadUrl;
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
      // Fall through to LFS redirect
    }
  }

  // ── Production: redirect browser to signed LFS download URL ─────────────
  // Redirect instead of proxying bytes — avoids Vercel's serverless timeout
  // on large PDFs. The browser fetches directly from GitHub's LFS CDN.
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return new NextResponse('GITHUB_TOKEN not configured', { status: 503 });
  }

  try {
    const downloadUrl = await getLFSDownloadUrl(filename, token);

    if (!downloadUrl) {
      return new NextResponse('PDF not found', { status: 404 });
    }

    // Stream bytes back through our proxy — avoids CORS issues from the browser
    // following a 302 redirect directly to the cross-origin GitHub LFS CDN.
    const pdfRes = await fetch(downloadUrl);
    if (!pdfRes.ok) {
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
