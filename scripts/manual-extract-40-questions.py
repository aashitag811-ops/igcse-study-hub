"""
Manually extract all 40 Biology questions with correct boundaries
Based on actual PDF structure analysis
"""

import fitz  # PyMuPDF
import os

# Paths
PDF_PATH = "scripts/0610_m20_qp_22.pdf"
OUTPUT_DIR = "public/images/biology/questions"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Open PDF
doc = fitz.open(PDF_PATH)

print(f"Total pages in PDF: {len(doc)}")
print(f"Extracting all 40 questions with manual boundaries...\n")

# Manual question boundaries (page_index, y_start, y_end)
# Analyzed from the PDF structure
question_boundaries = {
    1: (1, 50, 200),    # Page 2, Q1
    2: (1, 200, 360),   # Page 2, Q2
    3: (1, 360, 487),   # Page 2, Q3
    4: (1, 487, 792),   # Page 2, Q4
    5: (2, 53, 180),    # Page 3, Q5
    6: (2, 180, 310),   # Page 3, Q6
    7: (2, 310, 436),   # Page 3, Q7
    8: (2, 436, 792),   # Page 3, Q8
    9: (3, 53, 217),    # Page 4, Q9
    10: (3, 217, 382),  # Page 4, Q10
    11: (3, 382, 792),  # Page 4, Q11
    12: (4, 53, 337),   # Page 5, Q12
    13: (4, 337, 792),  # Page 5, Q13
    14: (5, 53, 293),   # Page 6, Q14
    15: (5, 293, 470),  # Page 6, Q15
    16: (5, 470, 792),  # Page 6, Q16
    17: (6, 53, 192),   # Page 7, Q17
    18: (6, 192, 344),  # Page 7, Q18
    19: (6, 344, 470),  # Page 7, Q19
    20: (6, 470, 792),  # Page 7, Q20
    21: (7, 53, 385),   # Page 8, Q21
    22: (7, 385, 540),  # Page 8, Q22
    23: (7, 540, 792),  # Page 8, Q23
    24: (8, 53, 251),   # Page 9, Q24
    25: (8, 251, 792),  # Page 9, Q25
    26: (9, 53, 280),   # Page 10, Q26
    27: (9, 280, 462),  # Page 10, Q27
    28: (9, 462, 792),  # Page 10, Q28
    29: (10, 53, 221),  # Page 11, Q29
    30: (10, 221, 401), # Page 11, Q30
    31: (10, 401, 527), # Page 11, Q31
    32: (10, 527, 792), # Page 11, Q32
    33: (11, 53, 223),  # Page 12, Q33
    34: (11, 223, 349), # Page 12, Q34
    35: (11, 349, 792), # Page 12, Q35
    36: (12, 53, 297),  # Page 13, Q36
    37: (12, 297, 516), # Page 13, Q37
    38: (12, 516, 792), # Page 13, Q38
    39: (13, 53, 179),  # Page 14, Q39
    40: (13, 179, 792), # Page 14, Q40
}

# Extract each question
for q_num in range(1, 41):
    page_idx, y_start, y_end = question_boundaries[q_num]
    
    try:
        page = doc[page_idx]
        page_width = page.rect.width
        
        # Create crop rectangle
        rect = fitz.Rect(0, y_start, page_width, y_end)
        
        # Extract at 2x DPI (300 DPI)
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat, clip=rect)
        
        # Save image
        output_path = os.path.join(OUTPUT_DIR, f"q{q_num}.png")
        pix.save(output_path)
        
        height_px = y_end - y_start
        print(f"Q{q_num:2d}: Page {page_idx + 1}, y={y_start:3.0f}-{y_end:3.0f} ({height_px:3.0f}px) -> {pix.width}x{pix.height}px")
        
    except Exception as e:
        print(f"ERROR Q{q_num}: {e}")

doc.close()

print("\n" + "="*70)
print(f"Extraction complete! All 40 questions saved to: {OUTPUT_DIR}")
print("="*70)

# Made with Bob
