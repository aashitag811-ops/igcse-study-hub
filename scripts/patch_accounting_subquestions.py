# -*- coding: utf-8 -*-
"""
patch_accounting_subquestions.py
---------------------------------
Re-parses Accounting (0452) papers that use the sub-question format:
  "1 (a) ... A ... B ... C ... D"  through  "1 (j) ..."

These papers have exactly 10 MCQ sub-questions (a-j) in Section 1.
The existing parser failed on these and stored only 1 malformed entry.

Extracts question text + A/B/C/D options from the QP PDF, then reads
the answer key from the matching MS PDF.

Usage:
    python scripts/patch_accounting_subquestions.py

Requirements:
    pip install pdfplumber
"""

import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

ROOT       = Path(__file__).parent.parent
PAPERS_DIR = ROOT / "public" / "papers"
PDFS_DIR   = ROOT / "public" / "pdfs"

BROKEN_PAPERS = [
    "0452_m15_qp_12", "0452_m19_qp_12", "0452_s14_qp_12",
    "0452_s17_qp_12", "0452_s17_qp_13", "0452_s18_qp_12",
    "0452_s18_qp_13", "0452_s19_qp_12", "0452_s19_qp_13",
    "0452_w11_qp_11", "0452_w12_qp_11", "0452_w12_qp_12",
    "0452_w12_qp_13", "0452_w13_qp_11", "0452_w13_qp_12",
    "0452_w14_qp_13", "0452_w15_qp_11", "0452_w15_qp_12",
    "0452_w15_qp_13", "0452_w16_qp_12", "0452_w16_qp_13",
    "0452_w18_qp_11", "0452_w18_qp_13",
]

SUB_LETTERS = list("abcdefghij")


def get_full_text(pdf_path):
    parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
    return "\n".join(parts)


def clean_text(text):
    """Normalise whitespace and strip trailing noise."""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_qp_subquestions(full_text):
    """
    Parse sub-questions (a) through (j) from QP text.
    Returns list of dicts: {letter, questionText, options}
    """
    questions = []

    # Split on sub-question markers: newline then (a), (b) ... (j)
    # The regex captures the letter then the body up to the next marker
    pattern = re.compile(r'\n\s*\(([a-j])\)\s*')
    parts = pattern.split(full_text)

    # parts layout: [preamble, letter_a, body_a, letter_b, body_b, ...]
    i = 1
    while i < len(parts) - 1:
        sub_letter = parts[i]
        body       = parts[i + 1]
        i += 2

        if sub_letter not in SUB_LETTERS:
            continue

        # Strip page noise
        body = re.sub(r'Page \d+.*?\n', '', body)
        body = re.sub(r'\[Turn over\]', '', body)
        body = re.sub(r'\(c\) UCLES.*?\n', '', body)

        # Try to match A B C D options block
        opt_pat = re.compile(
            r'\bA\s+(.+?)\s+B\s+(.+?)\s+C\s+(.+?)\s+D\s+(.+?)(?:\s*\[1\]|\s*$)',
            re.DOTALL
        )
        m = opt_pat.search(body)

        if m:
            q_text  = clean_text(body[:m.start()])
            options = [
                {"letter": "A", "text": clean_text(m.group(1))},
                {"letter": "B", "text": clean_text(m.group(2))},
                {"letter": "C", "text": clean_text(m.group(3))},
                {"letter": "D", "text": clean_text(m.group(4))},
            ]
        else:
            # Fallback: line-by-line detection
            lines    = [l.strip() for l in body.split('\n') if l.strip()]
            q_lines  = []
            opt_lines = []
            in_opts  = False
            for line in lines:
                if re.match(r'^[ABCD]\s+\S', line):
                    in_opts = True
                if in_opts:
                    opt_lines.append(line)
                else:
                    q_lines.append(line)

            if len(opt_lines) >= 4:
                options = []
                for ol in opt_lines[:4]:
                    om = re.match(r'^([ABCD])\s+(.*)', ol)
                    if om:
                        options.append({"letter": om.group(1), "text": om.group(2).strip()})
                q_text = ' '.join(q_lines)
            else:
                print("  [!] Could not parse options for (%s), skipping" % sub_letter)
                continue

        questions.append({
            "letter":       sub_letter,
            "questionText": q_text,
            "options":      options,
        })

    return questions


def parse_ms_answers(ms_text):
    """
    Extract answers from MS text.
    Handles: "1 (a) B", "(a) B", "Mark scheme ... (a) B"
    Returns {"a": "B", "b": "C", ...}
    """
    answers = {}
    for m in re.finditer(r'(?:1\s*)?\(([a-j])\)\s+([ABCD])\b', ms_text):
        answers[m.group(1)] = m.group(2)
    return answers


def build_questions(sub_qs, answers):
    result = []
    for sq in sub_qs:
        letter = sq["letter"]
        q_num  = SUB_LETTERS.index(letter) + 1
        result.append({
            "questionNumber":   q_num,
            "questionText":     sq["questionText"],
            "options":          sq["options"],
            "imageUrl":         None,
            "additionalImages": [],
            "correctAnswer":    answers.get(letter, ""),
        })
    return result


def patch_paper(paper_id):
    json_path = PAPERS_DIR / (paper_id + ".json")
    qp_pdf    = PDFS_DIR   / (paper_id + ".pdf")
    ms_id     = paper_id.replace("_qp_", "_ms_")
    ms_pdf    = PDFS_DIR   / (ms_id + ".pdf")

    if not json_path.exists():
        print("  [X] JSON not found: %s" % json_path)
        return False
    if not qp_pdf.exists():
        print("  [X] QP PDF not found: %s" % qp_pdf)
        return False
    if not ms_pdf.exists():
        print("  [X] MS PDF not found: %s" % ms_pdf)
        return False

    print("\n[>>] %s" % paper_id)

    try:
        qp_text = get_full_text(qp_pdf)
        ms_text = get_full_text(ms_pdf)
    except Exception as e:
        print("  [X] PDF read error: %s" % e)
        return False

    sub_qs  = parse_qp_subquestions(qp_text)
    answers = parse_ms_answers(ms_text)

    if not sub_qs:
        print("  [X] No sub-questions found - format may differ")
        return False

    print("  [+] Parsed %d sub-questions | Answers: %s" % (len(sub_qs), answers))

    questions = build_questions(sub_qs, answers)
    answered  = sum(1 for q in questions if q["correctAnswer"])
    print("  [+] %d/%d have answer keys" % (answered, len(questions)))

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["questions"]      = questions
    data["totalQuestions"] = len(questions)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("  [OK] Saved %d questions" % len(questions))
    return True


def main():
    print("=" * 60)
    print("Accounting Sub-Question Patcher (0452 format 1a-1j)")
    print("=" * 60)

    success = 0
    fail    = 0

    for paper_id in BROKEN_PAPERS:
        ok = patch_paper(paper_id)
        if ok:
            success += 1
        else:
            fail += 1

    print("\n" + "=" * 60)
    print("Done: %d patched | %d failed" % (success, fail))
    print("=" * 60)


if __name__ == "__main__":
    main()
