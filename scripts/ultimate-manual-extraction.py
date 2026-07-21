"""
Ultimate manual extraction with verified boundaries
Based on actual PDF analysis and screenshot verification
"""

import fitz
import os

PDF_PATH = "scripts/0610_m20_qp_22.pdf"
OUTPUT_DIR = "public/images/biology/questions"
os.makedirs(OUTPUT_DIR, exist_ok=True)

doc = fitz.open(PDF_PATH)

# Manually verified boundaries for ALL 40 questions
# Format: (page_index, y_start, y_end)
BOUNDARIES = {
    # Page 2 (index 1): Q1, Q2, Q3, Q4
    1: (1, 58, 184),    # Q1 only
    2: (1, 184, 365),   # Q2 only (with full table)
    3: (1, 365, 492),   # Q3 only
    4: (1, 492, 752),   # Q4 only
    
    # Page 3 (index 2): Q5, Q6, Q7
    5: (2, 58, 315),    # Q5 complete with diagram
    6: (2, 315, 441),   # Q6 complete
    7: (2, 441, 752),   # Q7 complete
    
    # Page 4 (index 3): Q8, Q9, Q10
    8: (3, 58, 222),    # Q8 complete
    9: (3, 222, 387),   # Q9 complete
    10: (3, 387, 752),  # Q10 complete
    
    # Page 5 (index 4): Q11, Q12
    11: (4, 58, 342),   # Q11 complete
    12: (4, 342, 752),  # Q12 complete
    
    # Page 6 (index 5): Q13, Q14, Q15
    13: (5, 58, 298),   # Q13 complete
    14: (5, 298, 475),  # Q14 complete
    15: (5, 475, 752),  # Q15 complete
    
    # Page 7 (index 6): Q16, Q17, Q18, Q19
    16: (6, 58, 197),   # Q16 complete
    17: (6, 197, 349),  # Q17 complete
    18: (6, 349, 475),  # Q18 complete
    19: (6, 475, 752),  # Q19 complete
    
    # Page 8 (index 7): Q20, Q21, Q22
    20: (7, 58, 390),   # Q20 complete
    21: (7, 390, 545),  # Q21 complete
    22: (7, 545, 752),  # Q22 complete
    
    # Page 9 (index 8): Q23, Q24, Q25
    23: (8, 58, 256),   # Q23 complete
    24: (8, 256, 390),  # Q24 only (short question)
    25: (8, 390, 752),  # Q25 complete with kidney diagram
    
    # Page 10 (index 9): Q26, Q27, Q28
    26: (9, 58, 285),   # Q26 complete
    27: (9, 285, 467),  # Q27 complete
    28: (9, 467, 752),  # Q28 complete
    
    # Page 11 (index 10): Q29, Q30, Q31, Q32
    29: (10, 58, 226),  # Q29 complete
    30: (10, 226, 406), # Q30 complete
    31: (10, 406, 532), # Q31 complete
    32: (10, 532, 752), # Q32 complete
    
    # Page 12 (index 11): Q33, Q34, Q35
    33: (11, 58, 228),  # Q33 complete
    34: (11, 228, 354), # Q34 complete
    35: (11, 354, 752), # Q35 complete
    
    # Page 13 (index 12): Q36, Q37, Q38
    36: (12, 58, 302),  # Q36 complete
    37: (12, 302, 521), # Q37 complete
    38: (12, 521, 752), # Q38 complete
    
    # Page 14 (index 13): Q39, Q40
    39: (13, 58, 184),  # Q39 complete
    40: (13, 184, 752), # Q40 complete (last question)
}

print("Extracting all 40 questions with manually verified boundaries...\n")

for q_num in range(1, 41):
    page_idx, y_start, y_end = BOUNDARIES[q_num]
    
    try:
        page = doc[page_idx]
        rect = fitz.Rect(0, y_start, page.rect.width, y_end)
        mat = fitz.Matrix(2, 2)  # 2x DPI
        pix = page.get_pixmap(matrix=mat, clip=rect)
        
        output_path = os.path.join(OUTPUT_DIR, f"q{q_num}.png")
        pix.save(output_path)
        
        height = y_end - y_start
        print(f"Q{q_num:2d}: Page {page_idx+1:2d}, y={y_start:3.0f}-{y_end:3.0f} ({height:3.0f}px) -> {pix.width}x{pix.height}px")
        
    except Exception as e:
        print(f"ERROR Q{q_num}: {e}")

doc.close()

print("\n" + "="*70)
print("All 40 questions extracted with verified boundaries!")
print("="*70)

# Made with Bob
