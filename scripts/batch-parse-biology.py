#!/usr/bin/env python3
"""
Batch Biology MCQ Parser
Automatically parses all Biology (0610) MCQ papers in the scripts directory
"""

import os
import sys
import glob
from pathlib import Path
import subprocess

def find_biology_papers(scripts_dir="scripts"):
    """Find all Biology question papers and their corresponding marking schemes"""
    papers = []
    
    # Find all 0610 question papers (qp)
    qp_files = glob.glob(f"{scripts_dir}/0610_*_qp_*.pdf")
    
    for qp_path in sorted(qp_files):
        filename = os.path.basename(qp_path)
        # Extract paper info: 0610_m20_qp_22.pdf
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
                        'id': f"{syllabus}_{session_year}_{paper_type}_{paper_num}"
                    })
                else:
                    print(f"Warning: No marking scheme found for {filename}")
    
    return papers

def parse_paper(qp_path, ms_path):
    """Parse a single paper using the master parser"""
    try:
        result = subprocess.run(
            ['python', 'scripts/master-image-mcq-parser.py', qp_path, ms_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout per paper
        )
        
        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr
    except subprocess.TimeoutExpired:
        return False, "Timeout: Parser took too long"
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 70)
    print("BATCH BIOLOGY MCQ PARSER")
    print("=" * 70)
    
    # Find all papers
    papers = find_biology_papers()
    print(f"\nFound {len(papers)} Biology MCQ papers to parse\n")
    
    if not papers:
        print("No papers found! Make sure PDF files are in the scripts directory.")
        sys.exit(1)
    
    # Parse each paper
    success_count = 0
    failed_papers = []
    
    for i, paper in enumerate(papers, 1):
        paper_id = paper['id']
        print(f"\n[{i}/{len(papers)}] Parsing {paper_id}...")
        print("-" * 70)
        
        success, output = parse_paper(paper['qp'], paper['ms'])
        
        if success:
            success_count += 1
            # Extract question count from output
            if "Questions extracted: 40" in output:
                print(f"[OK] SUCCESS: All 40 questions extracted")
            else:
                print(f"[OK] SUCCESS: Paper parsed")
        else:
            failed_papers.append((paper_id, output))
            print(f"[ERROR] FAILED: {output[:200]}")
    
    # Summary
    print("\n" + "=" * 70)
    print("BATCH PROCESSING COMPLETE")
    print("=" * 70)
    print(f"Total papers: {len(papers)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {len(failed_papers)}")
    
    if failed_papers:
        print("\nFailed papers:")
        for paper_id, error in failed_papers:
            print(f"  - {paper_id}: {error[:100]}")
    
    print("\n" + "=" * 70)
    
    # Exit with error if any failed
    if failed_papers:
        sys.exit(1)

if __name__ == "__main__":
    main()

# Made with Bob
