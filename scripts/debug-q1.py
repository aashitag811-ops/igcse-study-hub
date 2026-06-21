import fitz
import re

pdf_path = "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"

# Extract lines
doc = fitz.open(pdf_path)
lines = []
line_to_page = {}

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    
    for line in text.split('\n'):
        line = line.strip()
        if line:
            line_idx = len(lines)
            lines.append(line)
            line_to_page[line_idx] = page_num + 1

doc.close()

# Find Q1
print("Looking for Q1...")
for i, line in enumerate(lines[:100]):
    page = line_to_page.get(i, 0)
    
    # Check if it's "1"
    if line == "1":
        print(f"Found '1' at line {i}, page {page}")
        print(f"  Previous line: {lines[i-1] if i > 0 else 'N/A'}")
        print(f"  Next line: {lines[i+1] if i < len(lines)-1 else 'N/A'}")
        
        # Check marker detection
        match = re.match(r'^(\d{1,2})$', line)
        if match:
            print(f"  Marker detected: main, number={match.group(1)}")
        
        # Check if page > 1
        if page > 1:
            print(f"  Page {page} > 1: SHOULD BE INCLUDED")
        else:
            print(f"  Page {page} <= 1: SKIPPED")

# Made with Bob
