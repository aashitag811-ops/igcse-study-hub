"""
Batch OCR Vision Position Fixer
Processes all MCQ papers automatically using computer vision
"""

import os
import json
from pathlib import Path
from ocr_vision_detector import update_json_with_ocr_positions
import time

# Define subjects with MCQ papers
MCQ_SUBJECTS = {
    '0610': 'Biology',
    '0620': 'Chemistry', 
    '0625': 'Physics',
    '0455': 'Economics'
}

def batch_process_all_papers(subject_filter=None):
    """
    Process all MCQ papers with OCR vision
    
    Args:
        subject_filter: Optional subject code to process only one subject (e.g., '0610')
    """
    papers_dir = Path('../public/papers')
    pdfs_dir = Path('.')  # Current directory (scripts folder)
    
    # Find all JSON files for MCQ subjects
    json_files = []
    subjects_to_process = [subject_filter] if subject_filter else MCQ_SUBJECTS.keys()
    
    for subject_code in subjects_to_process:
        json_files.extend(papers_dir.glob(f'{subject_code}_*.json'))
    
    json_files = sorted(json_files)  # Process in order
    
    print(f"\n{'='*70}")
    print(f"OCR Vision Batch Processor")
    print(f"{'='*70}")
    print(f"Found {len(json_files)} MCQ papers to process")
    
    if subject_filter:
        print(f"Filter: {MCQ_SUBJECTS.get(subject_filter, subject_filter)} only")
    
    print(f"{'='*70}\n")
    
    # Statistics
    successful = 0
    failed = 0
    skipped = 0
    start_time = time.time()
    
    for i, json_path in enumerate(json_files, 1):
        paper_code = json_path.stem  # e.g., '0610_m20_qp_22'
        pdf_path = pdfs_dir / f'{paper_code}.pdf'
        
        subject_code = paper_code[:4]
        subject_name = MCQ_SUBJECTS.get(subject_code, 'Unknown')
        
        print(f"[{i}/{len(json_files)}] {subject_name} - {paper_code}")
        
        if not pdf_path.exists():
            print(f"  ⚠️  Skipping - PDF not found: {pdf_path.name}\n")
            skipped += 1
            continue
        
        try:
            update_json_with_ocr_positions(str(json_path), str(pdf_path))
            print(f"  ✓ Success!\n")
            successful += 1
        except Exception as e:
            print(f"  ✗ Error: {e}\n")
            failed += 1
    
    # Summary
    elapsed_time = time.time() - start_time
    minutes = int(elapsed_time // 60)
    seconds = int(elapsed_time % 60)
    
    print(f"\n{'='*70}")
    print(f"Batch Processing Complete!")
    print(f"{'='*70}")
    print(f"Total papers: {len(json_files)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    print(f"Time elapsed: {minutes}m {seconds}s")
    
    if successful > 0:
        avg_time = elapsed_time / successful
        print(f"Average time per paper: {avg_time:.1f}s")
    
    print(f"{'='*70}\n")
    
    if failed > 0:
        print("⚠️  Some papers failed. Check the error messages above.")
    else:
        print("✓ All papers processed successfully!")
        print("Refresh your browser to see the OCR-detected positions.")


def process_single_subject(subject_code):
    """Process papers for a single subject"""
    if subject_code not in MCQ_SUBJECTS:
        print(f"Error: Unknown subject code '{subject_code}'")
        print(f"Valid codes: {', '.join(MCQ_SUBJECTS.keys())}")
        return
    
    print(f"\nProcessing {MCQ_SUBJECTS[subject_code]} papers only...\n")
    batch_process_all_papers(subject_filter=subject_code)


if __name__ == "__main__":
    import sys
    
    print("\n" + "="*70)
    print("OCR Vision Batch Processor")
    print("Automatically fixes circle positions using computer vision")
    print("="*70)
    
    if len(sys.argv) > 1:
        # Process specific subject
        subject_code = sys.argv[1]
        process_single_subject(subject_code)
    else:
        # Process all subjects
        print("\nUsage:")
        print("  python batch_ocr_fix.py           # Process all MCQ subjects")
        print("  python batch_ocr_fix.py 0610      # Process Biology only")
        print("  python batch_ocr_fix.py 0620      # Process Chemistry only")
        print("  python batch_ocr_fix.py 0625      # Process Physics only")
        print("  python batch_ocr_fix.py 0455      # Process Economics only")
        print("\nPress Enter to process ALL subjects, or Ctrl+C to cancel...")
        
        try:
            input()
            batch_process_all_papers()
        except KeyboardInterrupt:
            print("\n\nCancelled by user.")
            sys.exit(0)

# Made with Bob
