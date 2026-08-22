"""
A-Level MCQ Parser for Cambridge AS & A Level Papers (2015-2025)

MCQ papers that actually exist (verified against real Cambridge specs):
  9700 Biology      — Paper 1: 40 MCQ, 1h15m, IMAGE-BASED (diagrams, graphs)
  9701 Chemistry    — Paper 1: 40 MCQ, 1h15m, PARTIALLY IMAGE-BASED (formulae)
  9702 Physics      — Paper 1: 40 MCQ, 1h15m, IMAGE-BASED (circuits, graphs)
  9708 Economics    — Paper 1: 30 MCQ, 1h,    TEXT-ONLY
                      Paper 3: 30 MCQ, 1h,    TEXT-ONLY  (A2-level version)
  9706 Accounting   — Paper 1: 30 MCQ, 1h,    TEXT-ONLY

NOT MCQ (do NOT parse with this script):
  9709 / 9231  Mathematics / Further Maths  — all structured calculation papers
  9608 / 9618  Computer Science             — all structured theory papers
  9609         Business                     — all essay/data-response papers
  9093 / 8021  English                      — all reading/writing papers

Usage:
  # Single paper:
  python scripts/parse-alevels-mcq.py public/pdfs/9700_s23_qp_11.pdf

  # Batch — all A-level MCQ papers in a folder:
  python scripts/parse-alevels-mcq.py --batch public/pdfs/

  # Batch — one subject only:
  python scripts/parse-alevels-mcq.py --batch public/pdfs/ --subject 9700

Requirements:
  pip install pdfplumber PyMuPDF Pillow
"""

import re
import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed.  Run: pip install pdfplumber")
    sys.exit(1)

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed.  Run: pip install PyMuPDF")
    sys.exit(1)

# ── A-Level MCQ subject configurations ───────────────────────────────────────
# Only subjects with standalone MCQ question-paper PDFs are listed here.

SUBJECT_CONFIG = {
    # ── Sciences: Paper 1 only = MCQ, 40 questions ───────────────────────────
    "9700": {
        "name": "Biology",
        "mcq_papers": [1],
        "total_questions": {1: 40},
        "time_limit_mins": {1: 75},
        "has_diagrams": True,     # cells, organisms, graphs — image extraction needed
        "image_folder": "9700",
        "note": "A-Level Biology MCQ — similar format to IGCSE 0610 Paper 1",
    },
    "9701": {
        "name": "Chemistry",
        "mcq_papers": [1],
        "total_questions": {1: 40},
        "time_limit_mins": {1: 75},
        "has_diagrams": True,     # structural formulae, apparatus diagrams
        "image_folder": "9701",
        "note": "A-Level Chemistry MCQ — structural formulae may appear as images",
    },
    "9702": {
        "name": "Physics",
        "mcq_papers": [1],
        "total_questions": {1: 40},
        "time_limit_mins": {1: 75},
        "has_diagrams": True,     # circuit diagrams, ray diagrams, graphs
        "image_folder": "9702",
        "note": "A-Level Physics MCQ — circuit/ray diagram images common",
    },
    # ── Economics: TWO MCQ papers ─────────────────────────────────────────────
    # Paper 1 = AS Level MCQ (30q), Paper 3 = A2 Level MCQ (30q)
    # Questions regularly contain supply/demand diagrams, PPC curves, data
    # tables, price/quantity graphs → has_diagrams = True
    "9708": {
        "name": "Economics",
        "mcq_papers": [1, 3],
        "total_questions": {1: 30, 3: 30},
        "time_limit_mins": {1: 60, 3: 60},
        "has_diagrams": True,   # supply/demand curves, PPC diagrams, tables
        "image_folder": "9708",
        "note": "Paper 1 = AS MCQ, Paper 3 = A2 MCQ — both contain diagrams/graphs",
    },
    # ── Accounting: Paper 1 = MCQ, 30 questions ──────────────────────────────
    # Questions regularly contain T-account tables, balance sheet extracts,
    # trial balances, ledger account formats → has_diagrams = True
    "9706": {
        "name": "Accounting",
        "mcq_papers": [1],
        "total_questions": {1: 30},
        "time_limit_mins": {1: 60},
        "has_diagrams": True,   # T-accounts, trial balances, financial tables
        "image_folder": "9706",
        "note": "A-Level Accounting MCQ — tables and ledger extracts appear as images",
    },
}

