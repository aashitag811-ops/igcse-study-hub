"""
upload-all-to-archive.py
─────────────────────────────────────────────────────────────────────────────
Uploads ALL past paper PDFs from scripts/pastpapers/ to their respective
Internet Archive items.  Sections are kept in separate IA items so each
one stays manageable.

Archive items:
  student-archive-igcse-pastpapers       ← IGCSE (0xxx codes)
  student-archive-igcse91-pastpapers     ← IGCSE (9-1) (0xxx codes, newer syllabus)
  student-archive-alevels-pastpapers     ← A-Level (9xxx / 8xxx codes)
  student-archive-olevel-pastpapers      ← O-Level (1xxx–7xxx codes)

Usage:
  python scripts/upload-all-to-archive.py             # everything
  python scripts/upload-all-to-archive.py igcse       # IGCSE only
  python scripts/upload-all-to-archive.py igcse91     # IGCSE (9-1) only
  python scripts/upload-all-to-archive.py alevel      # A-Level only
  python scripts/upload-all-to-archive.py olevel      # O-Level only

Requires:
  pip install internetarchive
  ia configure    (enter your archive.org credentials once)
"""

import os
import sys
import glob
import time
import json
from pathlib import Path
from internetarchive import upload, get_item

# ── Config ─────────────────────────────────────────────────────────────────
PDF_DIR      = Path("scripts/pastpapers")
CATALOGUE    = Path("scripts/beh-catalogue.json")
SKIP_LOG     = Path("upload_all_skipped.txt")

DELAY_OK     = 1.5    # seconds between successful uploads
DELAY_RATELIM = 90    # seconds to wait after a rate-limit hit

# ── Archive item definitions ────────────────────────────────────────────────
ARCHIVE_ITEMS = {
    "igcse": {
        "identifier":   "student-archive-igcse-pastpapers",
        "title":        "Student Archive – IGCSE Past Papers",
        "description":  (
            "Cambridge IGCSE past question papers, mark schemes, examiner reports "
            "and grade thresholds. Subjects include Biology (0610), Chemistry (0620), "
            "Physics (0625), Mathematics (0580), Additional Mathematics (0606), "
            "Computer Science (0478), Economics (0455), Accounting (0452), "
            "Business Studies (0450), ICT (0417), First Language English (0500), "
            "ESL (0510), French (0520), Hindi (0549), Global Perspectives (0457), "
            "History (0470), Geography (0460), Religious Studies (0490), "
            "English Literature (0475), Environmental Management (0680), "
            "Travel & Tourism (0471), Sociology (0495), Drama (0411), Music (0410), "
            "Islamiyat (0493), Enterprise (0454), Food & Nutrition (0648), "
            "Agriculture (0600), and more. Hosted for studentarchive.xyz"
        ),
        "subject":      "IGCSE;Cambridge;Past Papers;Education;CIE",
    },
    "igcse91": {
        "identifier":   "student-archive-igcse91-pastpapers",
        "title":        "Student Archive – IGCSE (9-1) Past Papers",
        "description":  (
            "Cambridge IGCSE (9-1) graded past question papers and mark schemes. "
            "Subjects include Biology (0970), Chemistry (0971), Physics (0972), "
            "Mathematics (0980), Computer Science (0984), Economics (0987), "
            "Business Studies (0986), History (0977), Geography (0976), "
            "Accounting (0985), English (0990), English Literature (0992), "
            "and Co-ordinated Sciences (0973). Hosted for studentarchive.xyz"
        ),
        "subject":      "IGCSE;IGCSE 9-1;Cambridge;Past Papers;Education;CIE",
    },
    "alevel": {
        "identifier":   "student-archive-alevels-pastpapers",
        "title":        "Student Archive – AS & A Level Past Papers",
        "description":  (
            "Cambridge AS & A Level past question papers, mark schemes, examiner reports "
            "and grade thresholds. Subjects include Biology (9700), Chemistry (9701), "
            "Physics (9702), Mathematics (9709), Further Mathematics (9231), "
            "Computer Science (9608/9618), Business (9609), Economics (9708), "
            "Accounting (9706), English Language (9093), English General Paper (8021), "
            "Law (9084), Sociology (9699), Psychology (9698/9990), History (9489), "
            "Media Studies (9607), Business Studies (9707), Computing (9691), "
            "Applied ICT (9713), Islamic Studies (9488). "
            "Hosted for studentarchive.xyz"
        ),
        "subject":      "A Level;AS Level;Cambridge;Past Papers;Education;CIE",
    },
    "olevel": {
        "identifier":   "student-archive-olevel-pastpapers",
        "title":        "Student Archive – O Level Past Papers",
        "description":  (
            "Cambridge O Level past question papers and mark schemes. "
            "Subjects include Biology (5090), Chemistry (5070), Physics (5054), "
            "Mathematics D (4024), Additional Mathematics (4037), "
            "Economics (2281), Computer Science (2210), English Language (1123), "
            "Business Studies (7115), Principles of Accounts (7110), "
            "Pakistan Studies (2059), Statistics (4040), Commerce (7100), "
            "and more. Hosted for studentarchive.xyz"
        ),
        "subject":      "O Level;Cambridge;Past Papers;Education;CIE",
    },
}

