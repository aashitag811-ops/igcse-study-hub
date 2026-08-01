"""
crop-whitespace.py
Removes excess white rows from the bottom (and top) of MCQ question images.
Usage:
  python scripts/crop-whitespace.py 0610_s24_qp_22          # single paper
  python scripts/crop-whitespace.py --all                    # all MCQ papers
"""
import sys
import os
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

# Pixel brightness threshold — rows with mean > this are considered "white"
WHITE_THRESHOLD = 250
# Minimum padding to keep around content (pixels)
PADDING = 12

def crop_image(img_path: Path) -> bool:
    """Crop white margins from top and bottom. Returns True if image was changed."""
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img)

    # Row-wise mean brightness
    row_means = arr.mean(axis=(1, 2))

    # Find first and last non-white row
    non_white = np.where(row_means < WHITE_THRESHOLD)[0]
    if len(non_white) == 0:
        return False  # fully white, skip

    top    = max(0, non_white[0] - PADDING)
    bottom = min(arr.shape[0], non_white[-1] + PADDING + 1)

    # Only save if we're actually trimming something meaningful (>5px)
    if top <= 5 and bottom >= arr.shape[0] - 5:
        return False

    cropped = img.crop((0, top, img.size[0], bottom))
    cropped.save(img_path, optimize=True)
    return True

def process_paper(paper_id: str) -> tuple[int, int]:
    """Returns (changed, total) counts."""
    # Find subject folder
    subject_code = paper_id.split("_")[0]
    subject_name = SUBJECT_DIRS.get(subject_code)
    if not subject_name:
        print(f"  Unknown subject code: {subject_code}")
        return 0, 0

    folder = IMAGES_DIR / subject_name / paper_id
    if not folder.exists():
        print(f"  Folder not found: {folder}")
        return 0, 0

    images = sorted(folder.glob("q*.png"), key=lambda p: int(p.stem[1:]))
    changed = 0
    for img_path in images:
        if crop_image(img_path):
            changed += 1

    return changed, len(images)

def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python scripts/crop-whitespace.py <paper_id>  OR  --all")
        sys.exit(1)

    if args[0] == "--all":
        total_changed = 0
        total_imgs = 0
        for subject_name in SUBJECT_DIRS.values():
            subject_dir = IMAGES_DIR / subject_name
            if not subject_dir.exists():
                continue
            folders = sorted(subject_dir.iterdir())
            for folder in folders:
                if not folder.is_dir():
                    continue
                changed, total = process_paper(folder.name)
                if changed > 0:
                    print(f"  {folder.name}: {changed}/{total} cropped")
                total_changed += changed
                total_imgs += total
        print(f"\nDone. Cropped {total_changed} images out of {total_imgs} total.")
    else:
        paper_id = args[0]
        print(f"Cropping whitespace for: {paper_id}")
        changed, total = process_paper(paper_id)
        print(f"Done. {changed}/{total} images had whitespace removed.")

if __name__ == "__main__":
    main()
