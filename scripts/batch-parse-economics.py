#!/usr/bin/env python3
"""
Batch Economics MCQ Parser
Processes all Economics (0455) papers with 30-question format
"""

import os
import subprocess
import json
from pathlib import Path

def find_economics_papers():
    """Find all Economics MCQ papers (ONLY Paper 12 - Paper 22 is Structured Questions)"""
    scripts_dir = Path(__file__).parent
    papers = []
    
    # Look for Economics papers (0455)
    for file in scripts_dir.glob("0455_*_qp_*.pdf"):
        filename = file.stem
        parts = filename.split('_')
        
        # Only process Paper 12 (MCQ paper) - Paper 22 is NOT MCQ!
        if len(parts) >= 4 and parts[3] == '12':
            papers.append(filename)
    
    return sorted(papers)

def run_parser(paper_id):
    """Run the master parser on a single paper"""
    try:
        result = subprocess.run(
            ['python', 'scripts/master-image-mcq-parser.py', paper_id, '--questions', '30'],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        # Check if JSON was created successfully
        json_path = f"public/papers/{paper_id}.json"
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                question_count = len(data.get('questions', []))
                
                if question_count == 30:
                    return True, f"All 30 questions extracted"
                else:
                    return False, f"Only {question_count}/30 questions extracted"
        else:
            return False, "JSON file not created"
            
    except subprocess.TimeoutExpired:
        return False, "Parser timeout (>120s)"
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    print("=" * 70)
    print("BATCH ECONOMICS MCQ PARSER (30 Questions)")
    print("=" * 70)
    print()
    
    papers = find_economics_papers()
    print(f"Found {len(papers)} Economics MCQ papers to parse")
    print()
    
    successful = 0
    failed = 0
    failed_papers = []
    
    for i, paper_id in enumerate(papers, 1):
        print(f"\n[{i}/{len(papers)}] Parsing {paper_id}...")
        print("-" * 70)
        
        success, message = run_parser(paper_id)
        
        if success:
            print(f"[OK] SUCCESS: {message}")
            successful += 1
        else:
            print(f"[FAIL] ERROR: {message}")
            failed += 1
            failed_papers.append((paper_id, message))
    
    print("\n" + "=" * 70)
    print("BATCH PROCESSING COMPLETE")
    print("=" * 70)
    print(f"Total papers: {len(papers)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    
    if failed_papers:
        print("\nFailed papers:")
        for paper_id, error in failed_papers:
            print(f"  - {paper_id}: {error}")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()

# Made with Bob