# ── Load catalogue to know which code belongs to which section ──────────────
def load_catalogue():
    if not CATALOGUE.exists():
        print("⚠  beh-catalogue.json not found — using filename prefix rules only")
        return {}
    with open(CATALOGUE) as f:
        return json.load(f)

# ── Determine section for a given filename ──────────────────────────────────
def section_for(filename: str, catalogue: dict) -> str | None:
    # Get subject code from filename, e.g. 0610_s22_qp_11.pdf → 0610
    parts = filename.split("_")
    if not parts:
        return None
    code = parts[0]

    if code in catalogue:
        return catalogue[code]["label"]

    # Fallback rules based on code ranges
    if not code.isdigit():
        return None
    n = int(code)
    if 8000 <= n <= 8999 or 9000 <= n <= 9999:
        return "alevel"
    if n < 1000:
        # 3-digit codes are O-level style
        return "olevel"
    # 4-digit codes: distinguish IGCSE vs O-level by code range
    # O-Level typically: 1xxx–7xxx (5054, 4024, 2281, 1123, 7115, etc.)
    # IGCSE typically: 04xx–06xx range
    if 400 <= n <= 699 or (n >= 4000 and n <= 6999 and str(code).startswith("0")):
        return "igcse"
    # O-level range
    if 1000 <= n <= 7999:
        return "olevel"
    return None

