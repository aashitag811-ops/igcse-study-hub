"""Quick script to see what markers are being found"""
import sys
sys.path.insert(0, 'scripts')
from production_parser import extract_lines_from_pdf, clean_lines, is_junk, find_all_markers

pdf_path = "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"

# Extract
raw_lines, line_to_page = extract_lines_from_pdf(pdf_path)

# Clean
cleaned_lines = []
cleaned_line_to_page = {}
for i, line in enumerate(raw_lines):
    if not is_junk(line):
        cleaned_idx = len(cleaned_lines)
        cleaned_lines.append(line)
        cleaned_line_to_page[cleaned_idx] = line_to_page[i]

# Find markers
markers = find_all_markers(cleaned_lines, cleaned_line_to_page)

print(f"Found {len(markers)} markers:\n")
for m in markers:
    if m.type == 'main':
        print(f"Line {m.line_num} (Page {m.page_num}): Q{m.number} - {m.text[:60]}")

# Made with Bob
