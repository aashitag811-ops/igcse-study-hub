"""
patch-pre2016-answers.py
------------------------
Extracts correct answers from pre-2016 Biology/Chemistry/Physics marking scheme PDFs
and patches the existing paper JSON files (which have empty correctAnswer fields).

Subjects: 0610 (Biology), 0620 (Chemistry), 0625 (Physics)
Years: 2010–2015

Usage:
    python scripts/patch-pre2016-answers.py
    python scripts/patch-pre2016-answers.py --dry-run   (show what would change, no writes)
    python scripts/patch-pre2016-answers.py --subject 0610  (one subject only)
"""

import json
import re
import sys
import argparse
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. Run: pip install pymupdf")
    sys.exit(1)

ROOT       = Path(__file__).parent.parent
PDFS_DIR   = ROOT / "public" / "pdfs"
PAPERS_DIR = ROOT / "public" / "papers"

SUBJECTS = ["0610", "0620", "0625"]
PRE2016_YEARS = list(range(2010, 2016))  # 2010–2015 inclusive

def extract_answers_from_ms(pdf_path: Path) -> dict[int, str]:
    """
    Extract MCQ answers from a marking scheme PDF.
    Returns {question_number: 'A'|'B'|'C'|'D'}
    """
    answers = {}
    try:
        doc = fitz.open(str(pdf_path))
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()

        # Pattern 1: "1 B" on its own line (most common Cambridge MS format)
        for m in re.finditer(r'^\s*(\d{1,2})\s+([A-D])\s*$', text, re.MULTILINE):
            q = int(m.group(1))
            if 1 <= q <= 40:
                answers[q] = m.group(2)

        # Pattern 2: two-column table "1 C \n 21 D" (older Cambridge MS format)
        if len(answers) < 10:
            for m in re.finditer(r'\b(\d{1,2})\s+([A-D])\b', text):
                q = int(m.group(1))
                if 1 <= q <= 40 and q not in answers:
                    answers[q] = m.group(2)

    except Exception as e:
        print(f"  ERROR reading {pdf_path.name}: {e}")

    return answers


def patch_paper_json(json_path: Path, answers: dict[int, str], dry_run: bool) -> int:
    """Patch correctAnswer fields in a paper JSON. Returns number of questions patched."""
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    questions = data.get("questions", [])
    patched = 0
    for q in questions:
        qnum = q.get("questionNumber")
        if qnum in answers and not q.get("correctAnswer"):
            q["correctAnswer"] = answers[qnum]
            patched += 1

    if patched > 0 and not dry_run:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    return patched


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--subject", default=None)
    args = parser.parse_args()

    subjects = [args.subject] if args.subject else SUBJECTS
    total_patched = 0
    total_papers  = 0

    for subject in subjects:
        for year in PRE2016_YEARS:
            for session in ["m", "s", "w"]:
                yr = str(year)[2:]  # "2014" → "14"
                # Find all MS PDFs for this subject/year/session
                ms_pattern = f"{subject}_{session}{yr}_ms_*.pdf"
                ms_files = list(PDFS_DIR.glob(ms_pattern))

                for ms_path in ms_files:
                    # Derive variant from MS filename e.g. 0610_s14_ms_12.pdf → variant=12
                    m = re.match(r'(\d{4})_([msw]\d{2})_ms_(\d+)\.pdf', ms_path.name)
                    if not m:
                        continue
                    variant_str = m.group(3)  # e.g. "12"

                    # Find matching QP JSON
                    json_name = f"{subject}_{session}{yr}_qp_{variant_str}.json"
                    json_path = PAPERS_DIR / json_name

                    if not json_path.exists():
                        continue

                    # Check if JSON already has answers
                    with open(json_path, encoding="utf-8") as f:
                        data = json.load(f)
                    questions = data.get("questions", [])
                    already_answered = sum(1 for q in questions if q.get("correctAnswer"))
                    if already_answered == len(questions) and len(questions) > 0:
                        continue  # already fully patched

                    # Extract answers from MS
                    answers = extract_answers_from_ms(ms_path)
                    if not answers:
                        print(f"  SKIP {ms_path.name} — no answers extracted")
                        continue

                    # Patch JSON
                    patched = patch_paper_json(json_path, answers, args.dry_run)
                    status = "DRY-RUN" if args.dry_run else "PATCHED"
                    print(f"  {status}: {json_name} — {patched}/{len(questions)} answers from {ms_path.name}")
                    total_patched += patched
                    total_papers  += 1

    print(f"\nDone. {total_papers} papers processed, {total_patched} answers patched.")
    if args.dry_run:
        print("(dry-run — no files written)")


if __name__ == "__main__":
    main()

# Made with Bob
