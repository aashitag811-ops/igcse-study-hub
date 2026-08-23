"""
reextract-missing-components.py
─────────────────────────────────
Re-runs ER extraction ONLY for the specific subject+component combos
that were missed due to wrong component lists in the original run.

Missing:
  9701 (Chemistry) — 51, 52, 53  (Paper 5 = Planning, Analysis & Evaluation)
  9708 (Economics) — 41, 42, 43  (Paper 4 = Data Response & Essay A2)
  9709 (Maths)     — 71, 72, 73  (Paper 7 = Further Mechanics, post-2020)

Skips files that already exist.

Usage:  python scripts/reextract-missing-components.py
"""

import pdfplumber
import json
import re
import time
import requests
import tempfile
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────

ROOT         = Path(__file__).parent.parent
OUTPUT_DIR   = ROOT / "public" / "er-cache"
TEMP_DIR     = Path(tempfile.gettempdir()) / "alevels-er-pdfs"
ARCHIVE_BASE = "https://archive.org/download/student-archive-alevels-pastpapers"

TOP_EXCLUSION    = 50
BOTTOM_EXCLUSION = 80

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

NOISE_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over', r'Turn over\]',
    r'Cambridge International', r'Cambridge A Level', r'Cambridge AS',
    r'Page \d+',
    r'^\d+\s*©\s*\d{4}',
    r'^Principal Examiner Report', r'^MARK SCHEME',
]

# ── Only the missing combos ────────────────────────────────────────────────────

MISSING = {
    "9701": ["51", "52", "53"],                           # Chemistry Paper 5
    "9708": ["41", "42", "43"],                           # Economics Paper 4
    "9709": ["71", "72", "73"],                           # Maths Paper 7
    "9608": ["11","12","13","21","22","23","31","32","33"],# CS 9608 — never ran
    "9093": ["41", "42", "43"],                           # English Language Paper 4
}

