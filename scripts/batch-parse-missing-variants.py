#!/usr/bin/env python3
"""
Batch parse all 155 MCQ papers that currently have no/broken images.
Only parses papers where the QP PDF exists in scripts/pastpapers/.
Skips papers that already have correct images (all questions have subject imageUrl).
"""
import subprocess
import sys
import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PAPERS_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'papers')
PASTPAPERS_DIR = os.path.join(SCRIPT_DIR, 'pastpapers')

QUESTION_COUNTS = {
    '0610': 40,  # Biology
    '0455': 30,  # Economics
    '0452': 35,  # Accounting
}

NEEDS_PARSE = [
    "0452_m20_qp_11","0452_m20_qp_13","0452_m21_qp_11","0452_m21_qp_13",
    "0452_m22_qp_11","0452_m22_qp_13","0452_m23_qp_11","0452_m23_qp_13",
    "0452_m24_qp_11","0452_m24_qp_13","0452_m25_qp_11","0452_m25_qp_13",
    "0452_s14_qp_11","0452_s14_qp_13","0452_w25_qp_11",
    "0455_s13_qp_11","0455_s13_qp_13","0455_s14_qp_11","0455_s14_qp_13",
    "0455_s15_qp_11","0455_s15_qp_13","0455_s16_qp_11","0455_s16_qp_13",
    "0455_s17_qp_11","0455_s17_qp_13","0455_s18_qp_11","0455_s18_qp_13",
    "0455_s19_qp_11","0455_s19_qp_13","0455_s20_qp_11","0455_s20_qp_13",
    "0455_s21_qp_11","0455_s21_qp_13","0455_s22_qp_11","0455_s22_qp_13",
    "0455_s23_qp_11","0455_s23_qp_13","0455_s24_qp_11","0455_s24_qp_13",
    "0455_s25_qp_11","0455_s25_qp_13","0455_w13_qp_11","0455_w13_qp_13",
    "0455_w14_qp_11","0455_w14_qp_13","0455_w15_qp_11","0455_w15_qp_13",
    "0455_w16_qp_13","0455_w17_qp_11","0455_w17_qp_13","0455_w18_qp_11",
    "0455_w18_qp_13","0455_w19_qp_11","0455_w19_qp_13","0455_w20_qp_11",
    "0455_w20_qp_13","0455_w21_qp_11","0455_w21_qp_13","0455_w22_qp_11",
    "0455_w22_qp_13","0455_w23_qp_11","0455_w23_qp_13","0455_w24_qp_11",
    "0455_w24_qp_13","0455_w25_qp_11","0455_w25_qp_13",
    "0610_s14_qp_11","0610_s14_qp_13","0610_s14_qp_23",
    "0610_s15_qp_11","0610_s15_qp_13",
    "0610_s16_qp_11","0610_s16_qp_13","0610_s16_qp_21","0610_s16_qp_23",
    "0610_s17_qp_11","0610_s17_qp_13","0610_s17_qp_21","0610_s17_qp_23",
    "0610_s18_qp_11","0610_s18_qp_13","0610_s18_qp_21","0610_s18_qp_23",
    "0610_s19_qp_11","0610_s19_qp_13","0610_s19_qp_21","0610_s19_qp_23",
    "0610_s20_qp_11","0610_s20_qp_13","0610_s20_qp_21","0610_s20_qp_23",
    "0610_s21_qp_11","0610_s21_qp_13","0610_s21_qp_21","0610_s21_qp_23",
    "0610_s22_qp_11","0610_s22_qp_13","0610_s22_qp_21","0610_s22_qp_23",
    "0610_s23_qp_11","0610_s23_qp_13","0610_s23_qp_21","0610_s23_qp_23",
    "0610_s24_qp_11","0610_s24_qp_13","0610_s24_qp_21","0610_s24_qp_23",
    "0610_s25_qp_11","0610_s25_qp_13","0610_s25_qp_21","0610_s25_qp_23",
    "0610_w14_qp_11","0610_w14_qp_13",
    "0610_w15_qp_11","0610_w15_qp_13",
    "0610_w16_qp_11","0610_w16_qp_13","0610_w16_qp_21","0610_w16_qp_23",
    "0610_w17_qp_11","0610_w17_qp_13","0610_w17_qp_21","0610_w17_qp_23",
    "0610_w18_qp_11","0610_w18_qp_13","0610_w18_qp_21","0610_w18_qp_23",
    "0610_w19_qp_11","0610_w19_qp_13","0610_w19_qp_21","0610_w19_qp_23",
    "0610_w20_qp_11","0610_w20_qp_13","0610_w20_qp_21","0610_w20_qp_23",
    "0610_w21_qp_11","0610_w21_qp_13","0610_w21_qp_21","0610_w21_qp_23",
    "0610_w22_qp_11","0610_w22_qp_13","0610_w22_qp_21","0610_w22_qp_23",
    "0610_w23_qp_11","0610_w23_qp_13","0610_w23_qp_21","0610_w23_qp_23",
    "0610_w24_qp_11","0610_w24_qp_13","0610_w24_qp_21","0610_w24_qp_23",
    "0610_w25_qp_11","0610_w25_qp_13","0610_w25_qp_21","0610_w25_qp_23",
]

parser = os.path.join(SCRIPT_DIR, 'master-image-mcq-parser.py')
done = 0; skipped = 0; failed = []

for paper_id in NEEDS_PARSE:
    code = paper_id[:4]
    n_questions = QUESTION_COUNTS.get(code, 40)
    qp_pdf = os.path.join(PASTPAPERS_DIR, paper_id + '.pdf')

    if not os.path.exists(qp_pdf):
        print(f"SKIP (no PDF) {paper_id}")
        skipped += 1
        continue

    print(f"[{done+1}/{len(NEEDS_PARSE)}] Parsing {paper_id} ({n_questions}q)...", flush=True)
    REPO_ROOT = os.path.join(SCRIPT_DIR, '..')
    result = subprocess.run(
        [sys.executable, parser, paper_id, '--questions', str(n_questions)],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  OK")
        done += 1
    else:
        print(f"  FAIL: {result.stderr[-200:] if result.stderr else result.stdout[-200:]}")
        failed.append(paper_id)

print(f"\n=== DONE ===")
print(f"Parsed: {done} | Skipped (no PDF): {skipped} | Failed: {len(failed)}")
if failed:
    print("Failed papers:", failed)