SESSION_NAMES = {
    "m": "February/March",
    "s": "May/June",
    "w": "October/November",
}

# Text lines to ignore during extraction
FOOTER_PATTERNS = [
    re.compile(r"^\[?Turn over\.?\]?$", re.IGNORECASE),
    re.compile(r"^©\s*(UCLES|Cambridge)", re.IGNORECASE),
    re.compile(r"^\d{4}/\d{1,2}/[A-Z]{1,2}/[A-Z]{1,2}/\d{2}$"),  # paper codes
    re.compile(r"^Permission to reproduce"),
    re.compile(r"^BLANK\s+PAGE$", re.IGNORECASE),
    re.compile(r"^www\.(xtremepapers|papacambridge|cie\.org)"),
    re.compile(r"^For\s+Examiner"),
    re.compile(r"^Do\s+not\s+write"),
    re.compile(r"^\d+\s*$"),           # bare page numbers
    re.compile(r"^Cambridge\s+(International|Assessment)", re.IGNORECASE),
]


def is_footer(line: str) -> bool:
    s = line.strip()
    for p in FOOTER_PATTERNS:
        if p.match(s):
            return True
    return False


# ── Mark scheme parser ────────────────────────────────────────────────────────

def parse_mark_scheme(ms_path: str, total_q: int) -> Dict[int, str]:
    """
    Extract the answer key from a Cambridge A-level MCQ mark scheme PDF.

    Cambridge A-level mark schemes list answers in a table or list, e.g.:
      Question   Answer     Marks
         1          B          1
         2          C          1
    or simply: "1  B" repeated down the page.
    Returns {question_number: 'A'|'B'|'C'|'D'}
    """
    answers: Dict[int, str] = {}

    if not os.path.exists(ms_path):
        print(f"  [MS] Warning: mark scheme not found — {ms_path}")
        return answers

    try:
        with pdfplumber.open(ms_path) as pdf:
            full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as e:
        print(f"  [MS] Could not open mark scheme: {e}")
        return answers

    # Pattern 1: "1  B  1" or "1  B" (table row, possibly with marks column)
    # Matches: start-of-line, 1-2 digit number, whitespace, A/B/C/D, optional rest
    p1 = re.compile(r"^\s*(\d{1,2})\s+([ABCD])(?:\s+\d+)?\s*$", re.MULTILINE)
    for m in p1.finditer(full_text):
        q, a = int(m.group(1)), m.group(2)
        if 1 <= q <= total_q:
            answers[q] = a

    # Pattern 2: "1  B  2  C  3  A …" multiple answers on one line
    if len(answers) < total_q // 2:
        p2 = re.compile(r"\b(\d{1,2})\s+([ABCD])\b")
        for m in p2.finditer(full_text):
            q, a = int(m.group(1)), m.group(2)
            if 1 <= q <= total_q and q not in answers:
                answers[q] = a

    print(f"  [MS] Found {len(answers)}/{total_q} answers")
    return answers


# ── Image extractor ───────────────────────────────────────────────────────────