# ── Upload one section ───────────────────────────────────────────────────────
def upload_section(section_key: str, pdfs: list[Path], item_cfg: dict, dry_run: bool = False):
    identifier = item_cfg["identifier"]
    print(f"\n{'═'*60}")
    print(f"  {section_key.upper()} → {identifier}")
    print(f"  {len(pdfs)} PDFs to consider")
    print('═'*60)

    if not pdfs:
        print("  Nothing to upload for this section.")
        return 0, 0

    # Check what's already on archive.org
    print("  Checking existing files on archive.org...")
    try:
        item = get_item(identifier)
        existing = {f["name"] for f in item.files}
    except Exception as e:
        print(f"  ⚠  Could not fetch existing file list: {e}")
        existing = set()
    print(f"  Already on IA: {len(existing)}")

    to_upload = [p for p in pdfs if p.name not in existing]
    print(f"  New to upload: {len(to_upload)}")

    if not to_upload:
        print("  ✅ All files already uploaded!")
        return 0, 0

    if dry_run:
        print(f"  DRY RUN — would upload {len(to_upload)} files")
        return len(to_upload), 0

    metadata = dict(
        title       = item_cfg["title"],
        description = item_cfg["description"],
        mediatype   = "texts",
        subject     = item_cfg["subject"],
    )

    ok = 0
    skipped = 0
    skipped_files = []

    for i, pdf_path in enumerate(to_upload, 1):
        name = pdf_path.name
        print(f"  [{i}/{len(to_upload)}] {name}", end=" ... ", flush=True)

        attempts = 0
        while attempts < 4:
            try:
                r = upload(
                    identifier,
                    files=[str(pdf_path)],
                    metadata=metadata,
                    checksum=True,
                    retries=1,
                    retries_sleep=5,
                    verbose=False,
                )
                responses = [resp for resp in r if hasattr(resp, "status_code")]
                if responses and responses[0].status_code not in (200, 201):
                    raise Exception(f"HTTP {responses[0].status_code}")
                print("✓")
                ok += 1
                time.sleep(DELAY_OK)
                break
            except Exception as e:
                err = str(e).lower()
                attempts += 1
                if any(k in err for k in ("rationed", "overloaded", "reduce your request",
                                           "accesskey_tasks", "503", "429", "slow down")):
                    if attempts < 4:
                        print(f"\n    rate limited — waiting {DELAY_RATELIM}s (attempt {attempts}/3)...",
                              end=" ", flush=True)
                        time.sleep(DELAY_RATELIM)
                    else:
                        print("✗ RATE LIMITED (gave up)")
                        skipped_files.append(f"{name}  [rate limited]")
                        skipped += 1
                elif any(k in err for k in ("unacceptable", "checking pdf", "invalid", "corrupt")):
                    print("✗ SKIP (corrupt PDF)")
                    skipped_files.append(f"{name}  [corrupt]")
                    skipped += 1
                    break
                else:
                    print(f"✗ ERROR: {err[:80]}")
                    skipped_files.append(f"{name}  [{err[:80]}]")
                    skipped += 1
                    break

        if i % 200 == 0:
            print(f"\n  ── {section_key} progress: {i}/{len(to_upload)}  OK:{ok}  Skip:{skipped} ──\n")

    return ok, skipped, skipped_files

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    filter_arg = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    dry_run    = "--dry-run" in sys.argv

    if dry_run:
        print("DRY RUN MODE — no files will be uploaded")

    catalogue = load_catalogue()

    # Collect all PDFs and sort by section
    all_pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"Total PDFs in {PDF_DIR}: {len(all_pdfs)}")

    by_section: dict[str, list[Path]] = {k: [] for k in ARCHIVE_ITEMS}

    for pdf in all_pdfs:
        sec = section_for(pdf.name, catalogue)
        if sec and sec in by_section:
            by_section[sec].append(pdf)
        # Files not matching any section are silently skipped

    print("\nDistribution across sections:")
    for sec, files in by_section.items():
        print(f"  {sec:10s}: {len(files):5d} PDFs")

    # Run uploads
    total_ok = 0
    total_skipped = 0
    all_skipped_files = []

    sections_to_run = list(ARCHIVE_ITEMS.keys()) if filter_arg == "all" else [filter_arg]

    for sec in sections_to_run:
        if sec not in ARCHIVE_ITEMS:
            print(f"Unknown section: {sec}")
            continue
        result = upload_section(sec, by_section.get(sec, []), ARCHIVE_ITEMS[sec], dry_run)
        if len(result) == 3:
            ok, skip, sf = result
        else:
            ok, skip = result
            sf = []
        total_ok      += ok
        total_skipped += skip
        all_skipped_files.extend(sf)

    print(f"\n{'═'*60}")
    print(f"  GRAND TOTAL  Uploaded: {total_ok}  |  Skipped: {total_skipped}")
    print('═'*60)

    if all_skipped_files:
        with open(SKIP_LOG, "w") as f:
            f.write("\n".join(all_skipped_files))
        print(f"\nSkipped files logged to: {SKIP_LOG}")

    print("\nArchive items:")
    for sec, cfg in ARCHIVE_ITEMS.items():
        if sec in sections_to_run:
            print(f"  https://archive.org/details/{cfg['identifier']}")

if __name__ == "__main__":
    main()
