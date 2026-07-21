"""
Fix Q24 and Q25 with exact boundaries from PDF analysis
"""

import fitz
import os

PDF_PATH = "scripts/0610_m20_qp_22.pdf"
OUTPUT_DIR = "public/images/biology/questions"

doc = fitz.open(PDF_PATH)
page = doc[8]  # Page 9 (index 8)

# Q24: "How many molecules of ethanol..." - very short question
# Starts after Q23 table, ends before Q25
# From text analysis: Q24 is between Q23 and Q25
rect_q24 = fitz.Rect(0, 256, page.rect.width, 330)  # Short question, just text
mat = fitz.Matrix(2, 2)
pix = page.get_pixmap(matrix=mat, clip=rect_q24)
pix.save(os.path.join(OUTPUT_DIR, "q24.png"))
print(f"Q24 fixed: {pix.width}x{pix.height}px (only Q24, short question)")

# Q25: "The diagram shows a kidney..." with kidney diagram
# Starts at "25" marker, includes full diagram and all options
rect_q25 = fitz.Rect(0, 330, page.rect.width, 752)  # From Q25 start to page bottom
pix = page.get_pixmap(matrix=mat, clip=rect_q25)
pix.save(os.path.join(OUTPUT_DIR, "q25.png"))
print(f"Q25 fixed: {pix.width}x{pix.height}px (complete with kidney diagram)")

doc.close()

print("\nQ24 and Q25 fixed with correct boundaries!")

# Made with Bob
