#!/usr/bin/env python3
"""Find where questions 2, 6, 8, 11 are in the PDF"""

import fitz
import re

def extract_all_text(pdf_path):
    doc = fitz.open(pdf_path)
    
    for page_num in range(len(doc)):
        if page_num == 0:
            continue
        
        page = doc[page_num]
        text = page.get_text()
        
        print(f"\n{'='*60}")
        print(f"PAGE {page_num + 1}")
        print(f"{'='*60}\n")
        
        # Look for lines that might be question starts
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            # Look for standalone 2, 6, 8, 11 or these numbers followed by text
            if re.match(r'^(2|6|8|11)$', line) or re.match(r'^(2|6|8|11)\s+[A-Z]', line):
                print(f"Found potential Q{line[:2].strip()} at line {i}:")
                # Show context
                start = max(0, i - 2)
                end = min(len(lines), i + 3)
                for j in range(start, end):
                    marker = ">>>" if j == i else "   "
                    print(f"{marker} {lines[j]}")
                print()

if __name__ == "__main__":
    import sys
    pdf_path = sys.argv[1]
    extract_all_text(pdf_path)

# Made with Bob
