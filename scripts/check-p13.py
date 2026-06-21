"""Check Paper 13 question order"""
import sys
sys.path.insert(0, 'scripts')
import fitz
import re

def is_junk(text):
    JUNK_PATTERNS = [
        r'www\.dynamicpapers\.com',
        r'©\s*UCLES\s*\d{4}',
        r'^\s*\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}\s*$',
        r'^\s*\[Turn over\s*$',
        r'^\s*BLANK PAGE\s*$',
        r'^\s*\*+\s*\d+\s*\*+\s*$',
        r'^\d+\s+hours?$',
        r'^Paper\s+\d+',
        r'^INFORMATION AND COMMUNICATION TECHNOLOGY$',
    ]
    text = text.strip()
    if re.match(r'^\d{1,2}$', text):
        return False
    if len(text) < 3:
        return True
    for pattern in JUNK_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def clean_lines(lines):
    cleaned = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if is_junk(line):
            continue
        if re.match(r'^\.*$', line):
            continue
        if len(re.findall(r'\.', line)) > len(line) * 0.6:
            continue
        if re.match(r'^\d{2,}$', line):
            continue
        cleaned.append(line)
    return cleaned

def is_main_question(line):
    return re.match(r'^\d{1,2}(\s|$)', line) is not None

pdf_path = "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_13.pdf"
doc = fitz.open(pdf_path)

raw_lines = []
for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    for line in text.split('\n'):
        raw_lines.append(line.strip())
doc.close()

cleaned = clean_lines(raw_lines)

print("Question numbers found in Paper 13:")
for i, line in enumerate(cleaned[:100]):  # First 100 lines
    if is_main_question(line):
        q_num = line.split()[0] if ' ' in line else line
        print(f"Line {i}: Q{q_num} - '{line[:60]}'")

# Made with Bob
