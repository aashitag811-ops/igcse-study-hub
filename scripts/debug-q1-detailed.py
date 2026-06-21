import fitz
import re

pdf_path = r"C:\Users\HP\Downloads\ICT 0417 Paper 1\ICT 0417 Paper 1\May June 2020\0417_s20_qp_11.pdf"
doc = fitz.open(pdf_path)

print("="*80)
print("DETAILED DEBUG - FIRST 10 BLOCKS OF PAGE 2")
print("="*80)

page = doc[1]  # Page 2
blocks = page.get_text("blocks")

for i in range(min(10, len(blocks))):
    b = blocks[i]
    x0, y0, x1, y1, text, block_no, block_type = b
    text = text.strip()
    
    print(f"\n{'='*80}")
    print(f"BLOCK {i}:")
    print(f"{'='*80}")
    print(f"Y position: {y0:.1f}")
    print(f"Full text:\n{text}")
    print(f"\nIs question number: {bool(re.match(r'^\d{1,2}$', text))}")
    print(f"Has question at end: {bool(re.search(r'\n(\d{1,2})$', text))}")
    print(f"Is subpart (start): {bool(re.match(r'^\([a-z]\)', text))}")
    print(f"Has subpart at end: {bool(re.search(r'\n\([a-z]\)$', text))}")

doc.close()

# Made with Bob
