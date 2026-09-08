"""
patch-missing-pages.py
──────────────────────
Two-pass fix for er-cache files missing the `pages` field.

Pass 1: For any cached PDF in TEMP_DIR, re-extract to get real page numbers.
Pass 2: For remaining files still missing `pages`, add pages: {} as a fallback.

Usage:
    python scripts/patch-missing-pages.py
"""

import json
import re
import sys
import os
import tempfile
from pathlib import Path

# Add scripts dir to path so we can import er-extractor-v2 functions
sys.path.insert(0, str(Path(__file__).parent))

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent.parent
OUTPUT_DIR = ROOT / 'public' / 'er-cache'
TEMP_DIR   = Path(tempfile.gettempdir()) / 'alevels-er-pdfs'

# Import extraction functions from er-extractor-v2
import importlib.util
spec = importlib.util.spec_from_file_location(
    "er_extractor",
    Path(__file__).parent / "er-extractor-v2.py"
)
er = importlib.util.module_from_spec(spec)
spec.loader.exec_module(er)


def patch_from_pdf(json_path: Path, pdf_path: Path, code: str, comp: str) -> bool:
    """Re-extract pages from cached PDF and update the JSON file."""
    try:
        full_text = er.extract_full_text(pdf_path)
        if not full_text.strip():
            return False

        section = er.get_component_section(full_text, code, comp)
        if not section:
            return False

        notes_data = json.loads(json_path.read_text(encoding='utf-8'))
        notes = notes_data.get('notes', {})

        section_offset = full_text.find(section[:80]) if section else 0
        pages: dict[str, int] = {}

        km_m = re.search(r'Key\s+messages?\b', full_text[section_offset:], re.IGNORECASE)
        if km_m and 'key_messages' in notes:
            pages['key_messages'] = er.get_page_at_offset(full_text, section_offset + km_m.start())

        gc_m = re.search(r'General\s+comments?\b', full_text[section_offset:], re.IGNORECASE)
        if gc_m and 'general_comments' in notes:
            pages['general_comments'] = er.get_page_at_offset(full_text, section_offset + gc_m.start())

        for key in notes:
            if key in ('key_messages', 'general_comments'):
                continue
            m_qnum = re.match(r'^(\d+)', key)
            if not m_qnum:
                continue
            qnum = m_qnum.group(1)
            if qnum in pages:
                pages[key] = pages[qnum]
                continue
            q_anchor = re.search(
                rf'(?:^|\n)Question\s+{re.escape(qnum)}\b',
                full_text[section_offset:],
                re.IGNORECASE,
            )
            if q_anchor:
                pg = er.get_page_at_offset(full_text, section_offset + q_anchor.start())
                pages[qnum] = pg
                pages[key]  = pg

        notes_data['pages'] = pages
        json_path.write_text(
            json.dumps(notes_data, indent=2, ensure_ascii=False),
            encoding='utf-8',
        )
        return True
    except Exception as e:
        print(f'      ! Error: {e}')
        return False


def main():
    # Find all JSON files missing `pages`
    missing = [
        f for f in OUTPUT_DIR.glob('*.json')
        if 'pages' not in json.loads(f.read_text(encoding='utf-8'))
    ]
    print(f'Files missing pages: {len(missing)}')

    patched_from_pdf = 0
    patched_empty    = 0

    for json_path in sorted(missing):
        name = json_path.stem  # e.g. "0500_m15_er_12"
        parts = name.split('_')
        if len(parts) < 4:
            continue
        code    = parts[0]   # "0500"
        session = parts[1]   # "m15"
        comp    = parts[3]   # "12"

        pdf_path = TEMP_DIR / f'{code}_{session}_er.pdf'
        if pdf_path.exists() and pdf_path.stat().st_size > 10_000:
            print(f'  {name} ... re-extracting from cached PDF', end=' ', flush=True)
            ok = patch_from_pdf(json_path, pdf_path, code, comp)
            if ok:
                print('OK')
                patched_from_pdf += 1
            else:
                # Fall back to empty pages
                data = json.loads(json_path.read_text(encoding='utf-8'))
                data['pages'] = {}
                json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
                print('(empty fallback)')
                patched_empty += 1
        else:
            # No PDF cached — add empty pages dict
            data = json.loads(json_path.read_text(encoding='utf-8'))
            data['pages'] = {}
            json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
            patched_empty += 1
            print(f'  {name} ... pages: {{}} (no PDF)')

    print(f'\nDone — {patched_from_pdf} patched from PDF, {patched_empty} got empty pages dict')


if __name__ == '__main__':
    main()
