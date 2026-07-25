#!/usr/bin/env python3
"""
Batch re-parser for all MCQ papers that have PDFs in scripts/pastpapers/
Runs master-image-mcq-parser.py for each paper
"""
import os, subprocess, sys
from pathlib import Path

# MCQ papers only — actual multiple choice question papers
#
# Biology/Chemistry/Physics 0610/0620/0625:
#   Paper 1 (component 1) = Core MCQ, 40 questions, variant 2 only (12)
#   Paper 2 (component 2) = Extended MCQ, 40 questions, variant 2 only (22)
#
# Economics 0455:
#   Paper 1 (component 1) = MCQ, 30 questions, variant 2 only (12)
#   Paper 2 = theory/structured essay — NOT MCQ, view mode only
#
# Accounting 0452:
#   Post-2020: Paper 1 = 35 standalone MCQ questions, variants 11/12/13
#   Pre-2020: Paper 1 was combined with theory (mixed format) — view mode only, don't re-parse
#
# 0580/0606/0500/0549/0520/0417/0457 — NO MCQ papers at all

SUBJECTS = {
    "0610": {"sessions": ["m","s","w"], "years": range(10,26), "variants": ["12","22"], "questions": 40},
    "0620": {"sessions": ["m","s","w"], "years": range(10,26), "variants": ["12","22"], "questions": 40},
    "0625": {"sessions": ["m","s","w"], "years": range(10,26), "variants": ["12","22"], "questions": 40},
    "0455": {"sessions": ["m","s","w"], "years": range(10,26), "variants": ["12"],      "questions": 30},
    # Accounting: only post-2020 (year 20+) are pure 35-question MCQ papers
    "0452": {"sessions": ["m","s","w"], "years": range(20,26), "variants": ["11","12","13"], "questions": 35},
}

pastpapers = Path("scripts/pastpapers")
ok = 0
fail = 0
skip = 0

for code, cfg in SUBJECTS.items():
    for sess in cfg["sessions"]:
        for yr in cfg["years"]:
            for v in cfg["variants"]:
                paper_id = f"{code}_{sess}{yr:02d}_qp_{v}"
                qp = pastpapers / f"{paper_id}.pdf"
                
                if not qp.exists():
                    skip += 1
                    continue
                
                # Check if already correctly parsed (has imageUrl, not mixed)
                json_path = Path(f"public/papers/{paper_id}.json")
                if json_path.exists():
                    import json
                    try:
                        d = json.loads(json_path.read_text(encoding='utf-8'))
                        qs = d.get('questions', [])
                        if qs and qs[0].get('imageUrl') and '/images/mcq/' not in qs[0]['imageUrl']:
                            skip += 1
                            continue  # Already good
                    except:
                        pass
                
                print(f"\n--- Parsing {paper_id} ---")
                result = subprocess.run(
                    [sys.executable, "scripts/master-image-mcq-parser.py", paper_id,
                     "--questions", str(cfg["questions"])],
                    capture_output=True, text=True, timeout=180
                )
                
                if result.returncode == 0:
                    print(f"OK: {paper_id}")
                    ok += 1
                else:
                    print(f"FAIL: {paper_id}")
                    print(result.stderr[-500:] if result.stderr else result.stdout[-500:])
                    fail += 1

print(f"\n=== DONE === OK:{ok} FAIL:{fail} SKIP:{skip}")
