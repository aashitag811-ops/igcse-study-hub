import fitz
import re

pdf_path = r"C:\Users\HP\Downloads\ICT 0417 Paper 1\ICT 0417 Paper 1\May June 2020\0417_s20_qp_11.pdf"
doc = fitz.open(pdf_path)

print("="*80)
print("SHOWING ALL BLOCKS FROM PAGE 2 (index 1)")
print("="*80)

page = doc[1]  # Page 2 (index 1, since we skip cover at index 0)
blocks = page.get_text("blocks")

print(f"\nTotal blocks on page 2: {len(blocks)}")
print("\n" + "="*80)

for i, b in enumerate(blocks):
    x0, y0, x1, y1, text, block_no, block_type = b
    text = text.strip()
    
    # Check patterns
    is_question = bool(re.match(r'^\d{1,2}$', text))
    is_subpart = bool(re.match(r'^\([a-z]\)', text))
    
    marker = ""
    if is_question:
        marker = "*** QUESTION NUMBER ***"
    elif is_subpart:
        marker = "*** SUBPART ***"
    
    print(f"\nBlock {i}: {marker}")
    print(f"  Position: y={y0:.1f}")
    # Handle Unicode characters
    try:
        print(f"  Text (first 150 chars): {repr(text[:150])}")
    except:
        print(f"  Text (first 150 chars): [Unicode error - contains special chars]")
        print(f"  Text length: {len(text)}")
    
    if i >= 30:  # Show first 30 blocks
        print(f"\n... (showing first 30 blocks only)")
        break

doc.close()
print("\n" + "="*80)

# Made with Bob
