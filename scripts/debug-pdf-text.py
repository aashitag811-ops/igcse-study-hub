#!/usr/bin/env python3
"""Debug script to see what text is extracted from PDF"""

import pdfplumber
import sys

pdf_path = sys.argv[1] if len(sys.argv) > 1 else "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"

print(f"Opening: {pdf_path}\n")

with pdfplumber.open(pdf_path) as pdf:
    # Check first 3 pages
    for page_num in range(min(3, len(pdf.pages))):
        page = pdf.pages[page_num]
        print(f"\n{'='*60}")
        print(f"PAGE {page_num + 1}")
        print('='*60)
        
        text = page.extract_text(layout=True)
        lines = text.split('\n')[:30]  # First 30 lines
        
        for i, line in enumerate(lines, 1):
            print(f"{i:3d}: {repr(line)}")

# Made with Bob
