import fitz

pdf_path = r"C:\Users\HP\Downloads\ICT_0417_Papers\ICT 0417 Paper 1\May June 2020\0417_s20_qp_11.pdf"
doc = fitz.open(pdf_path)

# Get text from page 2 (index 1)
page = doc[1]
text = page.get_text()

# Show first 2000 characters
print("=== RAW TEXT FROM PAGE 2 ===")
print(repr(text[:2000]))

# Made with Bob
