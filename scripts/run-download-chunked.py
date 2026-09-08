"""
run-download-chunked.py
────────────────────────────────────────────────────────────────────
Runs download-from-bestexamhelp.js in chunks of 2000 files at a time.
Each chunk is a fresh Node.js process, so Windows TCP port exhaustion
(TIME_WAIT buildup) is avoided — ports recycle between chunks.

Usage:
  python scripts/run-download-chunked.py
  python scripts/run-download-chunked.py --chunk-size 1500
  python scripts/run-download-chunked.py --from-chunk 5   (resume from chunk 5)
"""

import subprocess
import sys
import os
import time
import json
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────
CATALOGUE_PATH = Path("scripts/beh-catalogue.json")
PASTPAPERS_DIR = Path("scripts/pastpapers")
CHUNK_SIZE     = 2000      # files per Node.js invocation
PAUSE_BETWEEN  = 15        # seconds between chunks (lets ports recycle)
CONCURRENCY    = 3         # passed to the chunk downloader
TIMEOUT_MS     = 25000
# ─────────────────────────────────────────────────────────────────

def count_downloaded():
    return len(list(PASTPAPERS_DIR.glob("*.pdf")))

def main():
    # Parse args
    chunk_size  = CHUNK_SIZE
    from_chunk  = 0
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--chunk-size" and i+2 <= len(sys.argv)-1:
            chunk_size = int(sys.argv[i+2])
        if arg == "--from-chunk" and i+2 <= len(sys.argv)-1:
            from_chunk = int(sys.argv[i+2])

    # Load catalogue and build full job list
    with open(CATALOGUE_PATH) as f:
        cat = json.load(f)

    SECTION_BASE = {
        "igcse":   "cambridge-igcse",
        "igcse91": "cambridge-igcse-9-1",
        "alevel":  "cambridge-international-a-level",
        "olevel":  "cambridge-o-level",
    }

    all_jobs = []  # list of (url, filename)
    for code, data in cat.items():
        base = SECTION_BASE.get(data["label"])
        if not base:
            continue
        for filename in data["files"]:
            import re
            m = re.search(r'_[msw](\d{2})_', filename)
            if not m:
                continue
            yr   = int(m.group(1))
            year = 2000 + yr if yr < 50 else 1900 + yr
            url  = f"https://bestexamhelp.com/exam/{base}/{data['slug']}/{year}/{filename}"
            all_jobs.append((url, filename))

    total = len(all_jobs)
    chunks = [all_jobs[i:i+chunk_size] for i in range(0, total, chunk_size)]
    n_chunks = len(chunks)

    print(f"Total files   : {total}")
    print(f"Chunk size    : {chunk_size}")
    print(f"Total chunks  : {n_chunks}")
    print(f"Starting from : chunk {from_chunk+1}/{n_chunks}")
    print(f"Already on disk: {count_downloaded()}\n")

    PASTPAPERS_DIR.mkdir(parents=True, exist_ok=True)

    for chunk_idx in range(from_chunk, n_chunks):
        chunk = chunks[chunk_idx]
        already = count_downloaded()

        # Skip chunks where all files are already downloaded
        chunk_files = {job[1] for job in chunk}
        existing    = {p.name for p in PASTPAPERS_DIR.glob("*.pdf")}
        remaining   = chunk_files - existing
        if not remaining:
            print(f"[Chunk {chunk_idx+1}/{n_chunks}] All {len(chunk)} files already on disk — skipping")
            continue

        print(f"\n[Chunk {chunk_idx+1}/{n_chunks}]  {len(chunk)} files  ({len(remaining)} new)  "
              f"(disk: {already})")

        # Write a temp job file for this chunk
        job_file = Path("scripts/_chunk_jobs.json")
        with open(job_file, "w") as f:
            json.dump(chunk, f)

        # Spawn Node.js for this chunk
        result = subprocess.run(
            ["node", "scripts/_chunk_downloader.js"],
            cwd=os.getcwd(),
            timeout=3600,   # max 1 hour per chunk
        )

        if result.returncode != 0:
            print(f"  ⚠  Chunk {chunk_idx+1} exited with code {result.returncode}")

        after = count_downloaded()
        print(f"  Chunk done. Disk: {after} (+{after-already})")

        if chunk_idx < n_chunks - 1:
            print(f"  Pausing {PAUSE_BETWEEN}s for TCP ports to recycle...")
            time.sleep(PAUSE_BETWEEN)

    print(f"\n✅  All chunks done!  Total files on disk: {count_downloaded()}")
    job_file = Path("scripts/_chunk_jobs.json")
    if job_file.exists():
        job_file.unlink()

if __name__ == "__main__":
    main()