# Sessions confirmed to have ER PDFs on Archive.org (from the main extractor run)
SESSIONS = {
    "9701": [
        "m16","m17","m18","m19","m21","m22","m23","m25",
        "s10","s11","s12","s13","s14","s15","s16","s17","s18","s19","s21","s22","s23",
        "w10","w11","w12","w13","w14","w15","w16","w17","w18","w19","w20","w21","w22","w23",
    ],
    "9708": [
        "m16","m17","m18","m19","m20","m21","m22","m23","m25",
        "s10","s11","s12","s13","s15","s16","s17","s18","s19","s22","s23",
        "w10","w12","w13","w14","w15","w16","w17","w19","w20","w21","w22","w23",
    ],
    "9709": [
        "m16","m17","m18","m19","m20","m21","m25",
        "s10","s11","s12","s13","s14","s15","s16","s17","s18","s19","s21","s22","s23",
        "w10","w11","w12","w13","w14","w15","w16","w17","w18","w19","w20","w21","w22","w23",
    ],
    "9608": [
        "m16","m17","m18","m19","m20","m21","m22",
        "s10","s11","s12","s13","s14","s15","s16","s17","s18","s19","s21","s22",
        "w10","w11","w12","w13","w14","w15","w16","w17","w18","w19","w20","w21","w22",
    ],
    "9093": [
        "m16","m17","m18","m19","m20","m21","m22","m23","m25",
        "s10","s11","s12","s13","s14","s15","s16","s17","s18","s19","s21","s22","s23",
        "w10","w11","w12","w13","w14","w15","w16","w17","w18","w19","w20","w21","w22","w23",
    ],
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def is_noise(text):
    if not text or len(text.strip()) < 2:
        return True
    for p in NOISE_PATTERNS:
        if re.search(p, text, re.IGNORECASE):
            return True
    return False


def download_pdf(url, dest):
    if dest.exists() and dest.stat().st_size > 30_000:
        return True
    try:
        r = requests.get(url, timeout=60, stream=True)
        if r.status_code != 200:
            return False
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return dest.stat().st_size > 30_000
    except Exception as e:
        print(f"      download error: {e}")
        return False


def extract_full_text(pdf_path):
    text = ""
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                bbox    = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                raw     = cropped.extract_text() or ""
                lines   = [l for l in raw.split("\n") if not is_noise(l)]
                text   += "\n".join(lines) + "\n"
    except Exception as e:
        print(f"      PDF read error: {e}")
    return text


def find_component_section(full_text, code, component):
    paper_num   = component[0]
    variant_num = component[1]
    patterns = [
        rf'Paper\s+{code}/{component}\b',
        rf'\bPaper\s+{component}\b',
        rf'Component\s+{code}/{component}',
        rf'Paper\s+{paper_num}\s*.*?Variant\s+{variant_num}',
    ]
    for pat in patterns:
        m = re.search(pat, full_text, re.IGNORECASE | re.DOTALL)
        if m:
            start = m.start()
            nxt = re.search(
                r'\b(?:Paper\s+\d{4}/\d{2}|Paper\s+\d{2}|Component\s+\d{4}/\d{2})\b',
                full_text[start + 20:], re.IGNORECASE
            )
            end = (start + 20 + nxt.start()) if nxt else len(full_text)
            return full_text[start:end]
    return full_text  # fallback: entire ER


def extract_question_notes(section_text):
    notes, labels = {}, {}
    lines = [l.rstrip() for l in section_text.split("\n") if l.strip()]

    q_main   = re.compile(r'^(?:Question\s+)?(\d+)[\.\s]*$', re.IGNORECASE)
    q_letter = re.compile(r'^\(([a-z])\)\s*(.*)', re.IGNORECASE)
    q_roman  = re.compile(r'^\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*(.*)', re.IGNORECASE)
    gen_head = re.compile(r'^(?:General\s+(?:Comments?|Remarks?))', re.IGNORECASE)

    cur_q = cur_sub = cur_key = None
    buffer = []

    def make_label(q, sub):
        if not q: return "General"
        if not sub: return f"Q {q}"
        parts = sub.split("_")
        lbl = f"Q {q}."
        if parts[0]: lbl += f" ({parts[0]})"
        if len(parts) > 1 and parts[1]: lbl += f" ({parts[1]})"
        return lbl

    def flush():
        if cur_key and buffer:
            t = " ".join(buffer).strip()
            if t:
                notes[cur_key]  = t
                labels[cur_key] = make_label(cur_q, cur_sub)

    for line in lines:
        if gen_head.match(line):
            flush(); cur_q = cur_sub = None; cur_key = "general_comments"
            labels["general_comments"] = "General Comments"; buffer = []; continue

        m = q_main.match(line)
        if m:
            flush(); cur_q = m.group(1); cur_sub = None; cur_key = cur_q; buffer = []; continue

        if cur_q:
            m = q_letter.match(line)
            if m:
                flush(); letter = m.group(1).lower(); cur_sub = letter
                cur_key = f"{cur_q}{letter}"; rest = m.group(2).strip()
                buffer = [rest] if rest else []; continue

            m = q_roman.match(line)
            if m:
                flush(); roman = m.group(1).lower()
                base = cur_sub.split("_")[0] if cur_sub else ""
                cur_sub = f"{base}_{roman}" if base else roman
                cur_key = f"{cur_q}{cur_sub.replace('_','')}"; rest = m.group(2).strip()
                buffer = [rest] if rest else []; continue

        if cur_key:
            buffer.append(line)

    flush()
    return notes, labels


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    total_written = 0

    for code, components in MISSING.items():
        sessions = SESSIONS[code]
        print(f"\n{'='*60}")
        print(f"Subject: {code}  —  missing components: {', '.join(components)}")

        for sess in sessions:
            # Check which components we still need for this session
            needed = [c for c in components
                      if not (OUTPUT_DIR / f"{code}_{sess}_er_{c}.json").exists()]
            if not needed:
                continue

            er_filename = f"{code}_{sess}_er.pdf"
            er_url      = f"{ARCHIVE_BASE}/{er_filename}"
            er_local    = TEMP_DIR / er_filename

            print(f"  {er_filename} … ", end="", flush=True)

            if not download_pdf(er_url, er_local):
                print("not found")
                continue

            full_text = extract_full_text(er_local)
            if not full_text.strip():
                print("empty")
                continue

            written = 0
            for comp in needed:
                out_path = OUTPUT_DIR / f"{code}_{sess}_er_{comp}.json"
                section  = find_component_section(full_text, code, comp)
                notes, lbls = extract_question_notes(section)
                if not notes:
                    continue
                out_path.write_text(
                    json.dumps({"notes": notes, "labels": lbls}, indent=2, ensure_ascii=False),
                    encoding="utf-8"
                )
                written += 1
                total_written += 1

            print(f"{written} files written")
            time.sleep(0.3)

    print(f"\n✅ Done — {total_written} new er-cache files written")


if __name__ == "__main__":
    main()
