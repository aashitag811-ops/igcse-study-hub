"""
upload-2026-to-archive.py
──────────────────────────
Uploads all 2026 papers from scripts/pastpapers-2026/ to the correct
Archive.org items (IGCSE or A-level based on subject code prefix).

Run after:  node scripts/download-2026.js

Usage:
    python scripts/upload-2026-to-archive.py
    python scripts/upload-2026-to-archive.py --dry-run   (list only, no upload)

Requires: pip install internetarchive
Auth:     ia configure  (first time only)
"""

import os
import sys
import glob
import time
from internetarchive import upload, get_item

# ── Config ────────────────────────────────────────────────────────────────────

PDF_DIR         = os.path.join(os.path.dirname(__file__), 'pastpapers-2026')
IGCSE_ITEM      = 'student-archive-igcse-pastpapers'
ALEVEL_ITEM     = 'student-archive-alevels-pastpapers'
SKIP_LOG        = os.path.join(os.path.dirname(__file__), '..', 'upload_2026_skipped.txt')

IGCSE_PREFIXES  = ('0',)    # 0xxx codes
ALEVEL_PREFIXES = ('9', '8')  # 9xxx + 8021

DELAY_OK       = 2    # seconds between uploads
DELAY_RATELIM  = 90   # seconds on rate-limit

DRY_RUN = '--dry-run' in sys.argv

# ── Helpers ───────────────────────────────────────────────────────────────────

def item_for(filename: str) -> str:
    """Return the archive.org identifier for a given filename."""
    first = os.path.basename(filename)[0]
    if first in ('9', '8'):
        return ALEVEL_ITEM
    return IGCSE_ITEM


def existing_files(identifier: str) -> set:
    """Fetch the set of filenames already uploaded to an IA item."""
    try:
        item  = get_item(identifier)
        return {f['name'] for f in item.files}
    except Exception as e:
        print(f'  ⚠  Could not fetch existing files for {identifier}: {e}')
        return set()


def load_skip_log() -> set:
    if os.path.exists(SKIP_LOG):
        with open(SKIP_LOG) as f:
            return {l.strip() for l in f if l.strip()}
    return set()


def log_skip(filename: str):
    with open(SKIP_LOG, 'a') as f:
        f.write(filename + '\n')


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    all_pdfs = sorted(glob.glob(os.path.join(PDF_DIR, '*.pdf')))
    if not all_pdfs:
        print(f'No PDFs found in {PDF_DIR}')
        print('Run: node scripts/download-2026.js first')
        return

    print(f'Found {len(all_pdfs)} PDFs in {PDF_DIR}')

    # Fetch existing files from both archive items once upfront
    print('Checking existing files on archive.org …')
    existing_igcse   = existing_files(IGCSE_ITEM)
    existing_alevel  = existing_files(ALEVEL_ITEM)
    skip_log         = load_skip_log()
    print(f'  IGCSE item  : {len(existing_igcse)} files already uploaded')
    print(f'  A-level item: {len(existing_alevel)} files already uploaded')

    to_upload = []
    for p in all_pdfs:
        base = os.path.basename(p)
        if base in skip_log:
            continue
        existing = existing_alevel if item_for(base) == ALEVEL_ITEM else existing_igcse
        if base not in existing:
            to_upload.append(p)

    print(f'\nFiles to upload: {len(to_upload)}\n')

    if DRY_RUN:
        for p in to_upload:
            print(f'  [DRY-RUN] {os.path.basename(p)}  →  {item_for(os.path.basename(p))}')
        return

    if not to_upload:
        print('Nothing to upload — all 2026 papers already on archive.org!')
        return

    # Group by identifier for efficient metadata calls
    igcse_meta = dict(
        title='Student Archive – IGCSE Past Papers',
        description='Cambridge IGCSE past papers and mark schemes hosted for studentarchive.xyz',
        mediatype='texts',
        subject='IGCSE;Cambridge;Past Papers;Education;2026',
    )
    alevel_meta = dict(
        title='Student Archive – A Level Past Papers',
        description='Cambridge AS & A Level past papers and mark schemes hosted for studentarchive.xyz',
        mediatype='texts',
        subject='A Level;Cambridge;Past Papers;Education;2026',
    )

    uploaded = 0
    errors   = 0

    for idx, p in enumerate(to_upload, 1):
        base       = os.path.basename(p)
        identifier = item_for(base)
        meta       = alevel_meta if identifier == ALEVEL_ITEM else igcse_meta

        print(f'[{idx}/{len(to_upload)}] {base}  →  {identifier}', end=' ', flush=True)

        try:
            result = upload(
                identifier,
                files={base: p},
                metadata=meta,
                retries=3,
                retries_sleep=30,
                verbose=False,
            )
            if result and result[0].status_code in (200, 201):
                print('✅')
                uploaded += 1
                time.sleep(DELAY_OK)
            elif result and result[0].status_code == 429:
                print(f'⏳ rate-limited — waiting {DELAY_RATELIM}s …')
                time.sleep(DELAY_RATELIM)
            else:
                code = result[0].status_code if result else '?'
                print(f'❌ HTTP {code}')
                log_skip(base)
                errors += 1
        except Exception as e:
            print(f'❌ {e}')
            log_skip(base)
            errors += 1

    print(f'\n✅ Uploaded : {uploaded}')
    print(f'❌ Errors   : {errors}')
    print(f'\nNext step: python scripts/extract-2026-er.py')


if __name__ == '__main__':
    main()
