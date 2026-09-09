"""
upload-all-to-archive.py
────────────────────────────────────────────────────────────────────────────────
Uploads ALL PDFs from scripts/pastpapers/ and scripts/pastpapers-2026/ to the
correct Internet Archive items, with resume support (skips already-uploaded).

Archive items:
  igcse    → student-archive-igcse-pastpapers       (0xxx codes, standard A–G)
  igcse91  → student-archive-igcse91-pastpapers     (09xx codes, 9-1 graded)
  olevel   → student-archive-olevel-pastpapers      (1xxx–7xxx codes)
  alevel   → student-archive-alevels-pastpapers     (8xxx / 9xxx codes)

Usage:
  python scripts/upload-all-to-archive.py              # all four items
  python scripts/upload-all-to-archive.py igcse        # one item only
  python scripts/upload-all-to-archive.py igcse91 olevel
  python scripts/upload-all-to-archive.py --dry-run    # list only, no upload

Requires:
  pip install internetarchive
  ia configure   (first time — enter your archive.org credentials)
"""

import os, sys, time, io
from pathlib import Path
from internetarchive import upload, get_item

# ── Force UTF-8 output on Windows ────────────────────────────────────────────
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── PDF source directories ────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
PDF_DIRS    = [
    BASE_DIR / "pastpapers",
    BASE_DIR / "pastpapers-2026",
]

DRY_RUN = "--dry-run" in sys.argv

# ── Archive item definitions ──────────────────────────────────────────────────
ARCHIVE_ITEMS = {
    "igcse": {
        "identifier": "student-archive-igcse-pastpapers",
        "title":      "Student Archive – IGCSE Past Papers",
        "description": (
            "Cambridge IGCSE past question papers, mark schemes and examiner reports. "
            "Subjects include Biology (0610), Chemistry (0620), Physics (0625), "
            "Mathematics (0580), Additional Mathematics (0606), Computer Science (0478), "
            "Business Studies (0450), Economics (0455), Accounting (0452), "
            "History (0470), Geography (0460), ICT (0417), Global Perspectives (0457), "
            "First Language English (0500), Co-ordinated Sciences (0653/0654). "
            "Hosted for studentarchive.xyz"
        ),
        "subject": "IGCSE;Cambridge;Past Papers;Education;CIE",
    },
    "igcse91": {
        "identifier": "student-archive-igcse91-pastpapers",
        "title":      "Student Archive – IGCSE (9-1) Past Papers",
        "description": (
            "Cambridge IGCSE (9-1) graded past question papers and mark schemes. "
            "Subjects include Biology (0970), Chemistry (0971), Physics (0972), "
            "Co-ordinated Sciences (0973), Mathematics (0980), Computer Science (0984), "
            "Economics (0987), Business Studies (0986), History (0977), "
            "Geography (0976), Accounting (0985), English First Language (0990), "
            "English Literature (0992). Hosted for studentarchive.xyz"
        ),
        "subject": "IGCSE;IGCSE 9-1;Cambridge;Past Papers;Education;CIE",
    },
    "olevel": {
        "identifier": "student-archive-olevel-pastpapers",
        "title":      "Student Archive – O Level Past Papers",
        "description": (
            "Cambridge O Level past question papers and mark schemes. "
            "Subjects include Biology (5090), Chemistry (5070), Physics (5054), "
            "Mathematics D (4024), Additional Mathematics (4037), Statistics (4040), "
            "Economics (2281), Computer Science (2210), English Language (1123), "
            "Pakistan Studies (2059), Commerce (7100), Business Studies (7115), "
            "Principles of Accounts (7110), Accounting (7707). "
            "Hosted for studentarchive.xyz"
        ),
        "subject": "O Level;Cambridge;Past Papers;Education;CIE",
    },
    "alevel": {
        "identifier": "student-archive-alevels-pastpapers",
        "title":      "Student Archive – AS & A Level Past Papers",
        "description": (
            "Cambridge AS & A Level past question papers, mark schemes and examiner "
            "reports. Subjects include Biology (9700), Chemistry (9701), Physics (9702), "
            "Mathematics (9709), Further Mathematics (9231), Computer Science (9608/9618), "
            "Business (9609), Economics (9708), Accounting (9706), English Language (9093), "
            "Law (9084), History (9489), Psychology (9698/9990), Sociology (9699), "
            "Media Studies (9607). Hosted for studentarchive.xyz"
        ),
        "subject": "A Level;AS Level;Cambridge;Past Papers;Education;CIE",
    },
}

# ── Subject code → archive item mapping ──────────────────────────────────────
# IGCSE 9-1 codes
IGCSE91_CODES = {
    "0970","0971","0972","0973","0976","0977","0978","0980",
    "0984","0985","0986","0987","0989","0990","0992","0994","0995","7184",
}
# O-Level codes
OLEVEL_CODES = {
    "1123","2059","2210","2281","3204","4024","4037","4040",
    "5054","5070","5090","7010","7094","7100","7110","7115","7707",
}
# A-Level codes
ALEVEL_CODES = {
    "8021","9084","9093","9231","9488","9489","9607","9608","9609",
    "9618","9691","9698","9699","9700","9701","9702","9706","9707",
    "9708","9709","9713","9990",
}

