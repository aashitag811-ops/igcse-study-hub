"""
Re-extract All Questions with Polished Parser V2
Cleans old images and extracts fresh with all fixes applied
"""

import os
import shutil

# Paths
output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"
backup_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions_backup_v1"

# Backup existing images
if os.path.exists(output_dir):
    print("Backing up existing images to questions_backup_v1...")
    if os.path.exists(backup_dir):
        shutil.rmtree(backup_dir)
    shutil.copytree(output_dir, backup_dir)
    print(f"[OK] Backup created: {backup_dir}")
    
    # Clean output directory
    shutil.rmtree(output_dir)
    os.makedirs(output_dir)
    print(f"[OK] Cleaned output directory")
else:
    os.makedirs(output_dir)
    print(f"[OK] Created output directory")

print("\nNow run:")
print("1. python scripts/extract-full-question-images-v2.py")
print("2. python scripts/extract-missing-questions-v2.py")
print("\nThis will extract all 40 questions with polishing fixes applied.")

# Made with Bob
