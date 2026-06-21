import fitz
import re

def is_junk(text):
    """Check if line is junk (watermarks, page numbers, etc.)"""
    if len(text) < 2:
        if re.match(r'^\d$', text):
            return False
        return True
    
    junk_patterns = [
        r'www\.dynamicpapers\.com',
        r'©\s*UCLES\s*\d{4}',
        r'^\s*\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}\s*$',
        r'^\s*\[Turn over\s*$',
        r'^\s*BLANK PAGE\s*$',
        r'^\s*\*+\s*\d+\s*\*+\s*$',
        r'^Cambridge',
        r'^Permission to reproduce',
        r'^University of Cambridge',
    ]
    
    for pattern in junk_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return True
    
    return False

pdf_path = "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"

# Extract lines
doc = fitz.open(pdf_path)
lines = []

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    
    for line in text.split('\n'):
        line = line.strip()
        if line:
            lines.append(line)

doc.close()

print(f"Total lines before cleaning: {len(lines)}")

# Find Q1 before cleaning
q1_index_before = None
for i, line in enumerate(lines):
    if line == "1" and i > 30 and i < 50:  # Around line 38
        q1_index_before = i
        print(f"Found Q1 at index {i} BEFORE cleaning")
        break

# Clean
cleaned_lines = [line for line in lines if not is_junk(line)]

print(f"Total lines after cleaning: {len(cleaned_lines)}")

# Find Q1 after cleaning
q1_index_after = None
for i, line in enumerate(cleaned_lines):
    if line == "1" and i > 30 and i < 50:
        q1_index_after = i
        print(f"Found Q1 at index {i} AFTER cleaning")
        break

if q1_index_before and not q1_index_after:
    print("ERROR: Q1 was REMOVED during cleaning!")
elif q1_index_before and q1_index_after:
    print(f"SUCCESS: Q1 survived cleaning (moved from {q1_index_before} to {q1_index_after})")

# Made with Bob
