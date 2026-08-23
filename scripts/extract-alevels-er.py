"""
extract-alevels-er.py
----------------------
Downloads A-level ER PDFs from Internet Archive and extracts examiner report
notes into public/er-cache/ JSON files compatible with the IGCSE ER system.

Output format per file (e.g. public/er-cache/9700_s22_er_12.json):
  {
    "notes": { "1": "...", "1a": "...", "general_comments": "...", ... },
    "labels": { "1": "Q 1", "1a": "Q 1. (a)", ... }
  }

Usage:
  python scripts/extract-alevels-er.py                  # all subjects
  python scripts/extract-alevels-er.py 9700             # single subject
  python scripts/extract-alevels-er.py 9700_s22         # single session
"""

import pdfplumber
import json
import re
import os
import sys
import time
import tempfile
import requests
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────────────

ARCHIVE_BASE = "https://archive.org/download/student-archive-alevels-pastpapers"
OUTPUT_DIR   = Path(__file__).parent.parent / "public" / "er-cache"
TEMP_DIR     = Path(tempfile.gettempdir()) / "alevels-er-pdfs"

TOP_EXCLUSION    = 50
BOTTOM_EXCLUSION = 80

# A-level subjects and their paper components that have ER coverage
# Format: { subjectCode: [components] }
ALEVEL_SUBJECTS = {
    "9700": ["11","12","13","21","22","23","31","32","33","41","42","43","51","52","53"],  # Biology
    "9701": ["11","12","13","21","22","23","31","32","33","41","42","43"],  # Chemistry
    "9702": ["11","12","13","21","22","23","31","32","33","41","42","43","51","52","53"],  # Physics
    "9709": ["11","12","13","21","22","23","31","32","33","41","42","43","51","52","53","61","62","63"],  # Maths
    "9231": ["11","12","13","21","22","23","31","32","33","41","42","43"],  # Further Maths
    "9608": ["11","12","13","21","22","23","31","32","33","41","42","43"],  # CS 9608
    "9618": ["11","12","13","21","22","23","31","32","33","41","42","43"],  # CS 9618
    "9609": ["11","12","13","21","22","23","31","32","33"],  # Business
    "9708": ["11","12","13","21","22","23","31","32","33"],  # Economics
    "9706": ["11","12","13","21","22","23","31","32","33"],  # Accounting
    "9093": ["11","12","13","21","22","23","31","32","33"],  # English Language
    "8021": ["11","12","13","21","22","23"],                  # English General Paper
}

NOISE_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over',
    r'Turn over\]',
    r'Cambridge International',
    r'Cambridge A Level',
    r'Cambridge AS',
    r'Page \d+',
    r'^\d+\s*©\s*\d{4}',
    r'^Principal Examiner Report',
    r'^MARK SCHEME',
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def is_noise(text: str) -> bool:
    if not text or len(text.strip()) < 2:
        return True
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def download_pdf(url: str, dest: Path) -> bool:
    """Download a PDF from Archive.org. Returns True on success."""
    if dest.exists():
        return True
    try:
        r = requests.get(url, timeout=30, stream=True)
        if r.status_code != 200:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"    Download error: {e}")
        return False


def extract_full_text(pdf_path: Path) -> str:
    """Extract all text from a PDF with noise filtering."""
    full_text = ""
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                bbox = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                text = cropped.extract_text() or ""
                lines = [l for l in text.split("\n") if not is_noise(l)]
                full_text += "\n".join(lines) + "\n"
    except Exception as e:
        print(f"    PDF read error: {e}")
    return full_text


def find_component_section(full_text: str, subject_code: str, component: str) -> str | None:
    """
    Find the section of the ER PDF text that covers a specific paper component.
    A-level ERs typically have headers like:
      'Paper 1 (9700/11)' or 'Component 11' or 'Paper 11'
    """
    paper_num  = component[0]
    variant_num = component[1]

    patterns = [
        rf'Paper\s+{subject_code}/{component}\b',
        rf'9\d{{3}}/{component}\b',
        rf'Paper\s+{component}\b',
        rf'Component\s+{component}\b',
        rf'Paper\s+{paper_num}\s+Variant\s+{variant_num}\b',
        rf'Paper\s+{paper_num}.*?Variant\s+{variant_num}\b',
    ]

    start_pos = None
    for pat in patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            start_pos = m.start()
            break

    if start_pos is None:
        return None

    # Find where the next component section starts
    end_pos = len(full_text)
    next_component_patterns = [
        r'Paper\s+\d{4}/\d{2}\b',
        r'\d{4}/\d{2}\b',
        r'Paper\s+\d{1,2}\s+Variant\s+\d\b',
        r'Component\s+\d{2}\b',
    ]
    for pat in next_component_patterns:
        m = re.search(pat, full_text[start_pos + 50:], re.IGNORECASE)
        if m:
            candidate = start_pos + 50 + m.start()
            if candidate < end_pos:
                end_pos = candidate

    return full_text[start_pos:end_pos]


