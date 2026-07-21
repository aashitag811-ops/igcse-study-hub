# -*- coding: utf-8 -*-
"""
upload_images_to_github.py
--------------------------
Pushes all MCQ question images to a dedicated public GitHub repo
("igcse-assets") using plain git. This is far faster than the API
approach and has no rate limits.

The resulting raw URL for every image will be:
  https://raw.githubusercontent.com/<owner>/igcse-assets/main/images/biology/0610_m20_qp_22/q1.png

Set this in .env.local once done:
  NEXT_PUBLIC_ASSET_BASE_URL=https://raw.githubusercontent.com/<owner>/igcse-assets/main

Setup (one-time):
  1. Create a NEW PUBLIC repo at github.com called "igcse-assets"
     (tick "Add a README file" so it has an initial commit)
  2. Run this script - it clones that repo, copies images in, and pushes

Requirements: git must be installed and authenticated (you're already using git)

Usage:
  python scripts/upload_images_to_github.py --owner YOUR_GITHUB_USERNAME

  # Dry run - just shows what would happen
  python scripts/upload_images_to_github.py --owner YOUR_GITHUB_USERNAME --dry-run
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT       = Path(__file__).parent.parent
IMAGES_DIR = ROOT / "public" / "images"
TEMP_DIR   = ROOT / ".bob" / "igcse-assets-clone"

SUBJECTS = ["biology", "chemistry", "economics", "physics", "mcq"]


def run(cmd, cwd=None, check=True):
    """Run a shell command, print it, and return output."""
    print("  $ %s" % " ".join(cmd))
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.stdout.strip():
        print("    " + result.stdout.strip()[:200])
    if result.returncode != 0 and check:
        print("  ERROR: %s" % result.stderr.strip()[:300])
        sys.exit(1)
    return result


def count_files(subject):
    d = IMAGES_DIR / subject
    if not d.exists():
        return 0
    return len([f for f in d.rglob("*") if f.is_file()])


def main():
    parser = argparse.ArgumentParser(description="Push MCQ images to github.com/<owner>/igcse-assets")
    parser.add_argument("--owner",   required=True, help="Your GitHub username")
    parser.add_argument("--repo",    default="igcse-assets", help="Asset repo name (default: igcse-assets)")
    parser.add_argument("--subject", help="Push specific subject only (biology/chemistry/economics/physics/mcq)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without doing it")
    args = parser.parse_args()

    repo_url = "https://github.com/%s/%s.git" % (args.owner, args.repo)
    subjects = [args.subject] if args.subject else SUBJECTS

    print("=" * 60)
    print("GitHub Image Pusher")
    print("Target: %s" % repo_url)
    print("Subjects: %s" % ", ".join(subjects))
    for s in subjects:
        n = count_files(s)
        print("  %s: %d files" % (s, n))
    if args.dry_run:
        print("MODE: DRY RUN - nothing will be pushed")
        return
    print("=" * 60)

    # ── Step 1: Clone the assets repo ──────────────────────────────────────
    if TEMP_DIR.exists():
        print("\n[1/4] Found existing clone at %s - pulling latest..." % TEMP_DIR)
        run(["git", "pull"], cwd=TEMP_DIR)
    else:
        print("\n[1/4] Cloning %s..." % repo_url)
        TEMP_DIR.parent.mkdir(parents=True, exist_ok=True)
        run(["git", "clone", repo_url, str(TEMP_DIR)])

    # ── Step 2: Copy images into the clone ─────────────────────────────────
    print("\n[2/4] Copying images into clone...")
    images_dest = TEMP_DIR / "images"
    images_dest.mkdir(exist_ok=True)

    for subject in subjects:
        src = IMAGES_DIR / subject
        dst = images_dest / subject
        if not src.exists():
            print("  [SKIP] %s not found" % src)
            continue
        print("  Copying %s -> %s..." % (src, dst))
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(str(src), str(dst))
        n = count_files(subject)
        print("    Copied %d files" % n)

    # ── Step 3: Git add + commit ────────────────────────────────────────────
    print("\n[3/4] Staging and committing...")
    run(["git", "add", "images/"], cwd=TEMP_DIR)

    # Check if there's actually anything to commit
    status = run(["git", "status", "--short"], cwd=TEMP_DIR, check=False)
    if not status.stdout.strip():
        print("  Nothing new to commit - all images already up to date.")
    else:
        changed_count = len(status.stdout.strip().split("\n"))
        print("  %d files staged" % changed_count)
        run(["git", "commit", "-m", "add MCQ images: %s" % ", ".join(subjects)], cwd=TEMP_DIR)

    # ── Step 4: Push ────────────────────────────────────────────────────────
    print("\n[4/4] Pushing to GitHub...")
    run(["git", "push", "origin", "main"], cwd=TEMP_DIR)

    # ── Done ────────────────────────────────────────────────────────────────
    base_url = "https://raw.githubusercontent.com/%s/%s/main" % (args.owner, args.repo)
    print("\n" + "=" * 60)
    print("Done! Images are live at:")
    print("  %s/images/biology/0610_m20_qp_22/q1.png" % base_url)
    print("")
    print("Add this to your .env.local:")
    print("  NEXT_PUBLIC_ASSET_BASE_URL=%s" % base_url)
    print("")
    print("And add it to Vercel:")
    print("  vercel env add NEXT_PUBLIC_ASSET_BASE_URL")
    print("=" * 60)


if __name__ == "__main__":
    main()
