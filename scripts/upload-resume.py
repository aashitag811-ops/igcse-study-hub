"""
upload-resume.py
────────────────────────────────────────────────────────────────────────────
Resume-safe uploader for all three remaining archive items.
Checks what's already on IA and only uploads what's missing.
Uses larger retry windows to survive rate limits.

Usage:
  python scripts/upload-resume.py alevel     # A-Level only  (4,100 missing)
  python scripts/upload-resume.py igcse91    # IGCSE 9-1     (2,413 files)
  python scripts/upload-resume.py olevel     # O-Level       (5,023 files)
  python scripts/upload-resume.py all        # all three
"""

import os, sys, time, json, io
from pathlib import Path
from internetarchive import upload, get_item

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

PDF_DIR   = Path("scripts/pastpapers")
CAT_FILE  = Path("scripts/beh-catalogue.json")

ARCHIVE_ITEMS = {
    "alevel": {
        "identifier": "student-archive-alevels-pastpapers",
        "title":      "Student Archive - AS & A Level Past Papers",
        "description": (
            "Cambridge AS & A Level past question papers, mark schemes, examiner "
            "reports and grade thresholds. Subjects include Biology (9700), "
            "Chemistry (9701), Physics (9702), Mathematics (9709), Further "
            "Mathematics (9231), Computer Science (9608/9618), Business (9609), "
            "Economics (9708), Accounting (9706), Law (9084), Sociology (9699), "
            "Psychology (9698/9990), History (9489), Media Studies (9607), "
            "Computing (9691). Hosted for studentarchive.xyz"
        ),
        "subject": "A Level;AS Level;Cambridge;Past Papers;Education;CIE",
    },
    "igcse91": {
        "identifier": "student-archive-igcse91-pastpapers",
        "title":      "Student Archive - IGCSE (9-1) Past Papers",
        "description": (
            "Cambridge IGCSE (9-1) graded past question papers and mark schemes. "
            "Subjects include Biology (0970), Chemistry (0971), Physics (0972), "
            "Mathematics (0980), Computer Science (0984), Economics (0987), "
            "Business Studies (0986), History (0977), Geography (0976). "
            "Hosted for studentarchive.xyz"
        ),
        "subject": "IGCSE;IGCSE 9-1;Cambridge;Past Papers;Education;CIE",
    },
    "olevel": {
        "identifier": "student-archive-olevel-pastpapers",
        "title":      "Student Archive - O Level Past Papers",
        "description": (
            "Cambridge O Level past question papers and mark schemes. "
            "Subjects include Biology (5090), Chemistry (5070), Physics (5054), "
            "Mathematics D (4024), Additional Mathematics (4037), "
            "Economics (2281), Computer Science (2210), English Language (1123). "
            "Hosted for studentarchive.xyz"
        ),
        "subject": "O Level;Cambridge;Past Papers;Education;CIE",
    },
}

def load_catalogue():
    if not CAT_FILE.exists():
        return {}
    with open(CAT_FILE) as f:
        return json.load(f)

def section_for(filename, catalogue):
    parts = filename.split("_")
    if not parts:
        return None
    code = parts[0]
    if code in catalogue:
        return catalogue[code].get("label")
    if not code.isdigit():
        return None
    n = int(code)
    if 8000 <= n <= 9999:
        return "alevel"
    if 1000 <= n <= 2999 or 4000 <= n <= 5999 or 7000 <= n <= 7999:
        # Could be olevel or igcse91 — need catalogue to distinguish
        return "olevel"
    return None

def get_existing(identifier):
    print(f"  Fetching file list from {identifier} ...", flush=True)
    try:
        item = get_item(identifier)
        existing = {f["name"] for f in item.files if f["name"].endswith(".pdf")}
        print(f"  Already on IA: {len(existing)}")
        return existing
    except Exception as e:
        print(f"  WARNING: could not fetch file list: {e}")
        return set()

def upload_files(section_key, pdfs, cfg):
    identifier = cfg["identifier"]
    print(f"\n{'='*65}")
    print(f"  {section_key.upper()} -> {identifier}")
    print(f"  {len(pdfs)} PDFs in this section")
    print('='*65)

    existing = get_existing(identifier)
    to_upload = [p for p in pdfs if p.name not in existing]
    print(f"  To upload: {len(to_upload)}\n")

    if not to_upload:
        print("  All files already uploaded!")
        return

    metadata = dict(
        title       = cfg["title"],
        description = cfg["description"],
        mediatype   = "texts",
        subject     = cfg["subject"],
    )

    ok = 0
    skipped = 0
    DELAY_OK      = 2.0   # seconds between successful uploads
    DELAY_RATELIM = 120   # wait after rate limit

    for i, pdf_path in enumerate(to_upload, 1):
        name = pdf_path.name
        if i % 100 == 1:
            print(f"\n  --- [{i}/{len(to_upload)}] Progress: {ok} ok, {skipped} skipped ---")
        print(f"  [{i}] {name}", end=" ... ", flush=True)

        for attempt in range(1, 5):
            try:
                r = upload(
                    identifier,
                    files=[str(pdf_path)],
                    metadata=metadata,
                    checksum=True,
                    retries=1,
                    retries_sleep=10,
                    verbose=False,
                )
                responses = [resp for resp in r if hasattr(resp, "status_code")]
                if responses and responses[0].status_code not in (200, 201):
                    raise Exception(f"HTTP {responses[0].status_code}")
                print("OK")
                ok += 1
                time.sleep(DELAY_OK)
                break
            except Exception as e:
                err = str(e).lower()
                is_ratelimit = any(k in err for k in (
                    "rationed", "overloaded", "reduce your request",
                    "accesskey_tasks", "503", "429", "slow down"))
                if is_ratelimit and attempt < 4:
                    wait = DELAY_RATELIM * attempt
                    print(f"RATE_LIMIT (attempt {attempt}/3, waiting {wait}s)...", end=" ", flush=True)
                    time.sleep(wait)
                elif is_ratelimit:
                    print("RATE_LIMIT (gave up)")
                    skipped += 1
                    break
                else:
                    print(f"ERR: {err[:80]}")
                    skipped += 1
                    break

    print(f"\n  DONE: {ok} uploaded, {skipped} skipped/failed")
    print(f"  View at: https://archive.org/details/{identifier}")

def main():
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    catalogue = load_catalogue()

    all_pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"Total PDFs in {PDF_DIR}: {len(all_pdfs)}")

    by_section = {k: [] for k in ARCHIVE_ITEMS}
    for pdf in all_pdfs:
        sec = section_for(pdf.name, catalogue)
        if sec and sec in by_section:
            by_section[sec].append(pdf)

    print("Distribution:")
    for sec, files in by_section.items():
        print(f"  {sec:10s}: {len(files):5d} PDFs")

    sections = list(ARCHIVE_ITEMS.keys()) if arg == "all" else [arg]
    for sec in sections:
        if sec not in ARCHIVE_ITEMS:
            print(f"Unknown section: {sec}")
            continue
        upload_files(sec, by_section.get(sec, []), ARCHIVE_ITEMS[sec])

if __name__ == "__main__":
    main()
