"""
Quick test script for the ICT PDF parser
Tests the parser on a local PDF file

Usage:
    python test-parser.py path/to/paper.pdf
"""

import sys
import json
from pathlib import Path

# Import from the convert script
sys.path.insert(0, str(Path(__file__).parent))
import importlib.util
spec = importlib.util.spec_from_file_location("converter", Path(__file__).parent / "convert-paper-to-json.py")
converter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(converter)
ICTPaperParser = converter.ICTPaperParser


def main():
    if len(sys.argv) != 2:
        print("Usage: python test-parser.py <pdf_path>")
        print("Example: python test-parser.py ../public/papers/0417_s22_qp_11.pdf")
        sys.exit(1)
    
    pdf_path = Path(sys.argv[1])
    
    if not pdf_path.exists():
        print(f"❌ File not found: {pdf_path}")
        sys.exit(1)
    
    print(f"📖 Testing parser on: {pdf_path.name}")
    print("=" * 60)
    
    # Read PDF
    with open(pdf_path, 'rb') as f:
        pdf_content = f.read()
    
    # Parse
    parser = ICTPaperParser(pdf_content)
    parser.extract_text()
    
    print(f"\n📝 Raw text length: {len(parser.raw_text)} characters")
    print(f"📝 First 200 chars: {parser.raw_text[:200]}")
    print("\n" + "=" * 60)
    
    parser.parse_questions()
    
    # Show results
    print(f"\n✅ Parsed {len(parser.questions)} questions")
    print("\n" + "=" * 60)
    
    for q in parser.questions:
        print(f"\nQuestion {q['number']}:")
        if q['text']:
            print(f"  Intro: {q['text'][:100]}...")
        print(f"  Marks: {q['marks']}")
        print(f"  Subparts: {len(q.get('subparts', []))}")
        
        for sp in q.get('subparts', []):
            print(f"    ({sp['number']}) {sp['text'][:60]}... [{sp.get('marks', '?')} marks]")
            if 'subparts' in sp:
                for ssp in sp['subparts']:
                    print(f"      ({ssp['number']}) {ssp['text'][:50]}... [{ssp.get('marks', '?')} marks]")
    
    print("\n" + "=" * 60)
    total_marks = parser.calculate_total_marks()
    print(f"📊 Total marks: {total_marks}")
    
    # Save test output
    output_path = pdf_path.parent / f"{pdf_path.stem}_test_output.json"
    result = parser.to_json(2022, 's', 1)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved test output to: {output_path}")


if __name__ == '__main__':
    main()

# Made with Bob
