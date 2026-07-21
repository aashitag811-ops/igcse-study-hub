/**
 * assetUrl.ts
 * -----------
 * Single source of truth for all asset URLs (PDFs, MCQ images).
 *
 * In development  → assets are served locally from /public/
 * In production   → assets are served from Cloudflare R2 (or any CDN)
 *                   by setting NEXT_PUBLIC_ASSET_BASE_URL in your .env
 *
 * Usage:
 *   import { pdfUrl, imageUrl } from '@/lib/assetUrl';
 *
 *   pdfUrl('0610_m20_qp_22')           → "<BASE>/pdfs/0610_m20_qp_22.pdf"
 *   imageUrl('/images/mcq/0610_m20_qp_22_q1_img0.png')
 *                                      → "<BASE>/images/mcq/0610_m20_qp_22_q1_img0.png"
 */

const BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Returns the full URL for a question-paper or marking-scheme PDF.
 * @param paperId  e.g. "0610_m20_qp_22"  (no .pdf extension)
 */
export function pdfUrl(paperId: string): string {
  return `${BASE}/pdfs/${paperId}.pdf`;
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
  // Strip leading slash so we can join cleanly
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE}/${clean}`;
}

/**
 * Returns the full URL for any arbitrary public asset path.
 * @param path  e.g. "/papers/0610_m20_qp_22.json"
 */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE}/${clean}`;
}
