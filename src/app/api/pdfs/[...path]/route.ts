import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

const GITHUB_OWNER  = 'aashitag811-ops';
const GITHUB_REPO   = 'igcse-study-hub';
const GITHUB_BRANCH = '31-july';

/**
 * Fetches a real LFS file from a private GitHub repo.
 *
 * Flow:
 *  1. Fetch the LFS pointer file via GitHub Contents API to get oid + size
 *  2. Call the Git LFS Batch API to get a signed download URL
 *  3. Download the actual file from that URL
 */
async function fetchLFSFile(filename: string, token: string): Promise<ArrayBuffer | null> {
  // Step 1: Get the LFS pointer content
  const ptrUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public/pdfs/${filename}?ref=${GITHUB_BRANCH}`;
  const ptrRes = await fetch(ptrUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3.raw',
      'User-Agent': 'StudentArchive-PDF-Proxy/1.0',
    },
  });

  if (!ptrRes.ok) return null;

  const pointer = await ptrRes.text();

  // Parse oid and size from LFS pointer
  const oidMatch   = pointer.match(/oid sha256:([a-f0-9]{64})/);
  const sizeMatch  = pointer.match(/size (\d+)/);
  if (!oidMatch || !sizeMatch) return null;

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

  if (!batchRes.ok) return null;

  const batch = await batchRes.json();
  const downloadUrl = batch?.objects?.[0]?.actions?.download?.href;
  const downloadHeaders = batch?.objects?.[0]?.actions?.download?.header ?? {};

  if (!downloadUrl) return null;

  // Step 3: Download the actual file
  const fileRes = await fetch(downloadUrl, { headers: downloadHeaders });
  if (!fileRes.ok) return null;

  return fileRes.arrayBuffer();
}

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
      // Fall through to LFS fetch
    }
  }

  // ── Production: fetch real file via Git LFS Batch API ──────────────────────
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return new NextResponse('GITHUB_TOKEN not configured', { status: 503 });
  }

  try {
    const pdfBuffer = await fetchLFSFile(filename, token);

    if (!pdfBuffer || pdfBuffer.byteLength < 1000) {
      return new NextResponse('PDF not found', { status: 404 });
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',  // Prevent Vercel CDN from caching API responses
      },
    });
  } catch (error) {
    console.error('LFS proxy error:', error);
    return new NextResponse('PDF not found', { status: 404 });
  }
}
