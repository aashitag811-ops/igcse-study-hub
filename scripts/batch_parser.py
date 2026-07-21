"""
Batch Parser for Cambridge IGCSE MCQ Papers (2010-2025)
Processes multiple papers automatically
"""

import os
import json
from pathlib import Path
from typing import List, Dict
import glob

from unified_mcq_parser import parse_paper
from subject_config import SUBJECT_RULES


class BatchParser:
    """
    Batch processor for multiple MCQ papers
    Automatically finds matching QP and MS files and parses them
    """
    
    def __init__(self, pdf_dir: str, output_dir: str = "../public/papers"):
        """
        Initialize batch parser
        
        Args:
            pdf_dir: Directory containing PDF files
            output_dir: Directory to save JSON outputs
        """
        self.pdf_dir = Path(pdf_dir)
        self.output_dir = Path(output_dir)
        self.results = []
    
    def find_paper_pairs(self, subject_codes: List[str] = None) -> List[Dict]:
        """
        Find matching QP and MS PDF pairs
        
        Args:
            subject_codes: List of subject codes to process (None = all)
            
        Returns:
            List of dictionaries with qp_path and ms_path
        """
        pairs = []
        
        # Get all QP files
        qp_files = list(self.pdf_dir.glob("*_qp_*.pdf"))
        
        for qp_file in qp_files:
            # Extract paper code
            paper_code = qp_file.stem
            
            # Check if subject code matches filter
            subject_code = paper_code.split('_')[0]
            if subject_codes and subject_code not in subject_codes:
                continue
            
            # Check if subject is supported
            if subject_code not in SUBJECT_RULES:
                print(f"⚠ Skipping unsupported subject: {subject_code} ({qp_file.name})")
                continue
            
            # Find matching MS file
            ms_code = paper_code.replace('_qp_', '_ms_')
            ms_file = self.pdf_dir / f"{ms_code}.pdf"
            
            if ms_file.exists():
                pairs.append({
                    'paper_code': paper_code,
                    'qp_path': str(qp_file),
                    'ms_path': str(ms_file),
                    'subject_code': subject_code
                })
            else:
                print(f"⚠ Missing mark scheme for: {qp_file.name}")
        
        return pairs
    
    def parse_all(self, subject_codes: List[str] = None, skip_existing: bool = True) -> Dict:
        """
        Parse all papers in the directory
        
        Args:
            subject_codes: List of subject codes to process (None = all)
            skip_existing: Skip papers that already have JSON output
            
        Returns:
            Summary dictionary with results
        """
        pairs = self.find_paper_pairs(subject_codes)
        
        print(f"\n{'='*60}")
        print(f"Batch Parser - Found {len(pairs)} paper pairs")
        print(f"{'='*60}\n")
        
        success_count = 0
        skip_count = 0
        error_count = 0
        
        for i, pair in enumerate(pairs, 1):
            paper_code = pair['paper_code']
            output_file = self.output_dir / f"{paper_code}.json"
            
            print(f"\n[{i}/{len(pairs)}] Processing: {paper_code}")
            print("-" * 60)
            
            # Check if already exists
            if skip_existing and output_file.exists():
                print(f"⊘ Skipping (already exists): {output_file.name}")
                skip_count += 1
                self.results.append({
                    'paper_code': paper_code,
                    'status': 'skipped',
                    'message': 'Already exists'
                })
                continue
            
            # Parse the paper
            try:
                data = parse_paper(
                    pair['qp_path'],
                    pair['ms_path'],
                    str(self.output_dir)
                )
                
                success_count += 1
                self.results.append({
                    'paper_code': paper_code,
                    'status': 'success',
                    'questions': len(data['questions']),
                    'output': str(output_file)
                })
                
                print(f"✓ Success: {paper_code}")
                
            except Exception as e:
                error_count += 1
                self.results.append({
                    'paper_code': paper_code,
                    'status': 'error',
                    'message': str(e)
                })
                
                print(f"✗ Error: {e}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("BATCH PROCESSING SUMMARY")
        print(f"{'='*60}")
        print(f"Total papers found: {len(pairs)}")
        print(f"Successfully parsed: {success_count}")
        print(f"Skipped (existing): {skip_count}")
        print(f"Errors: {error_count}")
        print(f"{'='*60}\n")
        
        return {
            'total': len(pairs),
            'success': success_count,
            'skipped': skip_count,
            'errors': error_count,
            'results': self.results
        }
    
    def save_report(self, filename: str = "batch_parse_report.json"):
        """
        Save batch processing report
        
        Args:
            filename: Report filename
        """
        report_path = self.output_dir / filename
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"Report saved to: {report_path}")


def main():
    """Main entry point for batch parser"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Batch parse Cambridge IGCSE MCQ papers"
    )
    parser.add_argument(
        'pdf_dir',
        help='Directory containing PDF files'
    )
    parser.add_argument(
        '--output',
        default='../public/papers',
        help='Output directory for JSON files (default: ../public/papers)'
    )
    parser.add_argument(
        '--subjects',
        nargs='+',
        help='Subject codes to process (e.g., 0610 0620 0625)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Reprocess existing files'
    )
    parser.add_argument(
        '--report',
        action='store_true',
        help='Save processing report'
    )
    
    args = parser.parse_args()
    
    # Create batch parser
    batch = BatchParser(args.pdf_dir, args.output)
    
    # Process all papers
    summary = batch.parse_all(
        subject_codes=args.subjects,
        skip_existing=not args.force
    )
    
    # Save report if requested
    if args.report:
        batch.save_report()
    
    # Exit with error code if any errors occurred
    if summary['errors'] > 0:
        exit(1)


if __name__ == "__main__":
    main()

# Made with Bob