def extract_global_sections(full_text: str) -> dict[str, str]:
    """Extract key_messages and general_comments from the ER text."""
    result = {}

    # Key messages / general performance
    km_match = re.search(
        r'(?:key\s+messages?|overall\s+performance|general\s+performance)',
        full_text, re.IGNORECASE
    )
    if km_match:
        section = full_text[km_match.start(): km_match.start() + 1500]
        lines = [l.strip() for l in section.split("\n") if l.strip() and len(l.strip()) > 15 and not is_noise(l)]
        if lines:
            result["key_messages"] = " ".join(lines[:6])

    # General comments
    gc_match = re.search(
        r'(?:general\s+comments?|introduction|overview)',
        full_text, re.IGNORECASE
    )
    if gc_match:
        section = full_text[gc_match.start(): gc_match.start() + 2000]
        lines = [l.strip() for l in section.split("\n") if l.strip() and len(l.strip()) > 15 and not is_noise(l)]
        if lines:
            result["general_comments"] = " ".join(lines[:8])

    return result


def extract_question_notes(section_text: str) -> tuple[dict, dict]:
    """
    Parse question-by-question notes from a component section.
    Returns (notes, labels) dicts.
    """
    notes  = {}
    labels = {}

    # Split on question markers: "Question 1", "1.", "1 " at start of line
    q_pattern = r'(?:^|\n)(?:Question\s+)?(\d{1,2})\s*\n'
    parts = re.split(q_pattern, section_text)

    for i in range(1, len(parts), 2):
        if i + 1 >= len(parts):
            break
        q_num   = parts[i].strip()
        content = parts[i + 1].strip()

        if not q_num.isdigit():
            continue
        q_int = int(q_num)
        if not (1 <= q_int <= 60):
            continue

        lines = [l.strip() for l in content.split("\n") if l.strip() and len(l.strip()) > 10 and not is_noise(l)]
        if not lines:
            continue

        # Check for sub-parts: (a), (b), (i), (ii) etc.
        sub_pattern = r'\(([a-z]+|i{1,3}|iv|vi{0,3}|ix)\)\s+'
        sub_parts   = re.split(sub_pattern, content)

        if len(sub_parts) > 1:
            # Has sub-parts — extract each
            for j in range(1, len(sub_parts), 2):
                sub_label = sub_parts[j].lower()
                sub_text  = sub_parts[j + 1].strip() if j + 1 < len(sub_parts) else ""
                sub_lines = [l.strip() for l in sub_text.split("\n") if l.strip() and len(l.strip()) > 8 and not is_noise(l)]
                if sub_lines:
                    key  = f"{q_int}{sub_label}"
                    note = " ".join(sub_lines)[:1500]
                    notes[key]  = note
                    labels[key] = f"Q {q_int}. ({sub_label})"
        else:
            # No sub-parts — whole question note
            note = " ".join(lines)[:1500]
            key  = str(q_int)
            notes[key]  = note
            labels[key] = f"Q {q_int}"

    return notes, labels


# ── Main ───────────────────────────────────────────────────────────────────────

def process_session(subject_code: str, session: str, components: list[str]):
    """
    Download ER PDF for subject+session from Archive.org and extract notes.
    session format: 's22', 'm20', 'w21'
    """
    er_filename = f"{subject_code}_{session}_er.pdf"
    url         = f"{ARCHIVE_BASE}/{er_filename}"
    local_path  = TEMP_DIR / er_filename

    print(f"  {er_filename} ...", end=" ", flush=True)

    if not download_pdf(url, local_path):
        print("not found")
        return 0

    print("downloaded", end=" ", flush=True)

    full_text = extract_full_text(local_path)
    if not full_text.strip():
        print("(empty text)")
        return 0

    global_sections = extract_global_sections(full_text)
    created = 0

    for component in components:
        out_path = OUTPUT_DIR / f"{subject_code}_{session}_er_{component}.json"
        if out_path.exists():
            continue  # already extracted

        section = find_component_section(full_text, subject_code, component)
        if not section:
            continue

        notes, labels = extract_question_notes(section)
        if not notes:
            continue

        # Merge global sections
        notes.update(global_sections)

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"notes": notes, "labels": labels}, f, indent=2, ensure_ascii=False)

        created += 1

    print(f"→ {created} component files")
    return created


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    # Filter by CLI args
    filter_subject = None
    filter_session  = None
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if "_" in arg:
            parts = arg.split("_")
            filter_subject = parts[0]
            filter_session  = "_".join(parts[1:]) if len(parts) > 1 else None
        else:
            filter_subject = arg

    subjects = {k: v for k, v in ALEVEL_SUBJECTS.items()
                if not filter_subject or k == filter_subject}

    # Generate all sessions: 2010–2025, all three seasons
    years   = range(10, 26)  # 10 → 25
    seasons = ["m", "s", "w"]

    total_files = 0
    for subject_code, components in subjects.items():
        print(f"\n{'='*60}")
        print(f"Subject: {subject_code}")
        print(f"{'='*60}")
        for season in seasons:
            for yr in years:
                session = f"{season}{yr:02d}"
                if filter_session and session != filter_session:
                    continue
                created = process_session(subject_code, session, components)
                total_files += created
                time.sleep(0.3)  # be polite to Archive.org

    print(f"\n{'='*60}")
    print(f"Done. Created {total_files} er-cache JSON files.")
    print(f"Temp PDFs cached in: {TEMP_DIR}")

if __name__ == "__main__":
    main()

# Made with Bob
