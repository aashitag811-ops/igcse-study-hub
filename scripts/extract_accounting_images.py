# -*- coding: utf-8 -*-
"""
extract_accounting_images.py
-----------------------------
Extracts per-question images from Accounting (0452) QP PDFs using PyMuPDF.
Renders each question block as a cropped PNG, saves to public/images/accounting/<paperId>/
and patches the corresponding JSON so imageUrl points to the PNG.

How it works:
  - Renders each page at 2x resolution (150 DPI * 2 = 300 DPI effective)
  - Detects question number boundaries by finding "1 " "2 " etc. in the text layer
  - Crops that vertical slice of the page into a PNG
  - Updates the JSON: imageUrl = "/images/accounting/<paperId>/q<N>.png"
  - Clears questionText and options (now shown as image, not text)

Usage:
    # Single paper
    python scripts/extract_accounting_images.py --paper 0452_m25_qp_12

    # All accounting papers
    python scripts/extract_accounting_images.py --all

    # Dry run (show what would be done)
    python scripts/extract_accounting_images.py --all --dry-run

Requirements: pip install pymupdf  (PyMuPDF, imported as fitz)
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. Run: pip install pymupdf")
    sys.exit(1)

ROOT       = Path(__file__).parent.parent
PDFS_DIR   = ROOT / "public" / "pdfs"
IMAGES_DIR = ROOT / "public" / "images" / "accounting"
PAPERS_DIR = ROOT / "public" / "papers"

# Render at 2x for crisp images
ZOOM   = 2.0
MATRIX = fitz.Matrix(ZOOM, ZOOM)

# Left/right margins to crop (in PDF points, before zoom)
MARGIN_LEFT  = 40
MARGIN_RIGHT = 20

# Minimum question block height in PDF points
MIN_Q_HEIGHT = 60


def get_accounting_papers():
    """Return list of all 0452 QP paper IDs that have PDFs."""
    papers = []
    for f in PDFS_DIR.glob("0452_*_qp_1*.pdf"):
        paper_id = f.stem
        papers.append(paper_id)
    return sorted(papers)


def find_question_boundaries(page):
    """
    Find the Y coordinates of each question number on the page.
    Returns list of (question_number, y_top) sorted by y_top.
    Cambridge MCQ papers have question numbers as standalone integers
    flush left on their own line, e.g. "1 " at x < 80.
    """
    boundaries = []
    blocks = page.get_text("dict")["blocks"]

    for block in blocks:
        if block.get("type") != 0:  # text block
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span["text"].strip()
                x0   = span["origin"][0]
                y0   = span["origin"][1]

                # Question numbers appear at left margin (x < 80)
                # and are standalone integers 1-40
                if x0 < 80 and re.match(r'^\d{1,2}$', text):
                    q_num = int(text)
                    if 1 <= q_num <= 40:
                        boundaries.append((q_num, y0 - 8))  # 8pt padding above

    # Deduplicate: keep first occurrence of each question number
    seen = {}
    for q_num, y in boundaries:
        if q_num not in seen:
            seen[q_num] = y

    return sorted(seen.items(), key=lambda x: x[1])


def render_question_crop(page, y_top, y_bottom):
    """
    Render a vertical slice of a page (y_top to y_bottom) as a PNG bytes.
    Clips to the question area with left/right margins.
    """
    page_width = page.rect.width

    # Build clip rect in PDF points
    clip = fitz.Rect(
        MARGIN_LEFT,
        max(0, y_top),
        page_width - MARGIN_RIGHT,
        min(page.rect.height, y_bottom)
    )

    # Render at ZOOM resolution
    mat = fitz.Matrix(ZOOM, ZOOM)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    return pix.tobytes("png")


def extract_paper_images(paper_id, dry_run=False):
    """
    Extract per-question images for one paper.
    Returns (success, questions_extracted).
    """
    qp_pdf_path = PDFS_DIR / (paper_id + ".pdf")
    json_path   = PAPERS_DIR / (paper_id + ".json")
    out_dir     = IMAGES_DIR / paper_id

    if not qp_pdf_path.exists():
        print("  [X] PDF not found: %s" % qp_pdf_path)
        return False, 0

    if not json_path.exists():
        print("  [X] JSON not found: %s" % json_path)
        return False, 0

    # Load existing JSON to know which question numbers we need
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_q_nums = [q["questionNumber"] for q in data.get("questions", [])]
    if not existing_q_nums:
        print("  [X] No questions in JSON")
        return False, 0

    print("  Need images for questions: %s" % existing_q_nums)

    if dry_run:
        print("  [DRY] Would extract %d images" % len(existing_q_nums))
        return True, len(existing_q_nums)

    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(qp_pdf_path))

    # Collect all question boundaries across all pages
    # Format: {q_num: (page_idx, y_top)}
    all_boundaries = {}
    page_heights   = []

    for page_idx, page in enumerate(doc):
        bounds = find_question_boundaries(page)
        for q_num, y in bounds:
            if q_num not in all_boundaries:
                all_boundaries[q_num] = (page_idx, y)
        page_heights.append(page.rect.height)

    print("  Found question starts: %s" % sorted(all_boundaries.keys()))

    extracted = 0

    for q_num in existing_q_nums:
        out_path = out_dir / ("q%d.png" % q_num)

        if q_num not in all_boundaries:
            print("  [!] Q%d not found in PDF - skipping" % q_num)
            continue

        page_idx, y_top = all_boundaries[q_num]
        page = doc[page_idx]

        # Find the bottom: next question's y on same page, or page bottom
        next_y = page.rect.height - 20  # default: end of page

        # Look for next question on same page
        for other_q, (other_page, other_y) in sorted(all_boundaries.items()):
            if other_page == page_idx and other_y > y_top + MIN_Q_HEIGHT:
                next_y = other_y - 4
                break

        png_bytes = render_question_crop(page, y_top, next_y)

        with open(out_path, "wb") as f:
            f.write(png_bytes)

        extracted += 1

    doc.close()

    if extracted == 0:
        print("  [X] No images extracted")
        return False, 0

    # Patch the JSON: set imageUrl, clear questionText and options
    for q in data["questions"]:
        q_num = q["questionNumber"]
        img_path = "/images/accounting/%s/q%d.png" % (paper_id, q_num)
        q["imageUrl"] = img_path
        q["questionText"] = ""
        q["options"] = []
        q["additionalImages"] = []

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("  [OK] Extracted %d images, JSON patched" % extracted)
    return True, extracted


def main():
    parser = argparse.ArgumentParser(description="Extract Accounting (0452) question images from PDFs")
    parser.add_argument("--paper",   help="Single paper ID e.g. 0452_m25_qp_12")
    parser.add_argument("--all",     action="store_true", help="Process all 0452 QP papers")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without saving")
    args = parser.parse_args()

    if not args.paper and not args.all:
        parser.print_help()
        sys.exit(1)

    papers = [args.paper] if args.paper else get_accounting_papers()

    print("=" * 60)
    print("Accounting Image Extractor (0452)")
    print("%d papers to process" % len(papers))
    if args.dry_run:
        print("MODE: DRY RUN")
    print("=" * 60)

    total_ok  = 0
    total_err = 0

    for paper_id in papers:
        print("\n[>>] %s" % paper_id)
        ok, count = extract_paper_images(paper_id, dry_run=args.dry_run)
        if ok:
            total_ok += 1
        else:
            total_err += 1

    print("\n" + "=" * 60)
    print("Done: %d OK | %d failed" % (total_ok, total_err))
    print("=" * 60)


if __name__ == "__main__":
    main()