def extract_images(qp_path: str, paper_code: str, subject_code: str) -> List[Dict]:
    """
    Extract embedded images from an A-level MCQ question paper.
    Skips tiny images (logos, decorative marks < 40×30 px).
    Saves PNGs to public/images/<subject_code>/
    """
    images = []
    image_dir = Path(__file__).parent.parent / "public" / "images" / subject_code
    image_dir.mkdir(parents=True, exist_ok=True)

    try:
        doc = fitz.open(qp_path)
    except Exception as e:
        print(f"  [IMG] Could not open PDF: {e}")
        return images

    seen_xrefs: set = set()

    for page_num, page in enumerate(doc):
        img_list = page.get_images(full=True)
        for img_idx, img in enumerate(img_list):
            xref = img[0]
            if xref in seen_xrefs:
                continue  # deduplicate shared images (e.g. header logos)
            seen_xrefs.add(xref)

            rects = page.get_image_rects(xref)
            if not rects:
                continue
            rect = rects[0]

            w = rect.x1 - rect.x0
            h = rect.y1 - rect.y0
            if w < 40 or h < 30:
                continue  # too small — skip logos/decorations

            try:
                base_image  = doc.extract_image(xref)
                image_bytes = base_image["image"]
            except Exception:
                continue

            fname = f"{paper_code}_p{page_num}_img{img_idx}.png"
            fpath = image_dir / fname
            with open(fpath, "wb") as f:
                f.write(image_bytes)

            images.append({
                "filename": fname,
                "path": f"/images/{subject_code}/{fname}",
                "page": page_num,
                "bbox": {"x0": rect.x0, "y0": rect.y0, "x1": rect.x1, "y1": rect.y1},
                "width": w,
                "height": h,
            })

    doc.close()
    print(f"  [IMG] Extracted {len(images)} images")
    return images


# ── Question text parser ──────────────────────────────────────────────────────

