"""
Reparse only the specific broken Accounting papers found by verify-mcq-papers.js.
Run from repo root: python scripts/reparse-broken-accounting.py
"""
import subprocess, sys, json
from pathlib import Path

BROKEN = [
    "0452_m19_qp_12","0452_s19_qp_12","0452_s19_qp_13","0452_w19_qp_11","0452_w19_qp_13",
    "0452_s18_qp_12","0452_s18_qp_13","0452_w18_qp_11","0452_w18_qp_13",
    "0452_s17_qp_12","0452_s17_qp_13",
    "0452_w16_qp_12","0452_w16_qp_13",
    "0452_m15_qp_12",
    "0452_w15_qp_11","0452_w15_qp_12","0452_w15_qp_13",
    "0452_s14_qp_12","0452_w14_qp_13",
    "0452_w13_qp_11","0452_w13_qp_12",
    "0452_w12_qp_11","0452_w12_qp_12","0452_w12_qp_13",
    "0452_w11_qp_11",
]

# w19 and s19 ones with q31 are POST-2020 that have 35 questions - reparse with 35
POST_2020_BROKEN = ["0452_w19_qp_11", "0452_w19_qp_13"]

print(f"Reparsing {len(BROKEN)} broken papers...")
done, failed = 0, []

for paper_id in BROKEN:
    q_count = "35" if paper_id in POST_2020_BROKEN else "10"
    print(f"  {paper_id} ({q_count}q)...", end=" ", flush=True)
    result = subprocess.run(
        [sys.executable, "scripts/master-image-mcq-parser.py", paper_id, "--questions", q_count],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("OK")
        done += 1
    else:
        print(f"FAILED: {result.stderr.strip()[-200:]}")
        failed.append(paper_id)

print(f"\nDone: {done}/{len(BROKEN)}")
if failed:
    print(f"Failed: {failed}")
