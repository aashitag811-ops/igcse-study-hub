"""
QUICK PARSER TEST - No PyMuPDF Required
Tests basic parsing without image extraction
Run: python scripts/quick-test-parser.py <pdf_path>
"""

import pdfplumber
import json
import sys
import os
import re
from datetime import datetime

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def quick_parse(pdf_path):
    """Simple parser - no image extraction"""
    questions = []
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
        
        # Split by question numbers
        lines = full_text.split('\n')
        current_q = None
        
        for line in lines:
            # Main question detection (e.g., "1 ", "2 ", "3 ")
            main_q_match = re.match(r'^(\d+)\s+(.+)', line.strip())
            if main_q_match and len(line.strip()) > 5:
                if current_q:
                    questions.append(current_q)
                
                q_num = main_q_match.group(1)
                q_text = main_q_match.group(2)
                
                current_q = {
                    "number": q_num,
                    "text": q_text,
                    "type": "text",
                    "marks": 1,
                    "subparts": []
                }
            
            # Add to current question text
            elif current_q and line.strip():
                current_q["text"] += " " + line.strip()
            
            # Type detection
            if current_q:
                text = current_q["text"].lower()
                
                if "tick" in text or "✓" in text or "✔" in text:
                    current_q["type"] = "matrix_tick_table"
                elif "circle" in text and ("two" in text or "three" in text):
                    current_q["type"] = "mcq"
                elif "from the list" in text or "word bank" in text:
                    current_q["type"] = "word_bank"
                elif "explain" in text or "describe" in text or "discuss" in text:
                    current_q["type"] = "essay"
                
                # Marks detection
                mark_match = re.search(r'\[(\d+)\]', line)
                if mark_match:
                    current_q["marks"] = int(mark_match.group(1))
        
        # Add last question
        if current_q:
            questions.append(current_q)
    
    return {
        "paperId": os.path.splitext(os.path.basename(pdf_path))[0],
        "title": "ICT Paper 1 - Quick Test",
        "duration": 120,
        "totalMarks": sum(q["marks"] for q in questions),
        "questions": questions
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quick-test-parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"❌ Error: File not found: {pdf_path}")
        sys.exit(1)
    
    print("=" * 70)
    print("QUICK PARSER TEST")
    print("=" * 70)
    print(f"PDF: {pdf_path}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("Parsing...", end=" ")
    
    try:
        result = quick_parse(pdf_path)
        
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        output_path = f"{base_name}_quick_test.json"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print("[OK] Done!")
        print()
        print("=" * 70)
        print("RESULTS")
        print("=" * 70)
        print(f"Questions found: {len(result['questions'])}")
        print(f"Total marks: {result['totalMarks']}")
        print()
        
        # Show first 3 questions
        print("First 3 questions:")
        print("-" * 70)
        for i, q in enumerate(result['questions'][:3], 1):
            print(f"\n{i}. Question {q['number']} [{q['marks']} marks] - Type: {q['type']}")
            print(f"   Text: {q['text'][:100]}...")
        
        print()
        print("=" * 70)
        print(f"[OK] Full results saved to: {output_path}")
        print()
        
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

# Made with Bob
