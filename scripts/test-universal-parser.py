 ri"""
Quick Test Script for Universal MCQ Parser
Tests with Economics 0455 papers from scripts directory
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the parser (will work when run as script)
try:
    from universal_mcq_parser import create_paper_json
except ImportError:
    # Fallback: import from current directory
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "universal_mcq_parser",
        Path(__file__).parent / "universal-mcq-parser.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    create_paper_json = module.create_paper_json

def test_parser():
    """Test parser with available Economics papers"""
    
    print("="*60)
    print("Universal MCQ Parser - Test Run")
    print("="*60)
    
    # Test with Economics 0455 M20 P22
    scripts_dir = Path(__file__).parent
    
    test_papers = [
        {
            'qp': '0455_m20_qp_22.pdf',
            'ms': '0455_m20_ms_22.pdf',
            'er': None,  # No ER file for now
            'name': 'Economics M20 P22'
        },
        {
            'qp': '0455_m23_qp_22.pdf',
            'ms': '0455_m23_ms_22.pdf',
            'er': None,
            'name': 'Economics M23 P22'
        }
    ]
    
    successful = 0
    failed = 0
    
    for paper in test_papers:
        qp_path = scripts_dir / paper['qp']
        ms_path = scripts_dir / paper['ms']
        
        if not qp_path.exists():
            print(f"\n⚠️  Skipping {paper['name']} - QP not found")
            continue
        
        if not ms_path.exists():
            print(f"\n⚠️  Skipping {paper['name']} - MS not found")
            continue
        
        print(f"\n{'='*60}")
        print(f"Testing: {paper['name']}")
        print(f"{'='*60}")
        
        try:
            success = create_paper_json(
                str(qp_path),
                str(ms_path),
                None  # No ER for now
            )
            
            if success:
                successful += 1
                print(f"✅ SUCCESS: {paper['name']}")
            else:
                failed += 1
                print(f"❌ FAILED: {paper['name']}")
        
        except Exception as e:
            failed += 1
            print(f"❌ ERROR: {paper['name']}")
            print(f"   {str(e)}")
    
    print(f"\n{'='*60}")
    print(f"Test Summary")
    print(f"{'='*60}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"{'='*60}\n")
    
    return successful > 0

if __name__ == "__main__":
    success = test_parser()
    sys.exit(0 if success else 1)

# Made with Bob