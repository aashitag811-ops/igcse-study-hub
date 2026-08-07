/**
 * assetUrl.ts
 * -----------
 * Single source of truth for all asset URLs (PDFs, MCQ images).
 *
 * In development  → PDFs served via /api/pdfs/ proxy (reads public/pdfs/ locally)
 * In production   → PDFs served via GitHub LFS media URL (public/pdfs/ is excluded
 *                   from Vercel builds via .vercelignore to avoid ENOSPC)
 *                   Override by setting NEXT_PUBLIC_ASSET_BASE_URL to a CDN base URL.
 *
 * Usage:
 *   import { pdfUrl, imageUrl } from '@/lib/assetUrl';
 *
 *   pdfUrl('0610_m20_qp_22')  → "<BASE>/pdfs/0610_m20_qp_22.pdf"
 *   imageUrl('/images/mcq/0610_m20_qp_22_q1_img0.png')
 *                             → "/images/mcq/0610_m20_qp_22_q1_img0.png"
 */

// GitHub LFS media base URL — serves real PDF files directly from LFS storage
const GITHUB_LFS_BASE =
  'https://media.githubusercontent.com/media/aashitag811-ops/igcse-study-hub/31-july';

// Custom CDN override (e.g. Cloudflare R2) — set in Vercel env vars to switch CDN
const _RAW_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '').replace(/\/$/, '');

// Ignore the asset base URL if it points to the known-broken GitHub raw repo
const CUSTOM_BASE = _RAW_BASE.includes('raw.githubusercontent.com') ? '' : _RAW_BASE;

// In production (server or browser), use GitHub LFS if no custom CDN is set
// In development, fall back to the local /api/pdfs/ proxy
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Returns the full URL for a question-paper or marking-scheme PDF.
 * @param paperId  e.g. "0610_m20_qp_22"  (no .pdf extension)
 */
export function pdfUrl(paperId: string): string {
  if (CUSTOM_BASE) {
    return `${CUSTOM_BASE}/pdfs/${paperId}.pdf`;
  }
  if (isProduction) {
    return `${GITHUB_LFS_BASE}/public/pdfs/${paperId}.pdf`;
  }
  // Local dev: use API proxy which reads from public/pdfs/
  return `/pdfs/${paperId}.pdf`;
}

/**
 * Returns the full URL for an MCQ question image.
 * @param path  The path stored in the JSON, e.g. "/images/mcq/0610_m20_qp_22_q1_img0.png"
 *              or a full https:// URL (returned unchanged).
 */
export function imageUrl(path: string): string {
  if (!path) return '';
  // Already absolute — leave it alone
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Images are regular git files (not LFS), served as static assets directly
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean;
}

/**
 * Returns the full URL for any arbitrary public asset path.
 * @param path  e.g. "/papers/0610_m20_qp_22.json"
 */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean;
}
