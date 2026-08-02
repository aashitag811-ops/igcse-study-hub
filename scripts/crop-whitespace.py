"""
crop-whitespace.py
Removes excess white space from MCQ question images:
  1. Crops white margins from top and bottom
  2. Collapses large internal white gaps (e.g. between question stem and options)

Usage:
  python scripts/crop-whitespace.py 0610_s24_qp_22        # single paper
  python scripts/crop-whitespace.py --all                  # all MCQ papers
"""
import sys
import numpy as np
from pathlib import Path
from PIL import Image

IMAGES_DIR = Path("public/images")
SUBJECT_DIRS = {
    "0610": "biology",
    "0620": "chemistry",
    "0625": "physics",
    "0455": "economics",
    "0452": "accounting",
}

WHITE_THRESHOLD = 250   # rows with mean > this = white
EDGE_PADDING    = 6     # px to keep at top and bottom edges
MAX_GAP         = 6     # collapse any internal white run longer than this to this many px


def compact_image(img_path: Path) -> tuple[bool, int, int]:
    """
    Compact the image:
    - Trim white top/bottom margins
    - Collapse long internal white gaps to MAX_GAP px
    Returns (changed, old_height, new_height).
    """
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img)
    row_means = arr.mean(axis=(1, 2))
    h = arr.shape[0]
    w = arr.shape[1]

    # ── 1. Find first / last non-white row ────────────────────────
    non_white = np.where(row_means < WHITE_THRESHOLD)[0]
    if len(non_white) == 0:
        return False, h, h

    first = max(0,  non_white[0]  - EDGE_PADDING)
    last  = min(h,  non_white[-1] + EDGE_PADDING + 1)
    arr   = arr[first:last]
    row_means = row_means[first:last]

    # ── 2. Collapse long internal white gaps ─────────────────────
    # Build list of row bands: (start, end, is_white)
    bands = []
    is_white = row_means[0] >= WHITE_THRESHOLD
    band_start = 0
    for i in range(1, len(row_means)):
        now_white = row_means[i] >= WHITE_THRESHOLD
        if now_white != is_white:
            bands.append((band_start, i, is_white))
            band_start = i
            is_white = now_white
    bands.append((band_start, len(row_means), is_white))

    # Rebuild rows, collapsing white bands > MAX_GAP
    kept_rows = []
    for (start, end, white) in bands:
        band_rows = arr[start:end]
        if white:
            length = end - start
            if length > MAX_GAP:
                # Keep only MAX_GAP rows from this white band
                kept_rows.append(band_rows[:MAX_GAP])
            else:
                kept_rows.append(band_rows)
        else:
            kept_rows.append(band_rows)

    new_arr = np.concatenate(kept_rows, axis=0)
    new_h = new_arr.shape[0]

    if new_h >= h - 1:
        return False, h, new_h  # nothing changed

    new_img = Image.fromarray(new_arr.astype(np.uint8))
    new_img.save(img_path, optimize=True)
    return True, h, new_h


def process_paper(paper_id: str) -> tuple[int, int]:
    """Returns (changed, total)."""
    subject_code = paper_id.split("_")[0]
    subject_name = SUBJECT_DIRS.get(subject_code)
    if not subject_name:
        print(f"  Unknown subject: {subject_code}")
        return 0, 0

    folder = IMAGES_DIR / subject_name / paper_id
    if not folder.exists():
        print(f"  Folder not found: {folder}")
        return 0, 0

    images = sorted(folder.glob("q*.png"), key=lambda p: int(p.stem[1:]))
    changed = 0
    for img_path in images:
        ok, old_h, new_h = compact_image(img_path)
        if ok:
            changed += 1
            print(f"    {img_path.name}: {old_h}px -> {new_h}px (saved {old_h - new_h}px)")

    return changed, len(images)


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python scripts/crop-whitespace.py <paper_id>  OR  --all")
        sys.exit(1)

    if args[0] == "--all":
        total_changed = total_imgs = 0
        for subject_name in SUBJECT_DIRS.values():
            subject_dir = IMAGES_DIR / subject_name
            if not subject_dir.exists():
                continue
            for folder in sorted(subject_dir.iterdir()):
                if not folder.is_dir():
                    continue
                changed, total = process_paper(folder.name)
                if changed:
                    print(f"  {folder.name}: {changed}/{total} compacted")
                total_changed += changed
                total_imgs    += total
        print(f"\nDone. Compacted {total_changed} images out of {total_imgs} total.")
    else:
        paper_id = args[0]
        print(f"Compacting: {paper_id}")
        changed, total = process_paper(paper_id)
        print(f"\nDone. {changed}/{total} images compacted.")


if __name__ == "__main__":
    main()