def section_for(filename: str) -> str | None:
    code = Path(filename).name[:4]
    if code in ALEVEL_CODES:  return "alevel"
    if code in IGCSE91_CODES: return "igcse91"
    if code in OLEVEL_CODES:  return "olevel"
    if code.startswith("0"):  return "igcse"
    return None

# ── Upload timing ─────────────────────────────────────────────────────────────
DELAY_OK        = 2.0    # seconds between uploads
DELAY_RATELIMIT = 120    # seconds to wait on rate-limit (× attempt number)
MAX_ATTEMPTS    = 4

# ── Get existing files from an IA item ───────────────────────────────────────
def get_existing(identifier: str) -> set:
    print(f"  Fetching existing files from {identifier}...", flush=True)
    try:
        item = get_item(identifier)
        names = {f["name"] for f in item.files}
        print(f"  → {len(names)} files already on IA")
        return names
    except Exception as e:
        print(f"  ⚠ Could not fetch existing files: {e}")
        return set()

# ── Upload one section ────────────────────────────────────────────────────────
def upload_section(section_key: str, pdfs: list[Path], cfg: dict):
    identifier = cfg["identifier"]
    print(f"\n{'='*65}")
    print(f"  {section_key.upper()} → {identifier}")
    print(f"  {len(pdfs)} PDFs in this section")
    print(f"{'='*65}")

    if not pdfs:
        print("  No PDFs found — skipping.")
        return

    if DRY_RUN:
        for p in pdfs[:10]:
            print(f"  [dry-run] {p.name}")
        if len(pdfs) > 10:
            print(f"  ... and {len(pdfs)-10} more")
        return

    existing  = get_existing(identifier)
    to_upload = [p for p in pdfs if p.name not in existing]
    already   = len(pdfs) - len(to_upload)
    print(f"  Already uploaded: {already}")
    print(f"  To upload:        {len(to_upload)}\n")

    if not to_upload:
        print("  ✓ All files already on IA.")
        return

    metadata = dict(
        title       = cfg["title"],
        description = cfg["description"],
        mediatype   = "texts",
        subject     = cfg["subject"],
    )

    ok = skipped = 0
    for i, pdf_path in enumerate(to_upload, 1):
        name = pdf_path.name
        # Progress header every 100 files
        if i % 100 == 1:
            pct = (i / len(to_upload)) * 100
            print(f"\n  ── [{i}/{len(to_upload)}] {pct:.0f}% complete — {ok} ok, {skipped} skipped ──")
        print(f"  [{i}] {name}", end=" ... ", flush=True)

        for attempt in range(1, MAX_ATTEMPTS + 1):
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
                is_rate = any(k in err for k in (
                    "rationed","overloaded","reduce your request",
                    "accesskey_tasks","503","429","slow down","try again",
                ))
                if is_rate and attempt < MAX_ATTEMPTS:
                    wait = DELAY_RATELIMIT * attempt
                    print(f"RATE_LIMIT (attempt {attempt}/{MAX_ATTEMPTS-1}, waiting {wait}s)...", end=" ", flush=True)
                    time.sleep(wait)
                elif is_rate:
                    print("RATE_LIMIT (gave up after retries)")
                    skipped += 1
                    break
                else:
                    print(f"ERR: {str(e)[:80]}")
                    skipped += 1
                    break

    print(f"\n  ✓ DONE: {ok} uploaded, {skipped} skipped/failed")
    print(f"  View at: https://archive.org/details/{identifier}")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    # Parse which sections to run
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    if not args:
        sections = list(ARCHIVE_ITEMS.keys())
    else:
        sections = []
        for a in args:
            if a.lower() in ARCHIVE_ITEMS:
                sections.append(a.lower())
            else:
                print(f"Unknown section: {a} (valid: igcse igcse91 olevel alevel)")
                sys.exit(1)

    # Collect all PDFs from all source directories
    all_pdfs: list[Path] = []
    for d in PDF_DIRS:
        if d.exists():
            found = sorted(d.glob("*.pdf"))
            print(f"Found {len(found)} PDFs in {d}")
            all_pdfs.extend(found)
        else:
            print(f"Directory not found: {d} — skipping")

    print(f"\nTotal PDFs collected: {len(all_pdfs)}")

    # Distribute by section
    by_section: dict[str, list[Path]] = {k: [] for k in ARCHIVE_ITEMS}
    unrouted = []
    for pdf in all_pdfs:
        sec = section_for(pdf.name)
        if sec and sec in by_section:
            by_section[sec].append(pdf)
        else:
            unrouted.append(pdf.name)

    print("\nDistribution:")
    for sec, files in by_section.items():
        print(f"  {sec:10s}: {len(files):5d} PDFs")
    if unrouted:
        print(f"  unrouted  : {len(unrouted):5d} PDFs (unknown subject codes)")
        for name in unrouted[:5]:
            print(f"    {name}")

    if DRY_RUN:
        print("\n[DRY RUN — no files will be uploaded]")

    # Run selected sections
    for sec in sections:
        upload_section(sec, by_section.get(sec, []), ARCHIVE_ITEMS[sec])

    print("\n" + "═"*65)
    print("  All sections complete.")
    print("  Run again at any time — already-uploaded files are skipped.")
    print("═"*65 + "\n")

if __name__ == "__main__":
    main()
