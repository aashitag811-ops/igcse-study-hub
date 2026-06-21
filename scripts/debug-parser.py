"""Debug script to see what the parser is detecting"""
import fitz
import re

pdf_path = "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"
doc = fitz.open(pdf_path)

print("=" * 60)
print("FIRST 50 LINES FROM PDF")
print("=" * 60)

line_count = 0
for page_num in range(min(3, len(doc))):  # First 3 pages
    page = doc[page_num]
    text = page.get_text()
    
    print(f"\n--- PAGE {page_num + 1} ---")
    for line in text.split('\n'):
        line = line.strip()
        if line and line_count < 50:
            # Check if it looks like a question number
            if re.match(r'^\d+[\s\.\)]', line):
                print(f">>> Q? {line[:80]}")
            elif re.match(r'^\([a-z]\)', line):
                print(f"    >>> (a)? {line[:80]}")
            else:
                print(f"    {line[:80]}")
            line_count += 1

doc.close()

# Made with Bob
