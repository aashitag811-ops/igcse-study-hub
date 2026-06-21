"""Find where Q1 is in the PDF"""
import fitz
import re

pdf_path = "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"
doc = fitz.open(pdf_path)

print("Looking for '1' in pages 2-5:\n")

for page_num in range(1, 5):  # Pages 2-5 (0-indexed)
    page = doc[page_num]
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    print(f"=== PAGE {page_num + 1} ===")
    for i, line in enumerate(lines[:20]):  # First 20 lines
        # Check if line starts with "1"
        if re.match(r'^1(\s|$)', line):
            print(f"  FOUND Q1 MARKER: Line {i}: {line[:80]}")
        elif '1' in line[:5]:
            print(f"  Contains '1': Line {i}: {line[:80]}")
    print()

doc.close()

# Made with Bob
