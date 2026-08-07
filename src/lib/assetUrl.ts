/**
 * assetUrl.ts
 * -----------
 * Single source of truth for all asset URLs (PDFs, MCQ images).
 *
 * PDFs are served via the /api/pdfs/ proxy route in all environments:
 *   - Dev:  proxy reads from local public/pdfs/
 *   - Prod: proxy fetches from GitHub LFS (server-side, bypasses browser restrictions)
 *
 * Override with NEXT_PUBLIC_ASSET_BASE_URL to use a custom CDN (e.g. Cloudflare R2).
 */

const _RAW_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '').replace(/\/$/, '');
// Ignore if it points to the known-broken GitHub raw URL
const BASE = _RAW_BASE.includes('raw.githubusercontent.com') ? '' : _RAW_BASE;

/**
 * Returns the full URL for a question-paper or marking-scheme PDF.
 * @param paperId  e.g. "0610_m20_qp_22"  (no .pdf extension)
 */
export function pdfUrl(paperId: string): string {
  if (BASE) return `${BASE}/pdfs/${paperId}.pdf`;
  // Use /api/pdfs/ proxy — avoids Next.js static file serving of LFS pointer files
  return `/api/pdfs/${paperId}.pdf`;
}

/**
 * Returns the full URL for an MCQ question image.
 * @param path  e.g. "/images/mcq/0610_m20_qp_22_q1_img0.png"
 */
export function imageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Returns the full URL for any arbitrary public asset path.
 * @param path  e.g. "/papers/0610_m20_qp_22.json"
 */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}
