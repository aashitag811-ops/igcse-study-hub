"""
Extract Missing Questions Using Simple Y-Coordinate Approach
For questions where options are in tables or special layouts
"""

import fitz
import os

pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

# Missing questions
missing = [5, 8, 10, 14, 21, 23, 24, 26, 29, 30, 35, 40]

doc = fitz.open(pdf_path)

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text("text")
    
    # Find all question numbers on this page
    page_questions = []
    for qnum in range(1, 41):
        # Search for question number at start of line
        search_results = page.search_for(f"{qnum} ")
        if search_results:
            page_questions.append((qnum, search_results[0]))
    
    # Sort by Y coordinate
    page_questions.sort(key=lambda x: x[1].y0)
    
    # Extract missing questions
    for i, (qnum, rect) in enumerate(page_questions):
        if qnum not in missing:
            continue
            
        # Check if already extracted
        img_path = os.path.join(output_dir, f"q{qnum}.png")
        if os.path.exists(img_path):
            print(f"Q{qnum} already exists, skipping")
            continue
        
        # Y start: question number position
        y_start = rect.y0 - 15
        
        # Y end: next question or page bottom
        if i + 1 < len(page_questions):
            y_end = page_questions[i + 1][1].y0 - 20
        else:
            y_end = page.rect.height - 80
        
        # Create clip rectangle
        clip_rect = fitz.Rect(40, y_start, page.rect.width - 40, y_end)
        
        # Render at 2x resolution
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat, clip=clip_rect)
        
        # Save
        pix.save(img_path)
        print(f"[OK] Q{qnum} -> q{qnum}.png")

doc.close()
print("\n[DONE] Extracted missing questions")

# Made with Bob
