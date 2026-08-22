"""
upload_to_archive.py
--------------------
Uploads IGCSE PDFs from public/pdfs/ to the IGCSE Internet Archive item.
Uploads one file at a time so a single bad PDF never aborts a whole batch.
Files that IA permanently rejects (corrupt PDFs) are logged and skipped.

Run from the repo root: python scripts/upload_to_archive.py

Requires: pip install internetarchive
Auth:     ia configure   (first time only)
"""

import os
import glob
from internetarchive import upload, get_item

# ── Config ────────────────────────────────────────────────────
IDENTIFIER  = "student-archive-igcse-pastpapers"
TITLE       = "Student Archive – IGCSE Past Papers"
DESCRIPTION = "Cambridge IGCSE past papers and mark schemes hosted for studentarchive.xyz"
PDF_DIR     = "public/pdfs"
SKIP_LOG    = "upload_igcse_skipped.txt"   # rejected files written here
# ─────────────────────────────────────────────────────────────

def is_igcse_pdf(filename: str) -> bool:
    base = os.path.basename(filename)
    return len(base) > 4 and base[0] == '0' and base[1:4].isdigit() and base[4] == '_'

def main():
    all_pdfs = sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf")))
    pdfs = [p for p in all_pdfs if is_igcse_pdf(p)]

    print(f"Found {len(pdfs)} IGCSE PDFs  (filtered from {len(all_pdfs)} total)")

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
        print("Nothing to upload — all IGCSE PDFs already on archive.org!")
        print(f"View: https://archive.org/details/{IDENTIFIER}")
        return

    metadata = dict(
        title=TITLE,
        description=DESCRIPTION,
        mediatype="texts",
        subject="IGCSE;Cambridge;Past Papers;Education",
    )

    DELAY_OK      = 2      # seconds between every successful upload
    DELAY_RATELIM = 90     # seconds to wait after any rate-limit hit

    ok = skipped = 0
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
                import time; time.sleep(DELAY_OK)
                break
            except Exception as e:
                err = str(e).lower()
                attempts += 1
                if any(k in err for k in ("rationed", "overloaded", "reduce your request", "accesskey_tasks", "503", "429")):
                    if attempts < 4:
                        print(f"\n  rate limited — waiting {DELAY_RATELIM}s (attempt {attempts}/3)...", end=" ", flush=True)
                        import time; time.sleep(DELAY_RATELIM)
                    else:
                        print(f"✗ RATE LIMITED (gave up)")
                        skipped_files.append(f"{name}  [rate limited]")
                        skipped += 1
                elif any(k in err for k in ("unacceptable", "checking pdf", "invalid")):
                    print(f"✗ SKIP (corrupt PDF)")
                    skipped_files.append(name)
                    skipped += 1
                    break
                else:
                    print(f"✗ ERROR: {err}")
                    skipped_files.append(f"{name}  [{err}]")
                    skipped += 1
                    break

        if i % 50 == 0:
            print(f"\n  — Progress: {i}/{len(to_upload)}  Uploaded: {ok}  Skipped: {skipped}\n")

    print(f"\n✅ Done!  Uploaded: {ok}  |  Skipped/failed: {skipped}")
    print(f"View: https://archive.org/details/{IDENTIFIER}")

    if skipped_files:
        with open(SKIP_LOG, "w") as f:
            f.write("\n".join(skipped_files))
        print(f"Skipped files logged to: {SKIP_LOG}")

if __name__ == "__main__":
    main()
