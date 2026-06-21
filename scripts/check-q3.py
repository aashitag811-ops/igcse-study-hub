import pdfplumber

# Open PDF
pdf = pdfplumber.open('ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf')

# Extract text from pages 2-3 (where Q3 likely is)
text = ''
for page in pdf.pages[1:3]:
    text += page.extract_text() + '\n'

# Split into lines
lines = [l.strip() for l in text.split('\n') if l.strip()]

# Find Q3
found_q3 = False
count = 0
for i, line in enumerate(lines):
    if not found_q3:
        # Look for line starting with "3 " or "3  "
        if line.startswith('3 ') or line.startswith('3  '):
            found_q3 = True
            print(f"Found Q3 at line {i}:")
            print(f"{i}: {line}")
            count = 1
    elif found_q3 and count < 15:
        print(f"{i}: {line}")
        count += 1
    elif count >= 15:
        break

pdf.close()

# Made with Bob
