"""
download-corrupt-from-exammate.py
----------------------------------
Reads upload_igcse_skipped.txt (produced by upload_to_archive.py) and
attempts to re-download each corrupt/rejected PDF from two fallback sources:

  1. XtremePapers  (https://papers.xtremepaperscom/CIE/...)
  2. exam-mate     (https://www.exam-mate.com/...)

Successfully downloaded files replace the local copy in public/pdfs/.
After running this, re-run upload_to_archive.py to upload the fresh copies.

Usage:
  python scripts/download-corrupt-from-exammate.py
"""

import os
import re
import time
import urllib.request
from pathlib import Path

SKIP_LOG  = "upload_igcse_skipped.txt"
PDF_DIR   = Path("public/pdfs")
MIN_SIZE  = 30 * 1024   # 30 KB

# ── URL builders ──────────────────────────────────────────────────────────────
# PapaCambridge pattern (original source — in case they've since fixed the file)
PAPACAMBRIDGE = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/{name}"

# XtremePapers mirror
XTREME = "https://papers.xtremepapers.com/CIE/Cambridge%20IGCSE/{subject}/{name}"

# exam-mate direct PDF link
# Pattern: https://www.exam-mate.com/past-papers/{code}/{year}/{season_full}/{name}
# season codes: m→february-march  s→may-june  w→october-november
SEASON_FULL = {"m": "february-march", "s": "may-june", "w": "october-november"}

EXAMMATE = "https://www.exam-mate.com/past-papers/{code}/{year}/{season}/{name}"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

SUBJECT_NAMES = {
    "0417": "Information and Communication Technology",
    "0450": "Business Studies",
    "0452": "Accounting",
    "0455": "Economics",
    "0457": "Global Perspectives",
    "0478": "Computer Science",
    "0500": "First Language English",
    "0520": "French - Foreign Language",
    "0549": "Hindi as a Second Language",
    "0580": "Mathematics",
    "0606": "Additional Mathematics",
    "0610": "Biology",
    "0620": "Chemistry",
    "0625": "Physics",
}


def parse_filename(name: str):
    """Parse e.g. '0610_s20_qp_11.pdf' → (code, session, year2, type, paper)"""
    m = re.match(r"^(\d{4})_([msw])(\d{2})_([a-z]+)_?(\w+)?\.pdf$", name)
    if not m:
        return None
    code, sess, yr2, typ, paper = m.groups()
    year = 2000 + int(yr2)
    return {"code": code, "sess": sess, "year": year, "type": typ, "paper": paper, "name": name}


def try_download(url: str, dest: Path) -> bool:
    """Download url → dest. Returns True if a valid PDF was saved."""
    tmp = dest.with_suffix(".tmp")
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp, open(tmp, "wb") as f:
            f.write(resp.read())
        size = tmp.stat().st_size
        if size < MIN_SIZE:
            tmp.unlink(missing_ok=True)
            return False
        # Verify PDF magic bytes
        with open(tmp, "rb") as f:
            magic = f.read(4)
        if magic[:2] != b"%P":
            tmp.unlink(missing_ok=True)
            return False
        tmp.rename(dest)
        return True
    except Exception:
        tmp.unlink(missing_ok=True)
        return False


def build_urls(info: dict) -> list[str]:
    """Return candidate URLs to try for this file."""
    name      = info["name"]
    code      = info["code"]
    sess      = info["sess"]
    year      = info["year"]
    yr2       = str(year)[2:]
    subj_name = SUBJECT_NAMES.get(code, code)
    season    = SEASON_FULL.get(sess, sess)

    return [
        # 1. PapaCambridge direct (maybe they've re-uploaded a fixed version)
        PAPACAMBRIDGE.format(name=name),
        # 2. XtremePapers
        XTREME.format(subject=subj_name, name=name),
        # 3. exam-mate
        EXAMMATE.format(code=code, year=year, season=season, name=name),
    ]


def main():
    if not os.path.exists(SKIP_LOG):
        print(f"Skip log not found: {SKIP_LOG}")
        print("Run upload_to_archive.py first to generate it.")
        return

    with open(SKIP_LOG) as f:
        lines = [l.strip() for l in f if l.strip()]

    # Extract just the filename (skip log may have trailing error notes)
    filenames = [l.split()[0] for l in lines]
    print(f"Found {len(filenames)} files to re-download\n")

    recovered  = []
    still_bad  = []

    for i, name in enumerate(filenames, 1):
        dest = PDF_DIR / name
        info = parse_filename(name)
        if not info:
            print(f"[{i}/{len(filenames)}] {name}  — can't parse filename, skipping")
            still_bad.append(name)
            continue

        print(f"[{i}/{len(filenames)}] {name}", end="  ", flush=True)
        urls = build_urls(info)
        success = False

        for url in urls:
            source = url.split("/")[2]   # domain for display
            if try_download(url, dest):
                print(f"✓  ({source})")
                recovered.append(f"{name}  [{source}]")
                success = True
                break
            time.sleep(0.5)

        if not success:
            print("✗  all sources failed")
            still_bad.append(name)

        time.sleep(0.3)   # be polite

    print(f"\n✅  Recovered: {len(recovered)}  |  Still failed: {len(still_bad)}")

    if recovered:
        print("\nRecovered files:")
        for r in recovered:
            print(f"  {r}")
        print("\nNow re-run:  python scripts/upload_to_archive.py")

    if still_bad:
        with open("upload_igcse_unrecoverable.txt", "w") as f:
            f.write("\n".join(still_bad))
        print(f"\nUnrecoverable files logged to: upload_igcse_unrecoverable.txt")


if __name__ == "__main__":
    main()
