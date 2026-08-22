"""
download-skipped-from-xtreme.py
--------------------------------
Reads upload_igcse_skipped.txt and tries to re-download every file
from XtremePapers. Saves valid PDFs back to public/pdfs/.

After running, re-run upload_to_archive.py to upload the recovered files.

Usage: python scripts/download-skipped-from-xtreme.py
"""

import os
import re
import time
import urllib.request
from pathlib import Path

SKIP_LOG = "upload_igcse_skipped.txt"
PDF_DIR  = Path("public/pdfs")
MIN_SIZE = 30 * 1024   # 30 KB

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

# XtremePapers subject folder names (code → folder name in their URL)
SUBJECT_FOLDERS = {
    "0417": "Information%20and%20Communication%20Technology%20(0417)",
    "0450": "Business%20Studies%20(0450)",
    "0452": "Accounting%20(0452)",
    "0455": "Economics%20(0455)",
    "0457": "Global%20Perspectives%20(0457)",
    "0478": "Computer%20Science%20(0478)",
    "0500": "First%20Language%20English%20(0500)",
    "0520": "French%20(0520)",
    "0549": "Hindi%20as%20a%20Second%20Language%20(0549)",
    "0580": "Mathematics%20(0580)",
    "0606": "Additional%20Mathematics%20(0606)",
    "0610": "Biology%20(0610)",
    "0620": "Chemistry%20(0620)",
    "0625": "Physics%20(0625)",
}

XTREME_BASE = "https://papers.xtremepapers.com/CIE/Cambridge%20IGCSE"


def xtreme_url(code: str, filename: str) -> str:
    folder = SUBJECT_FOLDERS.get(code)
    if not folder:
        return None
    return f"{XTREME_BASE}/{folder}/{filename}"


def try_download(url: str, dest: Path) -> bool:
    tmp = dest.with_suffix(".tmp")
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp, open(tmp, "wb") as f:
            f.write(resp.read())
        if tmp.stat().st_size < MIN_SIZE:
            tmp.unlink(missing_ok=True)
            return False
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


def main():
    if not os.path.exists(SKIP_LOG):
        print(f"Skip log not found: {SKIP_LOG}")
        print("Run upload_to_archive.py first to generate it.")
        return

    with open(SKIP_LOG) as f:
        # each line is just a filename, possibly with trailing notes after whitespace
        filenames = [l.strip().split()[0] for l in f if l.strip()]

    # Separate QP/MS from ER/GT
    qp_ms = [f for f in filenames if not any(f.endswith(f"_{t}.pdf") for t in ("er", "gt"))]
    er_gt = [f for f in filenames if any(f.endswith(f"_{t}.pdf") for t in ("er", "gt"))]

    print(f"Total skipped  : {len(filenames)}")
    print(f"QP/MS files    : {len(qp_ms)}")
    print(f"ER/GT files    : {len(er_gt)}")
    print()

    recovered   = []
    not_found   = []

    all_files = filenames  # try everything — ER/GT might exist on XtremePapers

    for i, name in enumerate(all_files, 1):
        dest = PDF_DIR / name
        m = re.match(r"^(\d{4})_", name)
        if not m:
            print(f"[{i}/{len(all_files)}] {name}  — can't parse, skip")
            not_found.append(name)
            continue

        code = m.group(1)
        url  = xtreme_url(code, name)
        if not url:
            print(f"[{i}/{len(all_files)}] {name}  — no XtremePapers folder mapping")
            not_found.append(name)
            continue

        tag = "ER/GT" if any(name.endswith(f"_{t}.pdf") for t in ("er","gt")) else "QP/MS"
        print(f"[{i}/{len(all_files)}] [{tag}] {name}", end="  ", flush=True)

        if try_download(url, dest):
            print("✓")
            recovered.append(name)
        else:
            print("✗ not found")
            not_found.append(name)

        time.sleep(0.3)

    print(f"\n✅ Recovered : {len(recovered)}")
    print(f"   Not found : {len(not_found)}")

    if recovered:
        print("\nRecovered:")
        for r in recovered:
            print(f"  {r}")
        print("\nNow re-run:  python scripts/upload_to_archive.py")

    if not_found:
        with open("upload_igcse_unrecoverable.txt", "w") as f:
            f.write("\n".join(not_found))
        print(f"\nUnrecoverable logged to: upload_igcse_unrecoverable.txt")


if __name__ == "__main__":
    main()
