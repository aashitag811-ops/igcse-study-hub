"""
extract-2026-er.py
───────────────────
Extracts Examiner Report notes from 2026 ER PDFs into public/er-cache/
Compatible with both IGCSE (0xxx) and A-level (9xxx/8021) ER PDFs.

Run after upload-2026-to-archive.py so the PDFs are on Archive.org,
OR point it at the local pastpapers-2026/ folder first.

Sources tried in order:
  1. scripts/pastpapers-2026/<code>_<sess>26_er.pdf  (local, from download-2026.js)
  2. Archive.org IGCSE item  (for 0xxx codes)
  3. Archive.org A-level item (for 9xxx/8021 codes)

Output: public/er-cache/<code>_<sess>26_er_<component>.json
  Format: { "notes": {...}, "labels": {...} }

Usage:
    python scripts/extract-2026-er.py            # all subjects
    python scripts/extract-2026-er.py 9700       # single A-level subject
    python scripts/extract-2026-er.py 0610       # single IGCSE subject
    python scripts/extract-2026-er.py igcse      # all IGCSE
    python scripts/extract-2026-er.py alevels    # all A-level
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

# ── Config ────────────────────────────────────────────────────────────────────

ROOT             = Path(__file__).parent.parent
LOCAL_DIR        = Path(__file__).parent / 'pastpapers-2026'
OUTPUT_DIR       = ROOT / 'public' / 'er-cache'
TEMP_DIR         = Path(tempfile.gettempdir()) / '2026-er-pdfs'
IGCSE_ARCHIVE    = 'https://archive.org/download/student-archive-igcse-pastpapers'
ALEVEL_ARCHIVE   = 'https://archive.org/download/student-archive-alevels-pastpapers'

TOP_EXCLUSION    = 50
BOTTOM_EXCLUSION = 80

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ── Subject → paper components that get ER extraction ─────────────────────────
# For each subject: list of component strings to produce separate JSON files

IGCSE_SUBJECTS = {
    '0610': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'],
    '0620': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'],
    '0625': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63'],
    '0580': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '0606': ['11','12','13','21','22','23'],
    '0455': ['11','12','13','21','22','23'],
    '0452': ['11','12','13','21','22','23'],
    '0450': ['11','12','13','21','22','23'],
    '0500': ['11','12','13','21','22','23'],
    '0417': ['11','12','13','21','22','31','32'],
}

ALEVEL_SUBJECTS = {
    '9700': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'],
    '9701': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'],
    '9702': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'],
    '9709': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63','71','72','73'],
    '9231': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '9618': ['11','12','13','21','22','23','31','32','33'],
    '9609': ['11','12','13','21','22','23','31','32','33'],
    '9708': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '9706': ['11','12','13','21','22','23','31','32','33'],
    '9093': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '8021': ['11','12','13','21','22','23'],
}

# Sessions to process for 2026
# Based on availability probe: m26 ER exists for many, s26 ER for others
SESSIONS_BY_SUBJECT = {
    # IGCSE — both sessions have ERs
    '0610': ['m','s'], '0620': ['m','s'], '0625': ['m','s'],
    '0580': ['s'],     '0606': ['m','s'],
    '0455': ['m','s'], '0452': ['m','s'], '0450': ['m','s'],
    '0500': ['m','s'], '0417': ['m','s'],
    # A-level — m26 ERs confirmed for sciences + maths + some commerce
    '9700': ['m','s'], '9701': ['m','s'], '9702': ['m','s'],
    '9709': ['m','s'], '9231': ['s'],
    '9618': ['s'],
    '9609': ['m','s'], '9708': ['m','s'], '9706': ['m','s'],
    '9093': ['m','s'], '8021': ['s'],
}

NOISE_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over', r'Turn over\]',
    r'Cambridge International', r'Cambridge A Level', r'Cambridge AS',
    r'Cambridge IGCSE', r'Page \d+',
    r'^\d+\s*©\s*\d{4}',
    r'^Principal Examiner Report', r'^MARK SCHEME',
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def is_noise(text: str) -> bool:
    if not text or len(text.strip()) < 2:
        return True
    for p in NOISE_PATTERNS:
        if re.search(p, text, re.IGNORECASE):
            return True
    return False


def archive_url(code: str, filename: str) -> str:
    base = ALEVEL_ARCHIVE if code[0] in ('9','8') else IGCSE_ARCHIVE
    return f'{base}/{filename}'


def get_er_pdf(code: str, sess: str) -> Path | None:
    """Return path to ER PDF, trying local first then Archive.org."""
    filename = f'{code}_{sess}26_er.pdf'
    local    = LOCAL_DIR / filename
    if local.exists() and local.stat().st_size > 30_000:
        return local

    # Try archive.org
    cached = TEMP_DIR / filename
    if cached.exists() and cached.stat().st_size > 30_000:
        return cached

    url = archive_url(code, filename)
    print(f'      ↓ {url}')
    try:
        r = requests.get(url, timeout=60, stream=True)
        if r.status_code != 200:
            return None
        with open(cached, 'wb') as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)
        if cached.stat().st_size < 30_000:
            cached.unlink()
            return None
        return cached
    except Exception as e:
        print(f'      ⚠ download failed: {e}')
        return None


def full_text_from_pdf(pdf_path: Path) -> str:
    """Extract all text from a PDF, stripping noise lines."""
    text = ''
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                bbox    = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                raw     = cropped.extract_text() or ''
                lines   = [l for l in raw.split('\n') if not is_noise(l)]
                text   += '\n'.join(lines) + '\n'
    except Exception as e:
        print(f'      ⚠ PDF read error: {e}')
    return text


def find_component_section(full_text: str, code: str, component: str) -> str:
    """Extract the portion of the ER text that covers a specific component."""
    paper_num   = component[0]
    variant_num = component[1]

    patterns = [
        rf'Paper\s+{code}/{component}\b',
        rf'\bPaper\s+{component}\b',
        rf'Component\s+{code}/{component}',
        rf'Paper\s+{paper_num}\s*.*?Variant\s+{variant_num}',
        rf'\bPaper\s+{paper_num}\b.*?variant\s+{variant_num}',
    ]

    for pat in patterns:
        m = re.search(pat, full_text, re.IGNORECASE | re.DOTALL)
        if m:
            start = m.start()
            # Find end: next Paper section or end of document
            next_section = re.search(
                r'\b(?:Paper\s+\d{4}/\d{2}|Paper\s+\d{2}|Component\s+\d{4}/\d{2})\b',
                full_text[start + 20:],
                re.IGNORECASE
            )
            end = (start + 20 + next_section.start()) if next_section else len(full_text)
            return full_text[start:end]

    # Fallback: return full text (single-component ER)
    return full_text


def extract_question_notes(section_text: str) -> tuple[dict, dict]:
    """
    Parse structured question notes from ER section text.
    Returns (notes_dict, labels_dict).
    Keys: "1", "1a", "1ai", "2", etc.
    """
    notes  = {}
    labels = {}

    # Split into lines for processing
    lines = [l.rstrip() for l in section_text.split('\n') if l.strip()]

    # Patterns for question markers
    q_main   = re.compile(r'^(?:Question\s+)?(\d+)[\.\s]*$', re.IGNORECASE)
    q_letter = re.compile(r'^\(([a-z])\)\s*(.*)', re.IGNORECASE)
    q_roman  = re.compile(r'^\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)', re.IGNORECASE)
    gen_head = re.compile(r'^(?:General\s+(?:Comments?|Remarks?))', re.IGNORECASE)

    current_q   = None
    current_sub = None
    current_key = None
    buffer      = []

    def flush():
        if current_key and buffer:
            text = ' '.join(buffer).strip()
            if text:
                notes[current_key]  = text
                labels[current_key] = make_label(current_q, current_sub)

    def make_label(q, sub):
        if not q:    return 'General'
        if not sub:  return f'Q {q}'
        parts = sub.split('_')
        label = f'Q {q}.'
        if parts[0]: label += f' ({parts[0]})'
        if len(parts) > 1 and parts[1]: label += f' ({parts[1]})'
        return label

    for line in lines:
        if gen_head.match(line):
            flush()
            current_q, current_sub, current_key = None, None, 'general_comments'
            labels['general_comments'] = 'General Comments'
            buffer = []
            continue

        m = q_main.match(line)
        if m:
            flush()
            current_q   = m.group(1)
            current_sub = None
            current_key = current_q
            buffer = []
            continue

        if current_q:
            m = q_letter.match(line)
            if m:
                flush()
                letter      = m.group(1).lower()
                current_sub = letter
                current_key = f'{current_q}{letter}'
                rest        = m.group(2).strip()
                buffer      = [rest] if rest else []
                continue

            m = q_roman.match(line)
            if m:
                flush()
                roman       = m.group(1).lower()
                base_sub    = current_sub.split('_')[0] if current_sub else ''
                current_sub = f'{base_sub}_{roman}' if base_sub else roman
                current_key = f'{current_q}{current_sub.replace("_","")}'
                rest        = m.group(2).strip()
                buffer      = [rest] if rest else []
                continue

        if current_key:
            buffer.append(line)

    flush()
    return notes, labels


def process_subject(code: str, components: list[str], sessions: list[str]):
    print(f'\n  {code}')
    total = 0

    for sess in sessions:
        print(f'    {sess}26 …', end=' ', flush=True)
        pdf_path = get_er_pdf(code, sess)
        if not pdf_path:
            print('no ER PDF')
            continue

        full_text = full_text_from_pdf(pdf_path)
        if not full_text.strip():
            print('empty text')
            continue

        written = 0
        for comp in components:
            out_path = OUTPUT_DIR / f'{code}_{sess}26_er_{comp}.json'
            if out_path.exists():
                continue  # already extracted

            section = find_component_section(full_text, code, comp)
            notes, labels_map = extract_question_notes(section)

            if not notes:
                continue  # nothing to write for this component

            out_path.write_text(json.dumps({'notes': notes, 'labels': labels_map},
                                           indent=2, ensure_ascii=False))
            written += 1
            total += 1

        print(f'{written} components written')
        time.sleep(0.5)

    return total


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else 'all'

    if arg in ('all', 'igcse', 'alevels') or ',' in arg:
        if arg == 'igcse':
            subjects = IGCSE_SUBJECTS
        elif arg == 'alevels':
            subjects = ALEVEL_SUBJECTS
        else:
            subjects = {**IGCSE_SUBJECTS, **ALEVEL_SUBJECTS}
    elif arg in IGCSE_SUBJECTS or arg in ALEVEL_SUBJECTS:
        subjects = {arg: IGCSE_SUBJECTS.get(arg) or ALEVEL_SUBJECTS[arg]}
    else:
        print(f'Unknown argument: {arg}')
        sys.exit(1)

    print(f'\n📋 2026 ER Extractor — {len(subjects)} subjects')
    print(f'   Output: {OUTPUT_DIR}\n')

    grand_total = 0
    for code, components in subjects.items():
        sessions = SESSIONS_BY_SUBJECT.get(code, ['m', 's'])
        grand_total += process_subject(code, components, sessions)

    print(f'\n✅ Done — {grand_total} er-cache files written')
    print('\nNext step: node scripts/generate-coords-2026.mjs')


if __name__ == '__main__':
    main()
