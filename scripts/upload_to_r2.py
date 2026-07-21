# -*- coding: utf-8 -*-
"""
upload_to_r2.py
---------------
Uploads all local assets to a Cloudflare R2 bucket using the S3-compatible API.

Assets uploaded:
  public/pdfs/**          -> r2://your-bucket/pdfs/
  public/images/**        -> r2://your-bucket/images/
  public/papers/**        -> r2://your-bucket/papers/   (optional, JSONs)

Setup (one-time):
  1. pip install boto3
  2. In Cloudflare dashboard:
       R2 -> your bucket -> Settings -> S3 API -> copy endpoint
       R2 -> Manage R2 API Tokens -> create token with Object Read & Write
  3. Copy .env.local.example to .env.local and fill in:
       R2_ACCOUNT_ID=...
       R2_ACCESS_KEY_ID=...
       R2_SECRET_ACCESS_KEY=...
       R2_BUCKET_NAME=igcse-assets
       NEXT_PUBLIC_ASSET_BASE_URL=https://pub-XXXX.r2.dev

Usage:
  # Upload everything (first time):
  python scripts/upload_to_r2.py

  # Upload only PDFs:
  python scripts/upload_to_r2.py --pdfs

  # Upload only images:
  python scripts/upload_to_r2.py --images

  # Upload only JSON papers:
  python scripts/upload_to_r2.py --papers

  # Dry run (list what would be uploaded):
  python scripts/upload_to_r2.py --dry-run

  # Skip files already on R2 (fast incremental sync):
  python scripts/upload_to_r2.py --skip-existing
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    print("ERROR: boto3 not installed. Run: pip install boto3")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(".env.local")
except ImportError:
    # dotenv not installed — read from environment directly
    pass

# ── Config ─────────────────────────────────────────────────────────────────
ROOT             = Path(__file__).parent.parent
ACCOUNT_ID       = os.environ.get("R2_ACCOUNT_ID", "")
ACCESS_KEY       = os.environ.get("R2_ACCESS_KEY_ID", "")
SECRET_KEY       = os.environ.get("R2_SECRET_ACCESS_KEY", "")
BUCKET_NAME      = os.environ.get("R2_BUCKET_NAME", "igcse-assets")

CONTENT_TYPES = {
    ".pdf":  "application/pdf",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".json": "application/json",
}

UPLOAD_SETS = {
    "pdfs":    (ROOT / "public" / "pdfs",    "pdfs"),
    "images":  (ROOT / "public" / "images",  "images"),
    "papers":  (ROOT / "public" / "papers",  "papers"),
}


def make_client():
    if not ACCOUNT_ID:
        print("ERROR: R2_ACCOUNT_ID not set. Add it to .env.local")
        sys.exit(1)
    if not ACCESS_KEY or not SECRET_KEY:
        print("ERROR: R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY not set.")
        sys.exit(1)

    endpoint = "https://%s.r2.cloudflarestorage.com" % ACCOUNT_ID
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
    )


def list_existing_keys(client, prefix=""):
    """Return a set of all keys currently in the bucket under `prefix`."""
    keys = set()
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys.add(obj["Key"])
    return keys


def upload_directory(client, local_dir, r2_prefix, dry_run=False, skip_existing=False):
    """Upload all files under `local_dir` to r2_prefix/."""
    if not local_dir.exists():
        print("  [SKIP] Directory not found: %s" % local_dir)
        return 0, 0

    existing = set()
    if skip_existing:
        print("  Fetching existing keys from R2 (prefix=%s)..." % r2_prefix)
        existing = list_existing_keys(client, prefix=r2_prefix + "/")
        print("  Found %d existing objects" % len(existing))

    files = list(local_dir.rglob("*"))
    files = [f for f in files if f.is_file()]
    total = len(files)
    uploaded = 0
    skipped  = 0

    print("  %d files to process in %s" % (total, local_dir))

    for i, file_path in enumerate(files):
        relative = file_path.relative_to(local_dir)
        r2_key   = "%s/%s" % (r2_prefix, str(relative).replace("\\", "/"))

        if skip_existing and r2_key in existing:
            skipped += 1
            continue

        ext = file_path.suffix.lower()
        content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

        if dry_run:
            print("  [DRY] %s -> %s" % (file_path.name, r2_key))
            uploaded += 1
            continue

        try:
            client.upload_file(
                str(file_path),
                BUCKET_NAME,
                r2_key,
                ExtraArgs={
                    "ContentType": content_type,
                    # Cache for 1 year — these files never change
                    "CacheControl": "public, max-age=31536000, immutable",
                },
            )
            uploaded += 1
            if (i + 1) % 50 == 0 or uploaded == 1:
                pct = int((i + 1) / total * 100)
                print("  [%d%%] %d/%d uploaded (last: %s)" % (pct, uploaded, total, file_path.name))
        except ClientError as e:
            print("  [ERROR] %s: %s" % (r2_key, e))

    return uploaded, skipped


def main():
    parser = argparse.ArgumentParser(description="Upload assets to Cloudflare R2")
    parser.add_argument("--pdfs",          action="store_true", help="Upload PDFs only")
    parser.add_argument("--images",        action="store_true", help="Upload images only")
    parser.add_argument("--papers",        action="store_true", help="Upload JSON papers only")
    parser.add_argument("--dry-run",       action="store_true", help="List files without uploading")
    parser.add_argument("--skip-existing", action="store_true", help="Skip files already on R2")
    args = parser.parse_args()

    # If no specific set chosen, do all
    do_pdfs   = args.pdfs   or not (args.pdfs or args.images or args.papers)
    do_images = args.images or not (args.pdfs or args.images or args.papers)
    do_papers = args.papers or not (args.pdfs or args.images or args.papers)

    print("=" * 60)
    print("Cloudflare R2 Upload Tool")
    print("Bucket : %s" % BUCKET_NAME)
    if args.dry_run:
        print("MODE   : DRY RUN (no files will be uploaded)")
    print("=" * 60)

    if args.dry_run:
        client = None
    else:
        try:
            client = make_client()
            # Quick connectivity test
            client.head_bucket(Bucket=BUCKET_NAME)
            print("[OK] Connected to R2 bucket: %s" % BUCKET_NAME)
        except NoCredentialsError:
            print("[ERROR] Invalid credentials. Check R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY")
            sys.exit(1)
        except ClientError as e:
            print("[ERROR] Cannot access bucket: %s" % e)
            print("  Make sure the bucket exists and your token has Object Read & Write permissions.")
            sys.exit(1)

    total_uploaded = 0
    total_skipped  = 0

    sets_to_run = []
    if do_pdfs:   sets_to_run.append("pdfs")
    if do_images: sets_to_run.append("images")
    if do_papers: sets_to_run.append("papers")

    for key in sets_to_run:
        local_dir, r2_prefix = UPLOAD_SETS[key]
        print("\n[%s] Uploading %s -> r2://%s/%s/" % (key.upper(), local_dir, BUCKET_NAME, r2_prefix))
        up, sk = upload_directory(
            client, local_dir, r2_prefix,
            dry_run=args.dry_run,
            skip_existing=args.skip_existing,
        )
        total_uploaded += up
        total_skipped  += sk

    print("\n" + "=" * 60)
    print("Done: %d uploaded | %d skipped" % (total_uploaded, total_skipped))
    print("=" * 60)

    if not args.dry_run and total_uploaded > 0:
        print("\nNext step: set NEXT_PUBLIC_ASSET_BASE_URL in .env.local:")
        print("  NEXT_PUBLIC_ASSET_BASE_URL=https://pub-XXXX.r2.dev")
        print("  (replace XXXX with your R2 public bucket domain)")


if __name__ == "__main__":
    main()
