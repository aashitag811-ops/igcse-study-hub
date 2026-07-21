"""
Fix Cut Questions - Give more vertical space for Q5, Q8, and others
"""

import fitz
import os

pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

# Questions that need fixing (cut off)
fix_questions = [5, 8, 10, 14, 21, 23, 24, 26, 29, 30, 35, 40]

doc = fitz.open(pdf_path)

for page_num in range(len(doc)):
    if page_num == 0:  # Skip Page 1
        continue
    
    page = doc[page_num]
    
    # Find all LEFT-MARGIN question numbers on this page
    page_questions = []
    for qnum in range(1, 41):
        search_results = page.search_for(f"{qnum} ")
        for rect in search_results:
            if rect.x0 < 100:  # Left margin only
                page_questions.append((qnum, rect))
                break
    
    # Sort by Y coordinate
    page_questions.sort(key=lambda x: x[1].y0)
    
    # Extract questions that need fixing
    for i, (qnum, rect) in enumerate(page_questions):
        if qnum not in fix_questions:
            continue
        
        # Y start: question number position
        y_start = rect.y0 - 15
        
        # Y end: EXTENDED - add more space
        if i + 1 < len(page_questions):
            # Stop 10px before next question (was 20px)
            y_end = page_questions[i + 1][1].y0 - 10
        else:
            # Use more of the page (was -80, now -40)
            y_end = page.rect.height - 40
        
        # Create clip rectangle
        clip_rect = fitz.Rect(40, y_start, page.rect.width - 40, y_end)
        
        # Render at 2x resolution
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat, clip=clip_rect)
        
        # Save (overwrite)
        img_path = os.path.join(output_dir, f"q{qnum}.png")
        pix.save(img_path)
        print(f"[FIXED] Q{qnum} -> q{qnum}.png (Page {page_num + 1}, extended space)")

doc.close()
print("\n[DONE] Fixed cut-off questions with extended vertical space")

# Made with Bob
