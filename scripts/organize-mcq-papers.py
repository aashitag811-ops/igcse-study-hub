"""
MCQ Matchmaker Script
Organizes downloaded past papers into structured folders for MCQ processing.
Focuses on Paper 2 (Multiple Choice) - variants 21, 22, 23
"""

import os
import re
import sys
from pathlib import Path
import shutil
from collections import defaultdict

# Fix Windows encoding issues
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Define directories
DOWNLOADS_DIR = Path("pastpapers")
OUTPUT_DIR = Path("organized_mcq")

def organize_mcq_papers():
    """
    Scans the downloads folder and organizes MCQ papers (Paper 2) into:
    organized_mcq/SubjectCode-SubjectName/Year/Session/Variant/
    """
    
    # Pattern to match Cambridge IGCSE file naming
    # Example: 0610_s22_qp_22.pdf or 0610_w21_ms_21.pdf
    pattern = re.compile(r"(\d{4})_([mws])(\d{2})_(qp|ms|gt|er)_(\d{2})\.pdf")
    
    stats = {
        'total_files': 0,
        'mcq_papers': 0,
        'mark_schemes': 0,
        'grade_thresholds': 0,
        'examiner_reports': 0,
        'pairs_found': defaultdict(int),
        'subjects': set()
    }
    
    print("=" * 60)
    print("MCQ MATCHMAKER - Organizing Paper 2 (Multiple Choice)")
    print("=" * 60)
    print()
    
    # First pass: scan all files
    print("📂 Scanning downloaded files...")
    all_files = list(DOWNLOADS_DIR.rglob("*.pdf"))
    stats['total_files'] = len(all_files)
    print(f"   Found {stats['total_files']} PDF files")
    print()
    
    # Second pass: organize MCQ files
    print("🔍 Filtering and organizing MCQ papers (Paper 2)...")
    print()
    
    for file_path in all_files:
        match = pattern.match(file_path.name)
        if match:
            subject, session_letter, year, paper_type, variant = match.groups()
            
            # Filter: Only Paper 2 (MCQ) - variants 21, 22, 23
            if variant.startswith('2'):
                stats['subjects'].add(subject)
                
                # Map session letter to full name
                session_map = {'s': 'Summer', 'w': 'Winter', 'm': 'March'}
                session = session_map.get(session_letter, session_letter)
                
                # Get subject name from parent folder
                subject_folder = file_path.parent.name
                
                # Create organized structure
                target_folder = OUTPUT_DIR / subject_folder / f"20{year}" / session / f"Variant_{variant}"
                target_folder.mkdir(parents=True, exist_ok=True)
                
                # Copy file to organized location
                target_path = target_folder / file_path.name
                if not target_path.exists():
                    shutil.copy2(file_path, target_path)
                    
                    # Update stats
                    if paper_type == 'qp':
                        stats['mcq_papers'] += 1
                    elif paper_type == 'ms':
                        stats['mark_schemes'] += 1
                    elif paper_type == 'gt':
                        stats['grade_thresholds'] += 1
                    elif paper_type == 'er':
                        stats['examiner_reports'] += 1
                    
                    stats['pairs_found'][subject_folder] += 1
                    
                    print(f"   ✓ {file_path.name} → {target_folder.relative_to(OUTPUT_DIR)}")
    
    print()
    print("=" * 60)
    print("ORGANIZATION COMPLETE!")
    print("=" * 60)
    print()
    print("📊 Statistics:")
    print(f"   Total files scanned: {stats['total_files']}")
    print(f"   MCQ Question Papers (qp): {stats['mcq_papers']}")
    print(f"   Mark Schemes (ms): {stats['mark_schemes']}")
    print(f"   Grade Thresholds (gt): {stats['grade_thresholds']}")
    print(f"   Examiner Reports (er): {stats['examiner_reports']}")
    print(f"   Subjects organized: {len(stats['subjects'])}")
    print()
    
    print("📁 Files organized by subject:")
    for subject, count in sorted(stats['pairs_found'].items()):
        print(f"   {subject}: {count} files")
    print()
    
    # Check for complete pairs
    print("🔗 Checking for complete QP + MS pairs...")
    check_pairs()
    
    print()
    print(f"✅ All MCQ papers organized in: {OUTPUT_DIR.absolute()}")
    print()

def check_pairs():
    """
    Verify that each Question Paper has a corresponding Mark Scheme
    """
    pairs_complete = 0
    pairs_missing_ms = 0
    pairs_missing_qp = 0
    
    for subject_folder in OUTPUT_DIR.iterdir():
        if subject_folder.is_dir():
            for year_folder in subject_folder.iterdir():
                if year_folder.is_dir():
                    for session_folder in year_folder.iterdir():
                        if session_folder.is_dir():
                            for variant_folder in session_folder.iterdir():
                                if variant_folder.is_dir():
                                    qp_files = list(variant_folder.glob("*_qp_*.pdf"))
                                    ms_files = list(variant_folder.glob("*_ms_*.pdf"))
                                    
                                    if qp_files and ms_files:
                                        pairs_complete += 1
                                    elif qp_files and not ms_files:
                                        pairs_missing_ms += 1
                                        print(f"   ⚠️  Missing MS: {variant_folder.relative_to(OUTPUT_DIR)}")
                                    elif ms_files and not qp_files:
                                        pairs_missing_qp += 1
                                        print(f"   ⚠️  Missing QP: {variant_folder.relative_to(OUTPUT_DIR)}")
    
    print()
    print(f"   ✅ Complete pairs (QP + MS): {pairs_complete}")
    if pairs_missing_ms > 0:
        print(f"   ⚠️  Missing Mark Schemes: {pairs_missing_ms}")
    if pairs_missing_qp > 0:
        print(f"   ⚠️  Missing Question Papers: {pairs_missing_qp}")

if __name__ == "__main__":
    # Create output directory if it doesn't exist
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    # Run the organization
    organize_mcq_papers()

# Made with Bob
