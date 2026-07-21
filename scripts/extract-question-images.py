"""
Extract Each Question as a Full Image
Captures the entire question including options A, B, C, D as one image
"""

import fitz  # PyMuPDF
import os
from PIL import Image
import io

# Paths
pdf_path = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers\0610_m20_qp_22.pdf"
output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

# Create output directory
os.makedirs(output_dir, exist_ok=True)

# Open PDF
doc = fitz.open(pdf_path)

print(f"PDF has {len(doc)} pages")

# Question detection pattern - look for "1 ", "2 ", etc. at start of line
question_markers = []

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text("text")
    
    # Find question numbers
    lines = text.split('\n')
    for i, line in enumerate(lines):
        line = line.strip()
        # Match "1 ", "2 ", ... "40 " at start of line
        if line and len(line) > 2 and line[0].isdigit():
            parts = line.split(maxsplit=1)
            if parts and parts[0].isdigit() and 1 <= int(parts[0]) <= 40:
                qnum = int(parts[0])
                question_markers.append({
                    'number': qnum,
                    'page': page_num,
                    'line_index': i
                })

print(f"Found {len(question_markers)} question markers")

# Extract each question as image
# Strategy: For each question, find its bounding box from question number to next question
for i, marker in enumerate(question_markers):
    qnum = marker['number']
    page_num = marker['page']
    
    page = doc[page_num]
    
    # Get page dimensions
    page_rect = page.rect
    
    # Find Y coordinate of question start
    text_instances = page.search_for(f"{qnum} ")
    if not text_instances:
        print(f"Could not find Q{qnum} on page {page_num}")
        continue
    
    # Get the first instance (question number)
    q_rect = text_instances[0]
    y_start = q_rect.y0 - 10  # Add small margin above
    
    # Find Y coordinate of next question or end of page
    if i + 1 < len(question_markers):
        next_marker = question_markers[i + 1]
        if next_marker['page'] == page_num:
            # Next question on same page
            next_instances = page.search_for(f"{next_marker['number']} ")
            if next_instances:
                y_end = next_instances[0].y0 - 20  # Stop before next question
            else:
                y_end = page_rect.height - 80  # Default to near bottom
        else:
            # Next question on different page - use full page height
            y_end = page_rect.height - 80
    else:
        # Last question
        y_end = page_rect.height - 80
    
    # Create clip rectangle for this question
    clip_rect = fitz.Rect(50, y_start, page_rect.width - 50, y_end)
    
    # Render the clipped area as image
    mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
    pix = page.get_pixmap(matrix=mat, clip=clip_rect)
    
    # Save image
    img_path = os.path.join(output_dir, f"q{qnum}.png")
    pix.save(img_path)
    
    print(f"Extracted Q{qnum} -> {img_path}")

print(f"\nExtracted {len(question_markers)} question images to {output_dir}")

# Made with Bob
