import fitz
import sys

pdf_path = sys.argv[1] if len(sys.argv) > 1 else "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"

doc = fitz.open(pdf_path)
page = doc[1]  # Page 2 (0-indexed)
text = page.get_text()

lines = text.split('\n')
for i, line in enumerate(lines[:40]):
    if line.strip():
        print(f"{i:3d}: {repr(line[:100])}")

# Made with Bob
