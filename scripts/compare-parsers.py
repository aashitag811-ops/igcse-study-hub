import sys
import json
import subprocess
from pathlib import Path

# Parsers to test (most promising ones)
PARSERS = [
    'new-parser.py',
    'parser-final.py',
    'parser-v3-smart.py',
    'universal-ict-parser.py',
    'golden-ict-parser.py'
]

# Papers to test (full paths)
PAPERS = [
    ('ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf', '12'),
    ('ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_13.pdf', '13')
]

def count_questions(json_file):
    """Count questions in a parsed JSON file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return len(data.get('questions', []))
    except:
        return 0

def test_parser(parser_name, pdf_file, paper_num):
    """Test a parser on a specific paper"""
    print(f"\n  Testing {parser_name} on paper {paper_num}...")
    
    # Check if PDF exists
    if not Path(pdf_file).exists():
        print(f"    [SKIP] PDF not found at {pdf_file}")
        return 0
    
    try:
        # Run the parser
        result = subprocess.run(
            ['python', f'scripts/{parser_name}', pdf_file],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Check if output file was created
        output_file = f'public/papers/0417_s20_qp_{paper_num}.json'
        if Path(output_file).exists():
            q_count = count_questions(output_file)
            print(f"    [OK] Found {q_count} questions")
            return q_count
        else:
            print(f"    [FAIL] No output file created")
            if result.stderr:
                print(f"    Error: {result.stderr[:200]}")
            return 0
            
    except subprocess.TimeoutExpired:
        print(f"    [TIMEOUT] Parser took too long")
        return 0
    except Exception as e:
        print(f"    [ERROR] {str(e)}")
        return 0

def main():
    print("=" * 60)
    print("PARSER COMPARISON TEST")
    print("Testing parsers on papers 12 and 13")
    print("=" * 60)
    
    results = {}
    
    for parser in PARSERS:
        parser_path = Path(f'scripts/{parser}')
        if not parser_path.exists():
            print(f"\n[SKIP] {parser} not found")
            continue
            
        print(f"\n{'='*60}")
        print(f"PARSER: {parser}")
        print(f"{'='*60}")
        
        results[parser] = {}
        
        for pdf_file, paper_num in PAPERS:
            q_count = test_parser(parser, pdf_file, paper_num)
            results[parser][paper_num] = q_count
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"\n{'Parser':<30} {'Paper 12':<12} {'Paper 13':<12} {'Total':<10}")
    print("-" * 60)
    
    for parser, counts in results.items():
        p12 = counts.get('12', 0)
        p13 = counts.get('13', 0)
        total = p12 + p13
        print(f"{parser:<30} {p12:<12} {p13:<12} {total:<10}")
    
    # Find best parser
    best_parser = max(results.items(), key=lambda x: sum(x[1].values()))
    print("\n" + "=" * 60)
    print(f"BEST PARSER: {best_parser[0]}")
    print(f"Total questions found: {sum(best_parser[1].values())}")
    print("=" * 60)

if __name__ == '__main__':
    main()

# Made with Bob
