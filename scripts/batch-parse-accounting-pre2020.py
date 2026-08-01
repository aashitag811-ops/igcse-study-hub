"""
Batch parse pre-2020 Accounting (0452) Paper 1 MCQ questions.
These papers have the first 10 questions as MCQ embedded in the theory paper.
Run from repo root: python scripts/batch-parse-accounting-pre2020.py
"""
import subprocess, sys, os, re
from pathlib import Path

PDF_DIR = Path("scripts/pastpapers")
PAPERS_DIR = Path("public/papers")

# All pre-2020 accounting Paper 1 variants (component 1 = paper 1x)
pre2020 = []
for pdf in sorted(PDF_DIR.glob("0452_*_qp_1*.pdf")):
    m = re.match(r'0452_([msw])(\d{2})_qp_1(\d)\.pdf', pdf.name)
    if not m:
        continue
    sess, yr, var = m.group(1), int(m.group(2)), m.group(3)
    year = 2000 + yr
    if year >= 2020:
        continue  # skip post-2020 (already done with 35 questions)
    paper_id = f"0452_{sess}{m.group(2)}_qp_1{var}"
    pre2020.append(paper_id)

print(f"Found {len(pre2020)} pre-2020 Accounting Paper 1 papers to parse (10 questions each)")

done = 0
failed = []
for paper_id in pre2020:
    # Skip if already parsed (has real questions, not viewOnly stub)
    json_path = PAPERS_DIR / f"{paper_id}.json"
    if json_path.exists():
        import json
        data = json.loads(json_path.read_text())
        qs = data.get("questions", [])
        if qs and not qs[0].get("viewOnly") and qs[0].get("imageUrl"):
            print(f"  SKIP (already parsed): {paper_id}")
            done += 1
            continue

    print(f"  Parsing: {paper_id} ...", end=" ", flush=True)
    result = subprocess.run(
        [sys.executable, "scripts/master-image-mcq-parser.py", paper_id, "--questions", "10"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("OK")
        done += 1
    else:
        print(f"FAILED: {result.stderr.strip()[-200:]}")
        failed.append(paper_id)

print(f"\nDone: {done}/{len(pre2020)}")
if failed:
    print(f"Failed ({len(failed)}): {failed}")
