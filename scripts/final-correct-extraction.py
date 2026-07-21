"""
Final correct extraction - analyze PDF structure and extract each question properly
"""

import fitz  # PyMuPDF
import os
import re

PDF_PATH = "scripts/0610_m20_qp_22.pdf"
OUTPUT_DIR = "public/images/biology/questions"
os.makedirs(OUTPUT_DIR, exist_ok=True)

doc = fitz.open(PDF_PATH)

print("Analyzing PDF structure to find all 40 questions...\n")

# Find all question numbers and their positions
question_positions = []

for page_num in range(len(doc)):
    page = doc[page_num]
    text_dict = page.get_text("dict")
    
    for block in text_dict["blocks"]:
        if "lines" not in block:
            continue
            
        for line in block["lines"]:
            for span in line["spans"]:
                text = span["text"].strip()
                # Look for standalone question numbers 1-40
                if re.match(r'^(\d{1,2})$', text):
                    num = int(text)
                    if 1 <= num <= 40:
                        y_pos = span["bbox"][1]
                        # Only add if not too close to page edges (avoid page numbers)
                        if 40 < y_pos < page.rect.height - 40:
                            question_positions.append({
                                'number': num,
                                'page': page_num,
                                'y': y_pos,
                                'bbox': span["bbox"]
                            })

# Remove duplicates, keep first occurrence
seen = {}
for pos in question_positions:
    if pos['number'] not in seen:
        seen[pos['number']] = pos

# Sort by question number
sorted_questions = sorted(seen.values(), key=lambda x: x['number'])

print(f"Found {len(sorted_questions)} unique question positions\n")

# Extract each question
for i, q_info in enumerate(sorted_questions):
    q_num = q_info['number']
    page_idx = q_info['page']
    y_start = max(40, q_info['y'] - 5)  # Start slightly above question number
    
    # Find y_end (start of next question or page bottom)
    if i < len(sorted_questions) - 1:
        next_q = sorted_questions[i + 1]
        if next_q['page'] == page_idx:
            # Next question on same page
            y_end = next_q['y'] - 5
        else:
            # Next question on different page
            y_end = doc[page_idx].rect.height - 40
    else:
        # Last question
        y_end = doc[page_idx].rect.height - 40
    
    try:
        page = doc[page_idx]
        rect = fitz.Rect(0, y_start, page.rect.width, y_end)
        mat = fitz.Matrix(2, 2)  # 2x DPI
        pix = page.get_pixmap(matrix=mat, clip=rect)
        
        output_path = os.path.join(OUTPUT_DIR, f"q{q_num}.png")
        pix.save(output_path)
        
        height = y_end - y_start
        print(f"Q{q_num:2d}: Page {page_idx+1:2d}, y={y_start:4.0f}-{y_end:4.0f} ({height:3.0f}px) -> {pix.width}x{pix.height}px")
        
    except Exception as e:
        print(f"ERROR Q{q_num}: {e}")

doc.close()

print("\n" + "="*70)
print("Extraction complete!")
print("="*70)

# Made with Bob
