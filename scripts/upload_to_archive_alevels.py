"""
upload_to_archive_alevels.py
----------------------------
Uploads A-Level PDFs from public/pdfs/ to the A-Level Internet Archive item.
Uploads one file at a time with a delay to avoid IA's S3 rate limit.

Run from the repo root: python scripts/upload_to_archive_alevels.py

Requires: pip install internetarchive
Auth:     ia configure   (first time only)
"""

import os
import glob
import time
from internetarchive import upload, get_item

# ── Config ────────────────────────────────────────────────────
IDENTIFIER  = "student-archive-alevels-pastpapers"
TITLE       = "Student Archive – AS & A Level Past Papers"
DESCRIPTION = (
    "Cambridge AS & A Level past papers and mark schemes hosted for studentarchive.xyz. "
    "Subjects: Biology 9700, Chemistry 9701, Physics 9702, Mathematics 9709, "
    "Further Mathematics 9231, Computer Science 9608/9618, Business 9609, "
    "Economics 9708, Accounting 9706, English Language 9093, English General Paper 8021."
)
PDF_DIR     = "public/pdfs"
SKIP_LOG    = "upload_alevels_skipped.txt"
DELAY_OK    = 1.5    # seconds between successful uploads
DELAY_ERR   = 60     # seconds to wait after a rate-limit error before retrying
# ─────────────────────────────────────────────────────────────

ALEVEL_PREFIXES = (
    "9700_", "9701_", "9702_",
    "9709_", "9231_",
    "9608_", "9618_",
    "9609_", "9708_", "9706_",
    "9093_", "8021_",
)

def is_alevel_pdf(filename: str) -> bool:
    base = os.path.basename(filename)
    return any(base.startswith(p) for p in ALEVEL_PREFIXES)

def main():
    all_pdfs = sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf")))
    pdfs = [p for p in all_pdfs if is_alevel_pdf(p)]

    print(f"Found {len(pdfs)} A-Level PDFs  (filtered from {len(all_pdfs)} total)")

    print("Checking existing files on archive.org (may take a moment)...")
    try:
        item = get_item(IDENTIFIER)
        existing = {f["name"] for f in item.files}
    except Exception:
        existing = set()
    print(f"Already uploaded : {len(existing)} files")

    to_upload = [p for p in pdfs if os.path.basename(p) not in existing]
    print(f"Files to upload  : {len(to_upload)}\n")

    if not to_upload:
        print("Nothing to upload — all A-Level PDFs already on archive.org!")
        print(f"View: https://archive.org/details/{IDENTIFIER}")
        return

    metadata = dict(
        title=TITLE,
        description=DESCRIPTION,
        mediatype="texts",
        subject="A Level;AS Level;Cambridge;Past Papers;Education",
    )

    ok = 0
    skipped = 0
    skipped_files = []

    for i, pdf_path in enumerate(to_upload, 1):
        name = os.path.basename(pdf_path)
        print(f"[{i}/{len(to_upload)}] {name}", end=" ... ", flush=True)

        attempts = 0
        while attempts < 4:
            try:
                r = upload(
                    IDENTIFIER,
                    files=[pdf_path],
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
                if any(k in err for k in ("rationed", "overloaded", "reduce your request", "accesskey_tasks", "503", "429")):
                    if attempts < 4:
                        print(f"\n  rate limited — waiting {DELAY_ERR}s (attempt {attempts}/3)...", end=" ", flush=True)
                        time.sleep(DELAY_ERR)
                    else:
                        print(f"✗ RATE LIMITED (gave up)")
                        skipped_files.append(f"{name}  [rate limited]")
                        skipped += 1
                elif any(k in err for k in ("unacceptable", "checking pdf", "invalid")):
                    print(f"✗ SKIP (corrupt PDF)")
                    skipped_files.append(f"{name}  [corrupt]")
                    skipped += 1
                    break
                else:
                    print(f"✗ ERROR: {err}")
                    skipped_files.append(f"{name}  [{err}]")
                    skipped += 1
                    break

        if i % 100 == 0:
            print(f"\n  ── Progress: {i}/{len(to_upload)}  Uploaded: {ok}  Skipped: {skipped} ──\n")

    print(f"\n✅ Done!  Uploaded: {ok}  |  Skipped/failed: {skipped}")
    print(f"View: https://archive.org/details/{IDENTIFIER}")

    if skipped_files:
        with open(SKIP_LOG, "w") as f:
            f.write("\n".join(skipped_files))
        print(f"Skipped files logged to: {SKIP_LOG}")
        print("Re-run this script to retry them (checksum=True skips already-uploaded ones).")

if __name__ == "__main__":
    main()
