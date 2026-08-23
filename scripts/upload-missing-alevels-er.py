"""
upload-missing-alevels-er.py
------------------------------
Downloads missing A-level ER PDFs (2024–2025 sessions) from XtremePapers
and uploads them to the Internet Archive item.

Missing sessions identified: s24, w24, m24, s25, w25
(m25 already exists for most subjects)

Usage:
  python scripts/upload-missing-alevels-er.py

Requirements:
  pip install requests internetarchive
  ia configure   (run once, enter your Archive.org credentials)
"""

import os
import time
import requests
import internetarchive
from pathlib import Path

ARCHIVE_ITEM   = "student-archive-alevels-pastpapers"
TEMP_DIR       = Path("scripts") / "temp-er-missing"
IA_ACCESS_KEY  = os.environ.get("IA_ACCESS_KEY", "")
IA_SECRET_KEY  = os.environ.get("IA_SECRET_KEY", "")

# Subjects to process
SUBJECTS = [
    "9700", "9701", "9702", "9709", "9231",
    "9608", "9618", "9609", "9708", "9706",
    "9093", "8021",
]

# Sessions missing from Archive.org (checked manually)
MISSING_SESSIONS = ["s24", "w24", "m24", "s25", "w25"]

# XtremePapers CDN patterns to try
# Format: subject/year/session  e.g. 9700/2024/May-June
XTREMEPAPERS_BASE = "https://papers.xtremepastpapers.com/Cambridge%20International%20AS%20and%20A%20Level"

SESSION_MAP = {
    "m": ("February-March", "03"),
    "s": ("May-June",       "06"),
    "w": ("October-November","11"),
}

PAPACAMBRIDGE_BASE = "https://pastpapers.papacambridge.com/Cambridge%20International%20A%20Levels"

SUBJECT_NAMES = {
    "9700": "Biology",
    "9701": "Chemistry",
    "9702": "Physics",
    "9709": "Mathematics",
    "9231": "Further%20Mathematics",
    "9608": "Computer%20Science%20(9608)",
    "9618": "Computer%20Science%20(9618)",
    "9609": "Business",
    "9708": "Economics",
    "9706": "Accounting",
    "9093": "English%20Language",
    "8021": "English%20General%20Paper",
}


def try_download(urls: list[str], dest: Path) -> bool:
    """Try each URL in order, save first successful one."""
    for url in urls:
        try:
            r = requests.get(url, timeout=30, stream=True, headers={
                "User-Agent": "Mozilla/5.0 (compatible; student-archive-bot/1.0)"
            })
            if r.status_code == 200 and int(r.headers.get("content-length", 1)) > 1000:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with open(dest, "wb") as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                return True
        except Exception:
            pass
    return False


def build_urls(subject: str, session: str) -> list[str]:
    """Build candidate download URLs for an ER PDF."""
    season_code = session[0]   # m / s / w
    yr2         = session[1:]   # 24 / 25
    yr4         = f"20{yr2}"    # 2024 / 2025

    season_name, _ = SESSION_MAP[season_code]
    subj_name      = SUBJECT_NAMES.get(subject, subject)
    fname          = f"{subject}_{session}_er.pdf"

    urls = [
        # XtremePapers
        f"{XTREMEPAPERS_BASE}/{subject}%20{subj_name}/{yr4}/{fname}",
        f"{XTREMEPAPERS_BASE}/{subject}/{yr4}/{fname}",
        # PapaCambridge
        f"{PAPACAMBRIDGE_BASE}/{subject}%20{subj_name}/{yr4}/{fname}",
        # Direct Archive.org (in case it was uploaded with a slight delay)
        f"https://archive.org/download/{ARCHIVE_ITEM}/{fname}",
    ]
    return urls


def upload_to_archive(local_path: Path, remote_name: str) -> bool:
    """Upload a file to the Archive.org item."""
    try:
        ia = internetarchive.get_item(ARCHIVE_ITEM)
        r  = ia.upload(
            str(local_path),
            key=remote_name,
            access_key=IA_ACCESS_KEY or None,
            secret_key=IA_SECRET_KEY or None,
            retries=3,
            retries_sleep=5,
            verbose=False,
        )
        return True
    except Exception as e:
        print(f"      Upload error: {e}")
        return False


def main():
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    total_uploaded = 0

    for subject in SUBJECTS:
        print(f"\n{'='*50}")
        print(f"Subject: {subject}")
        print(f"{'='*50}")

        for session in MISSING_SESSIONS:
            fname      = f"{subject}_{session}_er.pdf"
            local_path = TEMP_DIR / fname

            print(f"  {fname} ...", end=" ", flush=True)

            # Skip if already downloaded
            if not local_path.exists():
                urls = build_urls(subject, session)
                ok   = try_download(urls, local_path)
                if not ok:
                    print("not found")
                    continue
                print("downloaded", end=" ", flush=True)
            else:
                print("cached", end=" ", flush=True)

            # Upload to Archive.org
            ok = upload_to_archive(local_path, fname)
            if ok:
                print("→ uploaded ✓")
                total_uploaded += 1
            else:
                print("→ upload failed")

            time.sleep(2)  # rate limit

    print(f"\nDone. Uploaded {total_uploaded} ER PDFs to Archive.org.")
    print("Now re-run: python scripts/extract-alevels-er.py")


if __name__ == "__main__":
    main()

# Made with Bob
