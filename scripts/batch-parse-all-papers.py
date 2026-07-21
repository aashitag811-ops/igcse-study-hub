"""
Batch Parser for All MCQ Papers
Parses all question papers and marking schemes in the scripts directory
NO UI CHANGES - Parser only!
"""

import os
import sys
from pathlib import Path
import re

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

def find_paper_sets(scripts_dir):
    """Find all QP/MS pairs in the scripts directory"""
    paper_sets = []
    
    # Get all QP files
    qp_files = list(scripts_dir.glob('*_qp_*.pdf'))
    
    for qp_file in qp_files:
        # Extract paper info from filename
        # Format: 0455_m20_qp_22.pdf
        match = re.match(r'(\d{4})_([a-z]\d{2})_qp_(\d{2})\.pdf', qp_file.name)
        if not match:
            continue
        
        code, session, variant = match.groups()
        
        # Look for corresponding MS file
        ms_file = scripts_dir / f"{code}_{session}_ms_{variant}.pdf"
        
        if ms_file.exists():
            paper_sets.append({
                'qp': str(qp_file),
                'ms': str(ms_file),
                'code': code,
                'session': session,
                'variant': variant,
                'name': f"{code} {session.upper()} P{variant}"
            })
    
    return paper_sets

def parse_all_papers():
    """Parse all available papers"""
    scripts_dir = Path(__file__).parent
    
    # Import the parser (handle hyphenated filename)
    import importlib.util
    parser_path = scripts_dir / "universal-mcq-parser.py"
    
    if not parser_path.exists():
        print("ERROR: universal-mcq-parser.py not found in scripts directory")
        return False
    
    try:
        spec = importlib.util.spec_from_file_location("universal_mcq_parser", parser_path)
        if spec and spec.loader:
            parser_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(parser_module)
            create_paper_json = parser_module.create_paper_json
        else:
            print("ERROR: Could not load parser module")
            return False
    except Exception as e:
        print(f"ERROR: Failed to import parser: {e}")
        return False
    
    print("="*70)
    print("BATCH MCQ PARSER - Processing All Papers")
    print("="*70)
    
    # Find all paper sets
    paper_sets = find_paper_sets(scripts_dir)
    
    if not paper_sets:
        print("\n❌ No paper sets found!")
        print("Looking for files matching pattern: XXXX_YYY_qp_ZZ.pdf")
        return False
    
    print(f"\n[OK] Found {len(paper_sets)} paper sets to process\n")
    
    successful = 0
    failed = 0
    skipped = 0
    
    for i, paper in enumerate(paper_sets, 1):
        print(f"\n[{i}/{len(paper_sets)}] Processing: {paper['name']}")
        print("-" * 70)
        
        try:
            # Check if output already exists
            output_name = f"{paper['code']}_{paper['session']}_{paper['variant']}"
            output_path = scripts_dir.parent / "public" / "papers" / f"{output_name}.json"
            
            if output_path.exists():
                print(f"[SKIP] Output already exists: {output_path.name}")
                print("       Skipping... (delete the file to re-parse)")
                skipped += 1
                continue
            
            # Parse the paper
            success = create_paper_json(
                paper['qp'],
                paper['ms'],
                None  # No ER files for now
            )
            
            if success:
                successful += 1
                print(f"[SUCCESS] {paper['name']}")
            else:
                failed += 1
                print(f"[FAILED] {paper['name']}")
        
        except Exception as e:
            failed += 1
            print(f"[ERROR] {paper['name']}")
            print(f"   {str(e)}")
    
    # Summary
    print("\n" + "="*70)
    print("BATCH PARSING COMPLETE")
    print("="*70)
    print(f"[OK] Successful: {successful}")
    print(f"[FAIL] Failed: {failed}")
    print(f"[SKIP] Skipped: {skipped}")
    print(f"[TOTAL] Total: {len(paper_sets)}")
    print("="*70)
    
    if successful > 0:
        print(f"\n[OK] Parsed papers saved to: public/papers/")
        print("[OK] These will be automatically available in your app!")
    
    return successful > 0

if __name__ == "__main__":
    success = parse_all_papers()
    sys.exit(0 if success else 1)

# Made with Bob - Parser Only, No UI Changes!