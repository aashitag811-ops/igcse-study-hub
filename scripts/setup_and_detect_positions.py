"""
Setup MCQ papers and detect all letter positions automatically
Copies papers from pastpapers folder and runs OCR detection
"""

import sys
import os
import shutil
from pathlib import Path

# Fix Windows encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

def copy_mcq_papers():
    """Copy MCQ papers from pastpapers folder to scripts folder"""
    
    pastpapers_base = Path("pastpapers")
    scripts_dir = Path(".")
    
    # MCQ papers we need (Paper 1 = Core, Paper 2 = Extended)
    mcq_papers = {
        '0610': 'Biology',
        '0620': 'Chemistry',
        '0625': 'Physics',
        '0455': 'Economics'
    }
    
    papers_copied = []
    
    print("\n" + "="*70)
    print("Copying MCQ Papers to Scripts Folder")
    print("="*70 + "\n")
    
    for code, subject in mcq_papers.items():
        subject_folder = pastpapers_base / f"{code}-{subject}"
        
        if not subject_folder.exists():
            print(f"⚠ Skipping {subject} - folder not found")
            continue
        
        print(f"Searching {subject}...")
        
        # Search all years and sessions
        for year_folder in sorted(subject_folder.glob("*")):
            if not year_folder.is_dir():
                continue
                
            for session_folder in year_folder.glob("*"):
                if not session_folder.is_dir():
                    continue
                
                # Find MCQ papers (Paper 1 and Paper 2)
                for paper_num in ['1', '2']:
                    # Look for question papers and mark schemes
                    qp_pattern = f"{code}_*_qp_{paper_num}*.pdf"
                    ms_pattern = f"{code}_*_ms_{paper_num}*.pdf"
                    
                    for qp_file in session_folder.glob(qp_pattern):
                        # Copy question paper
                        dest_qp = scripts_dir / qp_file.name
                        if not dest_qp.exists():
                            shutil.copy2(qp_file, dest_qp)
                            print(f"  ✓ Copied {qp_file.name}")
                            papers_copied.append(qp_file.name)
                        
                        # Copy corresponding mark scheme
                        ms_name = qp_file.name.replace('_qp_', '_ms_')
                        ms_file = session_folder / ms_name
                        if ms_file.exists():
                            dest_ms = scripts_dir / ms_name
                            if not dest_ms.exists():
                                shutil.copy2(ms_file, dest_ms)
    
    print(f"\n✓ Copied {len(papers_copied)} MCQ papers")
    return papers_copied


def run_ocr_detection():
    """Run OCR detection on all papers"""
    
    print("\n" + "="*70)
    print("Running OCR Position Detection")
    print("="*70 + "\n")
    
    # Import after copying files
    try:
        from ocr_vision_detector import update_json_with_ocr_positions
    except ImportError:
        print("ERROR: ocr_vision_detector.py not found")
        return
    
    papers_dir = Path('../public/papers')
    scripts_dir = Path('.')
    
    # Find all JSON files
    json_files = list(papers_dir.glob('*.json'))
    
    processed = 0
    failed = 0
    
    for json_file in json_files:
        paper_code = json_file.stem
        pdf_file = scripts_dir / f"{paper_code}.pdf"
        
        if not pdf_file.exists():
            continue
        
        print(f"Processing {paper_code}...")
        
        try:
            update_json_with_ocr_positions(str(json_file), str(pdf_file))
            processed += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")
            failed += 1
    
    print(f"\n✓ Processed {processed} papers")
    if failed > 0:
        print(f"✗ Failed {failed} papers")


if __name__ == "__main__":
    print("\n" + "="*70)
    print("MCQ Position Detection Setup")
    print("="*70)
    
    # Step 1: Copy papers
    papers = copy_mcq_papers()
    
    if not papers:
        print("\n⚠ No papers found to process")
        sys.exit(1)
    
    # Step 2: Run OCR detection
    print("\nStarting OCR detection...")
    print("This will take a few minutes...")
    
    run_ocr_detection()
    
    print("\n" + "="*70)
    print("Setup Complete!")
    print("="*70)
    print("\nRefresh your browser to see the updated positions!")
    print("URL: http://localhost:3002/mcq-test")

# Made with Bob
