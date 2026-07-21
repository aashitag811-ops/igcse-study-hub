"""
Extract all 40 Biology questions as full-page images at 2x DPI
Based on MCQ_INTERFACE_HANDOFF.md specifications
"""

import fitz  # PyMuPDF
import os
from pathlib import Path

# Paths
PDF_PATH = "scripts/0610_m20_qp_22.pdf"
OUTPUT_DIR = "public/images/biology/questions"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Open PDF
doc = fitz.open(PDF_PATH)

print(f"Total pages in PDF: {len(doc)}")
print(f"Extracting questions at 2x DPI (300 DPI)...")

# Question extraction boundaries (from handoff document)
# Standard question extraction
Y_START = 100  # Top margin
Y_END = 750    # Bottom margin (before next question)

# Extract each question
for question_num in range(1, 41):
    # Calculate page number (questions start on page 2, 2 questions per page)
    page_num = 1 + (question_num - 1) // 2  # Page 2 = questions 1-2, Page 3 = 3-4, etc.
    
    # Determine if it's the first or second question on the page
    is_first_question = (question_num % 2 == 1)
    
    print(f"\nProcessing Q{question_num} (Page {page_num + 1}, {'First' if is_first_question else 'Second'} question)")
    
    try:
        page = doc[page_num]
        page_height = page.rect.height
        page_width = page.rect.width
        
        # Define crop rectangle based on question position
        if is_first_question:
            # First question on page: from top to middle
            y_start = Y_START
            y_end = page_height / 2 if question_num < 40 else page_height - 50
        else:
            # Second question on page: from middle to bottom
            y_start = page_height / 2
            y_end = page_height - 50
        
        # Special cases from handoff document
        if question_num == 20:
            y_end = 820  # Extends lower
        if question_num == 40:
            y_end = page_height - 50  # Last question to page bottom
        
        # Create crop rectangle
        rect = fitz.Rect(0, y_start, page_width, y_end)
        
        # Extract at 2x DPI (300 DPI)
        mat = fitz.Matrix(2, 2)  # 2x zoom = 300 DPI
        pix = page.get_pixmap(matrix=mat, clip=rect)
        
        # Save image
        output_path = os.path.join(OUTPUT_DIR, f"q{question_num}.png")
        pix.save(output_path)
        
        print(f"SUCCESS: Saved q{question_num}.png ({pix.width}x{pix.height}px)")
        
    except Exception as e:
        print(f"ERROR: Failed to extract Q{question_num}: {e}")

doc.close()

print("\n" + "="*50)
print("Extraction complete!")
print(f"All 40 questions saved to: {OUTPUT_DIR}")
print("="*50)

# Made with Bob
