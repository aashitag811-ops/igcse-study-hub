"""
Parse missing variants (11/13/21/23) for Chemistry (0620) and Physics (0625).
Only variant 12 and 22 were previously parsed. This adds 11/13/21/23.
Run from repo root: python scripts/batch-parse-chem-phys-variants.py
"""
import subprocess, sys, os, re
from pathlib import Path

PDF_DIR = Path("scripts/pastpapers")
IMAGES_DIR = Path("public/images")

targets = []
for code, name in [("0620", "chemistry"), ("0625", "physics")]:
    for pdf in sorted(PDF_DIR.glob(f"{code}_*_qp_*.pdf")):
        m = re.match(rf'{code}_([msw])(\d{{2}})_qp_([12])([1-9])\.pdf', pdf.name)
        if not m:
            continue
        sess, yr, comp, var = m.group(1), m.group(2), m.group(3), m.group(4)
        # Only process variants 1 and 3 (we already have variant 2)
        if var not in ('1', '3'):
            continue
        paper_id = f"{code}_{sess}{yr}_qp_{comp}{var}"
        # Skip if already parsed
        img_dir = IMAGES_DIR / name / paper_id
        if img_dir.exists() and len(list(img_dir.glob("*.png"))) >= 38:
            continue
        targets.append((paper_id, name))

print(f"Found {len(targets)} papers to parse")

done, failed = 0, []
for paper_id, name in targets:
    print(f"  {paper_id}...", end=" ", flush=True)
    result = subprocess.run(
        [sys.executable, "scripts/master-image-mcq-parser.py", paper_id, "--questions", "40"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("OK")
        done += 1
    else:
        print(f"FAILED")
        failed.append(paper_id)

print(f"\nDone: {done}/{len(targets)}")
if failed:
    print(f"Failed ({len(failed)}): {failed}")
