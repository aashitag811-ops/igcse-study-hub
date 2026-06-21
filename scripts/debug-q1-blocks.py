import fitz
import re

pdf_path = r"C:\Users\HP\Downloads\ICT 0417 Paper 1\ICT 0417 Paper 1\May June 2020\0417_s20_qp_11.pdf"
doc = fitz.open(pdf_path)

print("="*80)
print("DEBUGGING QUESTION 1 BLOCKS")
print("="*80)

in_q1 = False
in_q2 = False

for page_num in range(len(doc)):
    if page_num == 0:  # Skip cover
        continue
    
    page = doc[page_num]
    blocks = page.get_text("blocks")
    
    for i, b in enumerate(blocks):
        x0, y0, x1, y1, text, block_no, block_type = b
        text = text.strip()
        
        # Check if this is question 1
        if re.match(r'^1$', text):
            in_q1 = True
            print(f"\n>>> FOUND QUESTION 1 on page {page_num+1}, block {i}")
            print(f"Block text: {repr(text)}")
            continue
        
        # Check if this is question 2 (end of Q1)
        if re.match(r'^2$', text):
            in_q2 = True
            in_q1 = False
            print(f"\n>>> FOUND QUESTION 2 on page {page_num+1}, block {i} - STOPPING Q1 DEBUG")
            break
        
        # Print all blocks in Q1
        if in_q1:
            is_subpart = bool(re.match(r'^\([a-z]\)', text))
            marker = "*** SUBPART ***" if is_subpart else ""
            print(f"\nBlock {i} (page {page_num+1}): {marker}")
            print(f"  Position: y={y0:.1f}")
            print(f"  Text: {repr(text[:200])}")  # First 200 chars
            if is_subpart:
                print(f"  >>> DETECTED AS SUBPART!")
    
    if in_q2:
        break

doc.close()
print("\n" + "="*80)

# Made with Bob
