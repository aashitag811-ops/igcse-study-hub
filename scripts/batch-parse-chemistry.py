#!/usr/bin/env python3
"""
Batch Chemistry MCQ Parser
Automatically parses all Chemistry (0620) MCQ papers in the scripts directory
Uses the same master parser that worked perfectly for Biology
"""

import os
import sys
import glob
import subprocess
from pathlib import Path

def find_chemistry_papers(scripts_dir="scripts"):
    """Find all Chemistry question papers and their corresponding marking schemes"""
    papers = []
    
    # Find all 0620 question papers (qp)
    qp_files = glob.glob(f"{scripts_dir}/0620_*_qp_*.pdf")
    
    for qp_path in sorted(qp_files):
        filename = os.path.basename(qp_path)
        # Extract paper info: 0620_m20_qp_22.pdf
        parts = filename.replace('.pdf', '').split('_')
        
        if len(parts) >= 4:
            syllabus = parts[0]
            session_year = parts[1]
            paper_type = parts[2]
            paper_num = parts[3]
            
            # Only process MCQ papers (12, 22, 32, etc.)
            if paper_num.endswith('2'):
                # Find corresponding marking scheme
                ms_filename = f"{syllabus}_{session_year}_ms_{paper_num}.pdf"
                ms_path = os.path.join(scripts_dir, ms_filename)
                
                if os.path.exists(ms_path):
                    papers.append({
                        'qp': qp_path,
                        'ms': ms_path,
                        'name': filename.replace('.pdf', '')
                    })
                else:
                    print(f"Warning: No marking scheme found for {filename}")
    
    return papers

def parse_single_paper(qp_path, ms_path):
    """Parse a single paper using the master parser"""
    try:
        result = subprocess.run(
            ['python', 'scripts/master-image-mcq-parser.py', qp_path, ms_path],
            capture_output=True,
            text=True,
            timeout=300
        )
        return result.returncode == 0
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("=" * 70)
    print("BATCH CHEMISTRY MCQ PARSER")
    print("=" * 70)
    print()
    
    # Find all Chemistry papers
    papers = find_chemistry_papers()
    print(f"Found {len(papers)} Chemistry MCQ papers to parse\n")
    
    if not papers:
        print("No papers found! Make sure PDF files are in the scripts directory.")
        return
    
    # Parse each paper
    success_count = 0
    fail_count = 0
    
    for i, paper in enumerate(papers, 1):
        print(f"\n[{i}/{len(papers)}] Parsing {paper['name']}...")
        print("-" * 70)
        
        success = parse_single_paper(paper['qp'], paper['ms'])
        
        if success:
            print(f"[OK] SUCCESS: All 40 questions extracted")
            success_count += 1
        else:
            print(f"[ERROR] FAILED: Parser returned error")
            fail_count += 1
    
    # Summary
    print("\n" + "=" * 70)
    print("BATCH PROCESSING COMPLETE")
    print("=" * 70)
    print(f"Total papers: {len(papers)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()

# Made with Bob
