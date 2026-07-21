"""
Extract all 40 Biology MCQ questions as individual images
Detects question boundaries by finding question numbers in the PDF
"""

import fitz  # PyMuPDF
import os
import re

# Paths
PDF_PATH = "scripts/0610_m20_qp_22.pdf"
OUTPUT_DIR = "public/images/biology/questions"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Open PDF
doc = fitz.open(PDF_PATH)

print(f"Total pages in PDF: {len(doc)}")
print(f"Extracting all 40 questions at 2x DPI (300 DPI)...\n")

# Track all question positions
question_positions = []

# Scan all pages to find question numbers
for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text("dict")
    
    # Search for question numbers (1-40)
    for block in text["blocks"]:
        if "lines" in block:
            for line in block["lines"]:
                for span in line["spans"]:
                    text_content = span["text"].strip()
                    # Match standalone numbers 1-40
                    if re.match(r'^(\d{1,2})$', text_content):
                        q_num = int(text_content)
                        if 1 <= q_num <= 40:
                            # Get position
                            bbox = span["bbox"]
                            y_pos = bbox[1]  # Top y-coordinate
                            
                            question_positions.append({
                                'number': q_num,
                                'page': page_num,
                                'y_start': y_pos - 10,  # Start slightly above number
                                'bbox': bbox
                            })

# Sort by question number
question_positions.sort(key=lambda x: x['number'])

# Remove duplicates (keep first occurrence)
seen = set()
unique_positions = []
for pos in question_positions:
    if pos['number'] not in seen:
        seen.add(pos['number'])
        unique_positions.append(pos)

print(f"Found {len(unique_positions)} questions\n")

# Extract each question
for i, q_pos in enumerate(unique_positions):
    q_num = q_pos['number']
    page_num = q_pos['page']
    y_start = q_pos['y_start']
    
    # Determine y_end (start of next question or page bottom)
    if i < len(unique_positions) - 1:
        next_q = unique_positions[i + 1]
        if next_q['page'] == page_num:
            # Next question is on same page
            y_end = next_q['y_start']
        else:
            # Next question is on different page, go to page bottom
            page = doc[page_num]
            y_end = page.rect.height - 50  # Leave margin for footer
    else:
        # Last question
        page = doc[page_num]
        y_end = page.rect.height - 50
    
    try:
        page = doc[page_num]
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
        print(f"Q{q_num:2d}: Page {page_num + 1}, y={y_start:.0f}-{y_end:.0f} ({height_px:.0f}px) -> {pix.width}x{pix.height}px")
        
    except Exception as e:
        print(f"ERROR Q{q_num}: {e}")

doc.close()

print("\n" + "="*60)
print(f"Extraction complete! Saved to: {OUTPUT_DIR}")
print("="*60)

# Made with Bob
