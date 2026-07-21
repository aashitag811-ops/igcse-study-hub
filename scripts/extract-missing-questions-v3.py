"""
Extract Missing Questions V3 - Fixed to only match LEFT-MARGIN question numbers
Prevents matching "5" from "45 minutes" on Page 1
"""

import fitz
import os

pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

# Missing questions (update this list as needed)
missing = [5, 8, 10, 14, 21, 23, 24, 26, 29, 30, 35, 40]

doc = fitz.open(pdf_path)

for page_num in range(len(doc)):
    # SKIP PAGE 1 (Page 0) - Front page instructions
    if page_num == 0:
        continue
    
    page = doc[page_num]
    
    # Find all question numbers on this page (LEFT MARGIN ONLY)
    page_questions = []
    for qnum in range(1, 41):
        # Search for question number
        search_results = page.search_for(f"{qnum} ")
        
        # Filter to only LEFT MARGIN (x < 100)
        for rect in search_results:
            if rect.x0 < 100:  # Left margin only
                page_questions.append((qnum, rect))
                break  # Only take first left-margin match
    
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
        print(f"[OK] Q{qnum} -> q{qnum}.png (Page {page_num + 1})")

doc.close()
print("\n[DONE] Extracted missing questions (Page 1 skipped, left-margin only)")

# Made with Bob