def parse_questions(qp_path: str, total_q: int) -> List[Dict]:
    """
    Parse MCQ questions and their A-D options from the question paper.

    Cambridge A-level MCQ layout:
      <number>   <question text — may span multiple lines>
      A  <option text>
      B  <option text>
      C  <option text>
      D  <option text>

    Returns list of question dicts.
    """
    questions = []

    try:
        with pdfplumber.open(qp_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    full_text += t + "\n"
    except Exception as e:
        print(f"  [QP] Could not open question paper: {e}")
        return questions

    lines = full_text.split("\n")

    # Q number: starts with 1–40 (or 1–30), followed by question text
    q_re  = re.compile(r"^(\d{1,2})\s+(.+)$")
    # Option: starts with A/B/C/D followed by text
    opt_re = re.compile(r"^([ABCD])\s+(.+)$")

    current_q: Optional[Dict] = None
    last_opt: Optional[str]   = None

    for raw in lines:
        line = raw.strip()
        if not line or is_footer(line):
            continue

        # New question?
        qm = q_re.match(line)
        if qm:
            q_num = int(qm.group(1))
            if 1 <= q_num <= total_q:
                if current_q:
                    questions.append(current_q)
                current_q = {
                    "questionNumber": q_num,
                    "questionText":   qm.group(2).strip(),
                    "options":        {},
                    "correctAnswer":  None,
                    "imageUrl":       None,
                }
                last_opt = None
                continue

        # Option line?
        om = opt_re.match(line)
        if om and current_q is not None:
            letter = om.group(1)
            text   = om.group(2).strip()
            current_q["options"][letter] = text
            last_opt = letter
            continue

        # Continuation text
        if current_q is not None:
            if last_opt and last_opt in current_q["options"]:
                current_q["options"][last_opt] += " " + line
            else:
                current_q["questionText"] += " " + line

    if current_q:
        questions.append(current_q)

    print(f"  [QP] Parsed {len(questions)}/{total_q} questions")
    return questions


# ── Image → question assignment ───────────────────────────────────────────────

def assign_images_to_questions(
    questions: List[Dict],
    images: List[Dict],
    qp_path: str,
    total_q: int,
) -> None:
    """
    Assign extracted images to their corresponding questions.

    Strategy: use pdfplumber word coordinates to find where each question
    number sits on the page, then assign each image to the nearest
    question number that appears above it on the same page.
    """
    if not images or not questions:
        return

    # Build question-number → (page, y_top) map
    q_pos: List[Tuple[int, int, float]] = []  # (q_num, page, y)
    try:
        with pdfplumber.open(qp_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                words = page.extract_words() or []
                prev_was_num = False
                for w in words:
                    txt = w["text"].strip()
                    if re.match(r"^\d{1,2}$", txt):
                        n = int(txt)
                        if 1 <= n <= total_q:
                            q_pos.append((n, page_num, float(w["top"])))
    except Exception:
        pass

    if not q_pos:
        return

    for img in images:
        pg     = img["page"]
        img_y0 = img["bbox"]["y0"]

        # Candidates: same page, question y is above image y
        cands = [(qn, pn, y) for (qn, pn, y) in q_pos if pn == pg and y < img_y0]
        if not cands:
            # Try the page before (image on page N, question on page N-1)
            cands = [(qn, pn, y) for (qn, pn, y) in q_pos if pn == pg - 1]

        if not cands:
            continue

        nearest_qn = max(cands, key=lambda x: x[2])[0]

        for q in questions:
            if q["questionNumber"] == nearest_qn and q["imageUrl"] is None:
                q["imageUrl"] = img["path"]
                break


# ── Full single-paper pipeline ────────────────────────────────────────────────

def parse_paper(qp_path: str, output_dir: str = "public/papers") -> Optional[Dict]:
    """
    Parse one A-level MCQ paper end-to-end and write the JSON output.
    Returns the data dict, or None if this paper is not a recognised MCQ paper.
    """
    qp_path    = str(qp_path)
    paper_code = Path(qp_path).stem  # e.g. "9700_s23_qp_11"

    m = re.match(r"^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)$", paper_code)
    if not m:
        print(f"Skip {paper_code} — unrecognised filename pattern")
        return None

    subject_code = m.group(1)
    session_code = m.group(2)
    year         = 2000 + int(m.group(3))
    component    = int(m.group(4))
    variant      = int(m.group(5))

    cfg = SUBJECT_CONFIG.get(subject_code)
    if not cfg:
        # Subject not MCQ-parseable (Maths, CS, Business, English, etc.)
        return None

    if component not in cfg["mcq_papers"]:
        # E.g. Economics Paper 2 or 4 are structured, not MCQ
        return None

    total_q    = cfg["total_questions"][component]
    time_mins  = cfg["time_limit_mins"][component]
    season     = SESSION_NAMES.get(session_code, session_code)

    print(f"\n{'='*60}")
    print(f"Parsing : {paper_code}")
    print(f"Subject : {cfg['name']} ({subject_code})")
    print(f"Session : {season} {year}")
    print(f"Paper   : {component}   Questions: {total_q}   Time: {time_mins} min")
    print(f"{'='*60}")

    # Locate corresponding mark scheme
    ms_code = paper_code.replace("_qp_", "_ms_")
    ms_path = str(Path(qp_path).parent / f"{ms_code}.pdf")

    # Step 1 — mark scheme
    answers = parse_mark_scheme(ms_path, total_q)

    # Step 2 — images (sciences only)
    images: List[Dict] = []
    if cfg["has_diagrams"]:
        images = extract_images(qp_path, paper_code, subject_code)

    # Step 3 — questions
    questions = parse_questions(qp_path, total_q)
    if not questions:
        print(f"  ERROR: No questions extracted — skipping {paper_code}")
        return None

    # Step 4 — assign images
    if images:
        assign_images_to_questions(questions, images, qp_path, total_q)

    # Step 5 — merge answers
    for q in questions:
        q["correctAnswer"] = answers.get(q["questionNumber"])

    # Step 6 — validate + warn
    missing_answers = [q["questionNumber"] for q in questions if not q["correctAnswer"]]
    if missing_answers:
        print(f"  WARN: Missing answers for questions: {missing_answers}")

    if len(questions) < total_q:
        print(f"  WARN: Only {len(questions)}/{total_q} questions parsed — manual check needed")

    # Step 7 — build output (same JSON shape as IGCSE MCQ papers)
    paper_data = {
        "paperId":        paper_code,
        "paperName":      f"{cfg['name']} {year} {season} Paper {component}",
        "subject":        cfg["name"],
        "subjectCode":    subject_code,
        "year":           year,
        "session":        session_code,
        "component":      component,
        "variant":        variant,
        "totalQuestions": total_q,
        "timeLimit":      time_mins,
        "isMcqParsed":    True,
        "questions":      questions,
    }

    out_path = Path(output_dir) / f"{paper_code}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(paper_data, f, indent=2, ensure_ascii=False)

    print(f"\n  ✓ Saved  : {out_path}")
    print(f"  Questions: {len(questions)}/{total_q}")
    print(f"  Answers  : {len(answers)}/{total_q}")
    return paper_data


# ── Batch mode ────────────────────────────────────────────────────────────────

def batch_parse(
    pdfs_dir: str,
    subject_filter: Optional[str] = None,
    output_dir: str = "public/papers",
) -> None:
    """Scan pdfs_dir and parse every eligible A-level MCQ question paper."""

    pdfs_dir = Path(pdfs_dir)
    all_qps  = sorted(pdfs_dir.glob("*_qp_*.pdf"))

    eligible = []
    for qp in all_qps:
        m = re.match(r"^(\d{4})_([msw])(\d{2})_qp_(\d)\d$", qp.stem)
        if not m:
            continue
        code = m.group(1)
        comp = int(m.group(4))
        if code not in SUBJECT_CONFIG:
            continue
        if comp not in SUBJECT_CONFIG[code]["mcq_papers"]:
            continue
        if subject_filter and code != subject_filter:
            continue
        eligible.append(qp)

    print(f"\nFound {len(eligible)} A-level MCQ papers to parse")
    if subject_filter:
        print(f"(subject filter: {subject_filter} — {SUBJECT_CONFIG.get(subject_filter, {}).get('name', '?')})")

    ok = failed = 0
    for qp in eligible:
        try:
            result = parse_paper(str(qp), output_dir)
            if result:
                ok += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ERROR {qp.stem}: {e}")
            import traceback; traceback.print_exc()
            failed += 1

    print(f"\n{'='*60}")
    print(f"Batch done.  Parsed: {ok}  |  Failed/Skipped: {failed}")
    print(f"\nNext steps:")
    print(f"  node scripts/generate-alevels-manifest.js")


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(
        description="Parse Cambridge A-Level MCQ papers into JSON",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
MCQ papers supported:
  9700 Biology      Paper 1  (40q, images)
  9701 Chemistry    Paper 1  (40q, images)
  9702 Physics      Paper 1  (40q, images)
  9708 Economics    Papers 1 & 3  (30q each, text-only)
  9706 Accounting   Paper 1  (30q, text-only)

NOT parsed by this script (no MCQ papers):
  9709 Mathematics, 9231 Further Maths,
  9608/9618 Computer Science, 9609 Business,
  9093 English Language, 8021 General Paper

Examples:
  python scripts/parse-alevels-mcq.py public/pdfs/9700_s23_qp_11.pdf
  python scripts/parse-alevels-mcq.py --batch public/pdfs/
  python scripts/parse-alevels-mcq.py --batch public/pdfs/ --subject 9700
        """,
    )
    ap.add_argument("input", nargs="?",
                    help="Path to a single QP PDF")
    ap.add_argument("--batch", metavar="DIR",
                    help="Parse all MCQ QPs in this folder")
    ap.add_argument("--subject", metavar="CODE",
                    help="Filter batch to one subject (e.g. 9700)")
    ap.add_argument("--output", metavar="DIR", default="public/papers",
                    help="Output directory (default: public/papers)")
    args = ap.parse_args()

    if args.batch:
        batch_parse(args.batch, args.subject, args.output)
    elif args.input:
        result = parse_paper(args.input, args.output)
        if result:
            print(f"\nDone. Run: node scripts/generate-alevels-manifest.js")
        else:
            print(f"\nThis paper is not an A-level MCQ paper — nothing to parse.")
            print(f"Only Papers 1 of 9700/9701/9702, Papers 1&3 of 9708, Paper 1 of 9706 are MCQ.")
    else:
        ap.print_help()
