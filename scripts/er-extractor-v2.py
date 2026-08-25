"""
er-extractor-v2.py
──────────────────
Correctly extracts Examiner Report notes from Cambridge ER PDFs into
public/er-cache/ JSON files.

Key fixes over the old extractor:
  1. Section splitting uses the reliable "Paper XXXX/CC" token found in
     the flowing text, with a large minimum-offset so the split anchor
     never re-matches itself.
  2. Bullet char U+2022 (•) is treated as a real paragraph break so
     each bullet becomes its own sentence — they are NOT joined inline.
  3. key_messages extraction stops strictly before "General comments"
     and "Comments on specific questions" — those strings are never
     included in the key_messages value.
  4. general_comments extraction stops strictly before "Comments on
     specific questions" — Q1 text never bleeds into general_comments.
  5. PapaCambridge watermark lines are stripped as noise.
  6. Answer-key tables on MCQ pages are stripped.
  7. Per-question notes for MCQ papers use "Question N" anchors.
  8. Per-question notes for theory papers use (a)/(b)/(i)/(ii) sub-parts.
  9. Never skips a file silently when it already exists — always overwrites.

Usage:
    python scripts/er-extractor-v2.py                 # all subjects
    python scripts/er-extractor-v2.py 9706             # single subject
    python scripts/er-extractor-v2.py 9706 m25         # single session
    python scripts/er-extractor-v2.py igcse            # all IGCSE
    python scripts/er-extractor-v2.py alevels          # all A-level
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

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).parent.parent
LOCAL_2026  = Path(__file__).parent / 'pastpapers-2026'
OUTPUT_DIR  = ROOT / 'public' / 'er-cache'
TEMP_DIR    = Path(tempfile.gettempdir()) / 'alevels-er-pdfs'
IGCSE_ARCHIVE  = 'https://archive.org/download/student-archive-igcse-pastpapers'
ALEVEL_ARCHIVE = 'https://archive.org/download/student-archive-alevels-pastpapers'

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ── Subject tables ─────────────────────────────────────────────────────────────
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
    '0457': ['11','12','13'],
}

ALEVEL_SUBJECTS = {
    '9700': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'],
    '9701': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'],
    '9702': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53'],
    '9709': ['11','12','13','21','22','23','31','32','33','41','42','43','51','52','53','61','62','63','71','72','73'],
    '9231': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '9608': ['11','12','13','21','22','23','31','32','33'],
    '9618': ['11','12','13','21','22','23','31','32','33'],
    '9609': ['11','12','13','21','22','23','31','32','33'],
    '9708': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '9706': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '9093': ['11','12','13','21','22','23','31','32','33','41','42','43'],
    '8021': ['11','12','13','21','22','23'],
}

# Sessions that have ER PDFs confirmed or likely
IGCSE_SESSIONS  = ['m', 's', 'w']
ALEVEL_SESSIONS = ['m', 's', 'w']

# ── BestExamHelp fallback slugs for IGCSE ─────────────────────────────────────
# Many IGCSE ERs not on Archive.org are available on bestexamhelp.com.
# URL pattern: /exam/cambridge-igcse/{slug}-{code}/{year}/{code}_{sess}_er.pdf
BEH_IGCSE_SLUGS: dict[str, str] = {
    '0417': 'information-communication-technology',
    '0450': 'business-studies',
    '0452': 'accounting',
    '0455': 'economics',
    '0457': 'global-perspectives',
    '0500': 'first-language-english',
    '0549': 'hindi-as-a-second-language',
    '0580': 'mathematics',
    '0606': 'additional-mathematics',
    '0610': 'biology',
    '0620': 'chemistry',
    '0625': 'physics',
}

# ── Noise patterns ─────────────────────────────────────────────────────────────
# These lines are stripped from the raw PDF text before parsing.
NOISE_RE = re.compile(
    r'(?:'
    r'©\s*UCLES\s*\d{4}'
    r'|©\s*\d{4}'
    r'|\d{4}/\d{2,3}/[A-Z]/[A-Z]/\d{2,4}'
    r'|\[Turn over'
    r'|Turn over\]'
    r'|Cambridge International'
    r'|Cambridge A Level'
    r'|Cambridge AS'
    r'|Cambridge IGCSE'
    r'|Page \d+ of \d+'
    r'|Page \d+'
    r'|Principal Examiner Report for Teachers'
    r'|Principal examiner reports for teachers'
    r'|Principal examiner reports for teachers summarise'
    r'|This report is to be used'
    r'|For guidance on teaching'
    r'|Resource\s+Where to find'
    r'|Grade descriptions'
    r'|Schemes of work'
    r'|School support hub'
    r'|Select: Subject'
    r'|Trace ID:'
    r'|Re-uploading, mirroring'
    r'|Licensed for hosting'
    r'|Downloaded from PapaCambridge'
    r'|papacambridge\.com'
    r'|Source: papacambridge'
    r'|Examiner Report.*\| Source'
    r')',
    re.IGNORECASE,
)

# Answer-key table pattern: lines like "1  A  11  B  21  C" → skip
ANSWER_KEY_LINE_RE = re.compile(
    r'^\s*\d{1,2}\s+[A-D]\s+\d{1,2}\s+[A-D]'
)

# MCQ answer key header columns: "Question Question Question" style
MCQ_TABLE_HEADER_RE = re.compile(
    r'^\s*(?:Question\s+){2,}|^\s*(?:Key\s+){2,}|^\s*(?:Question\s+Key\s+){1,}'
)

# Trailing page-header fragments that bleed into question text at page boundaries.
# These appear at the END of a note (joined by pdfplumber across pages) and must
# be stripped from the assembled note string, not the raw line stream.
# Matches patterns like:
#   " 9706 Accounting March 2025"
#   " 9706 Accounting March 2025 ACCOUNTING"
#   " ACCOUNTING"
#   " BIOLOGY Paper 9700/22 AS Level Structured Questions"
TRAILING_HEADER_RE = re.compile(
    r'\s+\d{4}\s+\w[\w\s]{0,50}(?:20\d{2})'   # subject-code year-string
    r'(?:\s+[A-Z]{2,}[\w\s]{0,60})?'           # optional trailing subject name / paper line
    r'\s*$',
    re.IGNORECASE,
)

# Also strip bare ALL-CAPS subject names at end of note (e.g. " ACCOUNTING", " BIOLOGY")
TRAILING_SUBJECT_RE = re.compile(
    r'\s+(?:ACCOUNTING|BIOLOGY|CHEMISTRY|PHYSICS|ECONOMICS|MATHEMATICS|'
    r'FURTHER MATHEMATICS|COMPUTER SCIENCE|BUSINESS|ENGLISH)\s*$',
    re.IGNORECASE,
)


def clean_note(text: str) -> str:
    """Strip trailing page-header fragments from a note string."""
    text = TRAILING_HEADER_RE.sub('', text).rstrip()
    text = TRAILING_SUBJECT_RE.sub('', text).rstrip()
    return text

def is_noise(line: str) -> bool:
    s = line.strip()
    if not s or len(s) < 3:
        return True
    if NOISE_RE.search(s):
        return True
    if ANSWER_KEY_LINE_RE.match(s):
        return True
    if MCQ_TABLE_HEADER_RE.match(s):
        return True
    return False


# ── PDF text extraction ────────────────────────────────────────────────────────

def extract_full_text(pdf_path: Path) -> str:
    """
    Extract all text from a PDF.
    - Strips noise lines.
    - Converts U+2022 bullets to '\n• ' so they become their own paragraphs.
    - Keeps all content (no top/bottom exclusion margins that caused truncation).
    """
    full = []
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                raw = page.extract_text() or ''
                # Replace bullet char U+2022 with a newline + marker so each
                # bullet becomes a separate line.
                raw = raw.replace('\u2022', '\n\u2022')
                # Also handle U+25A0 (■) and U+25CF (●) used in older PDFs
                raw = raw.replace('\u25a0', '\n\u2022').replace('\u25cf', '\n\u2022')
                lines = raw.split('\n')
                for line in lines:
                    if not is_noise(line):
                        full.append(line.rstrip())
    except Exception as e:
        print(f'    ! PDF read error: {e}')
    return '\n'.join(full)


# ── Section splitting ──────────────────────────────────────────────────────────

def find_all_section_starts(full_text: str, subject_code: str) -> list[tuple[str, int]]:
    """
    Find all 'Paper XXXX/CC' section anchors in the text.
    Returns list of (component_code, start_pos) sorted by position.
    """
    # Match "Paper 9706/12" or "Paper 0452/22" etc.
    pattern = re.compile(
        rf'Paper\s+{re.escape(subject_code)}/(\d{{2,3}})\b',
        re.IGNORECASE,
    )
    results = []
    for m in pattern.finditer(full_text):
        comp = m.group(1).zfill(2)  # normalise to 2 digits
        results.append((comp, m.start()))
    # Sort by position
    results.sort(key=lambda x: x[1])
    return results


def get_component_section(full_text: str, subject_code: str, component: str) -> str:
    """
    Return the slice of full_text that covers exactly this component.
    Uses 'Paper XXXX/CC' anchors for precise splitting.
    If the component is not found, returns empty string.
    """
    all_starts = find_all_section_starts(full_text, subject_code)
    if not all_starts:
        # Fallback: single-component ER — return all
        return full_text

    # Find our component
    target_pos = None
    target_idx = None
    for i, (comp, pos) in enumerate(all_starts):
        if comp == component:
            target_pos = pos
            target_idx = i
            break

    if target_pos is None:
        return ''

    # End is the start of the next component section (or EOF)
    if target_idx + 1 < len(all_starts):
        end_pos = all_starts[target_idx + 1][1]
    else:
        end_pos = len(full_text)

    return full_text[target_pos:end_pos]


# ── Key messages + general comments extraction ────────────────────────────────

# Phrases that signal the start of per-question content — we stop before these
SPECIFIC_Q_BOUNDARY = re.compile(
    r'Comments\s+on\s+specific\s+questions|Question\s+\d',
    re.IGNORECASE,
)

GENERAL_COMMENTS_RE = re.compile(r'General\s+comments?\b', re.IGNORECASE)
KEY_MESSAGES_RE     = re.compile(r'Key\s+messages?\b',      re.IGNORECASE)


def extract_key_messages(section: str) -> str | None:
    """
    Extract 'Key messages' block from a section.
    Stops at 'General comments' OR 'Comments on specific questions' OR 'Question N'.
    Never includes those boundary lines themselves.
    """
    m = KEY_MESSAGES_RE.search(section)
    if not m:
        return None

    start = m.end()
    # Find where the next major block starts
    stop = GENERAL_COMMENTS_RE.search(section, start)
    stop2 = SPECIFIC_Q_BOUNDARY.search(section, start)

    stops = [s.start() for s in [stop, stop2] if s]
    end = min(stops) if stops else start + 4000

    raw = section[start:end]
    lines = [l.strip() for l in raw.split('\n') if l.strip() and len(l.strip()) > 8 and not is_noise(l)]
    if not lines:
        return None
    return '\n'.join(lines)


def extract_general_comments(section: str) -> str | None:
    """
    Extract 'General comments' block.
    Stops at 'Comments on specific questions' OR 'Question N'.
    Never includes those boundary lines themselves.
    """
    m = GENERAL_COMMENTS_RE.search(section)
    if not m:
        return None

    start = m.end()
    stop = SPECIFIC_Q_BOUNDARY.search(section, start)
    end = stop.start() if stop else start + 20000  # no arbitrary char limit

    raw = section[start:end]
    lines = [l.strip() for l in raw.split('\n') if l.strip() and len(l.strip()) > 8 and not is_noise(l)]
    if not lines:
        return None
    return '\n'.join(lines)


# ── Per-question note extraction ───────────────────────────────────────────────

# "Question 3" or standalone "3" at start of a cleaned line (for MCQ sections)
Q_STANDALONE_RE = re.compile(r'^Question\s+(\d{1,2})\s*$', re.IGNORECASE)
# Sub-part markers like "(a)", "(b)", "(i)", "(ii)", "(iii)", "(iv)"
SUB_LETTER_RE   = re.compile(r'^\(([a-z])\)\s*(.*)$',   re.IGNORECASE)
SUB_ROMAN_RE    = re.compile(r'^\((i{1,3}|iv|v?i{0,3}|ix|x)\)\s*(.*)$', re.IGNORECASE)
# "Comprehensive responses" / "Limited responses" markers — start of a section
COMP_LIM_RE     = re.compile(r'^(?:Comprehensive|Limited)\s+responses?\b', re.IGNORECASE)


def extract_question_notes(section: str) -> tuple[dict, dict]:
    """
    Parse per-question notes from a component section.

    Handles both MCQ-style (Question N then flat text) and
    theory-style (Question N then (a)/(b)/(i)/(ii) sub-parts).

    Returns (notes, labels) dicts keyed by e.g. "1", "1a", "1ai", "2b", ...
    """
    notes:  dict[str, str] = {}
    labels: dict[str, str] = {}

    # Find start of per-question content
    sq = SPECIFIC_Q_BOUNDARY.search(section)
    if sq:
        text = section[sq.end():]
    else:
        text = section

    lines = [l.strip() for l in text.split('\n') if l.strip()]

    current_q:   str | None = None
    current_sub: str | None = None  # "a", "b", "ai", "bii" …
    current_key: str | None = None
    buffer: list[str] = []

    def flush():
        if current_key and buffer:
            raw_text = ' '.join(buffer).strip()
            full_text = clean_note(raw_text)
            if len(full_text) > 10:
                notes[current_key]  = full_text
                labels[current_key] = _make_label(current_q, current_sub)

    def _make_label(q: str | None, sub: str | None) -> str:
        if not q:
            return 'General'
        if not sub:
            return f'Q {q}'
        # sub is built by concatenating letter + roman, e.g. "bii" means (b)(ii).
        # Split at the boundary between alpha and roman-numeral characters.
        m_parts = re.match(r'^([a-z])([ivx]+)?$', sub)
        if m_parts:
            letter_part = m_parts.group(1)
            roman_part  = m_parts.group(2)
            if roman_part:
                return f'Q {q}. ({letter_part}) ({roman_part})'
            return f'Q {q}. ({letter_part})'
        # Pure roman (no leading letter) e.g. sub="ii"
        if re.match(r'^[ivx]+$', sub):
            return f'Q {q}. ({sub})'
        return f'Q {q}. ({sub})'

    for line in lines:
        # Skip noise inside question sections
        if is_noise(line):
            continue

        # ── New question anchor ───────────────────────────────────────────
        mq = Q_STANDALONE_RE.match(line)
        if mq:
            flush()
            current_q   = mq.group(1)
            current_sub = None
            current_key = current_q
            buffer      = []
            continue

        # ── Sub-part (letter) ─────────────────────────────────────────────
        if current_q:
            ml = SUB_LETTER_RE.match(line)
            if ml:
                flush()
                letter      = ml.group(1).lower()
                rest        = ml.group(2).strip()
                current_sub = letter
                current_key = f'{current_q}{letter}'
                buffer      = [rest] if rest else []
                continue

            # ── Sub-part (roman numeral) ──────────────────────────────────
            mr = SUB_ROMAN_RE.match(line)
            if mr:
                flush()
                roman       = mr.group(1).lower()
                rest        = mr.group(2).strip()
                # Nest under current single-letter sub-part if any
                # current_sub is a single letter like "b" → result "bii"
                base = current_sub if current_sub and re.match(r'^[a-z]$', current_sub) else ''
                current_sub = f'{base}{roman}' if base else roman
                current_key = f'{current_q}{current_sub}'
                buffer      = [rest] if rest else []
                continue

        # ── Accumulate body text ──────────────────────────────────────────
        if current_key:
            # "Comprehensive responses" and "Limited responses" are section
            # markers within a question's text — include them as readable labels
            if COMP_LIM_RE.match(line):
                buffer.append(f'[{line}]')
            else:
                buffer.append(line)

    flush()
    return notes, labels


# ── PDF acquisition ────────────────────────────────────────────────────────────

def _download_to_cache(url: str, dest: Path) -> bool:
    """Download url → dest. Returns True on success (>10 KB)."""
    try:
        r = requests.get(url, timeout=60, stream=True,
                         headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code != 200:
            return False
        with open(dest, 'wb') as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)
        if dest.stat().st_size < 10_000:
            dest.unlink()
            return False
        return True
    except Exception as e:
        print(f'      ! download failed: {e}')
        if dest.exists():
            dest.unlink()
        return False


def get_pdf_path(code: str, session: str) -> Path | None:
    """
    Return path to ER PDF.
    Priority:
      1. scripts/pastpapers-2026/<code>_<session>_er.pdf  (local 2026 folder)
      2. TEMP_DIR/<code>_<session>_er.pdf                 (already cached)
      3. Archive.org
      4. BestExamHelp (IGCSE only — has many sessions Archive.org misses)
    """
    filename = f'{code}_{session}_er.pdf'

    # 1. Local 2026 folder
    if session.endswith('26'):
        local = LOCAL_2026 / filename
        if local.exists() and local.stat().st_size > 10_000:
            return local

    # 2. Already cached
    cached = TEMP_DIR / filename
    if cached.exists() and cached.stat().st_size > 10_000:
        return cached

    # 3. Archive.org
    base = ALEVEL_ARCHIVE if code[0] in ('9', '8') else IGCSE_ARCHIVE
    if _download_to_cache(f'{base}/{filename}', cached):
        return cached

    # 4. BestExamHelp (IGCSE only)
    slug = BEH_IGCSE_SLUGS.get(code)
    if slug:
        yr_full = str(2000 + int(session[1:]))
        beh_url = (f'https://bestexamhelp.com/exam/cambridge-igcse/'
                   f'{slug}-{code}/{yr_full}/{filename}')
        if _download_to_cache(beh_url, cached):
            return cached

    return None


# ── Processing ─────────────────────────────────────────────────────────────────

def process_session(code: str, session: str, components: list[str]) -> int:
    """
    Extract ER notes for all components of one subject+session.
    Always overwrites existing JSON files.
    Returns number of files written.
    """
    pdf_path = get_pdf_path(code, session)
    if not pdf_path:
        print('no ER PDF')
        return 0

    full_text = extract_full_text(pdf_path)
    if not full_text.strip():
        print('empty text')
        return 0

    # Find which components actually appear in this PDF
    section_starts = find_all_section_starts(full_text, code)
    found_comps = {c for c, _ in section_starts}

    written = 0

    for comp in components:
        section = get_component_section(full_text, code, comp)
        if not section:
            continue  # This component not in this ER PDF

        notes, labels = extract_question_notes(section)

        # Add key_messages and general_comments
        km = extract_key_messages(section)
        gc = extract_general_comments(section)
        if km:
            notes['key_messages']  = km
            labels['key_messages'] = 'Key Messages'
        if gc:
            notes['general_comments']  = gc
            labels['general_comments'] = 'General Comments'

        if not notes:
            continue

        out_path = OUTPUT_DIR / f'{code}_{session}_er_{comp}.json'
        out_path.write_text(
            json.dumps({'notes': notes, 'labels': labels}, indent=2, ensure_ascii=False),
            encoding='utf-8',
        )
        written += 1

    return written


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    # Build subject→components map from args
    if not args or args[0] == 'all':
        subjects = {**IGCSE_SUBJECTS, **ALEVEL_SUBJECTS}
        filter_session = None
    elif args[0] == 'igcse':
        subjects = IGCSE_SUBJECTS
        filter_session = args[1] if len(args) > 1 else None
    elif args[0] == 'alevels':
        subjects = ALEVEL_SUBJECTS
        filter_session = args[1] if len(args) > 1 else None
    elif args[0] in IGCSE_SUBJECTS or args[0] in ALEVEL_SUBJECTS:
        code = args[0]
        subjects = {code: IGCSE_SUBJECTS.get(code) or ALEVEL_SUBJECTS[code]}
        filter_session = args[1] if len(args) > 1 else None
    else:
        print(f'Unknown argument: {args[0]}')
        sys.exit(1)

    print(f'\nER Extractor v2 — {len(subjects)} subjects')
    print(f'Output: {OUTPUT_DIR}\n')

    grand_total = 0
    for code, components in subjects.items():
        is_alevel = code[0] in ('9', '8')
        sessions_list = ALEVEL_SESSIONS if is_alevel else IGCSE_SESSIONS
        years = list(range(10, 27))   # 2010–2026

        print(f'\n  {code}')
        for season in sessions_list:
            for yr in years:
                session = f'{season}{yr:02d}'
                if filter_session and session != filter_session:
                    continue
                print(f'    {session} ...', end=' ', flush=True)
                n = process_session(code, session, components)
                if n:
                    print(f'{n} files')
                    grand_total += n
                else:
                    print('-')
                time.sleep(0.1)

    print(f'\nDone — {grand_total} er-cache files written\n')


if __name__ == '__main__':
    main()

# Made with Bob
