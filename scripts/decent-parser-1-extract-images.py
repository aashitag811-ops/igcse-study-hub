"""
Extract Full Question Images Using "Rule of 4" and Coordinate-Based Logic
Each question = 1 stem + exactly 4 option bubbles (A, B, C, D)
"""

import fitz  # PyMuPDF
import os

# Paths
pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

# Create output directory
os.makedirs(output_dir, exist_ok=True)

# Open PDF
doc = fitz.open(pdf_path)
print(f"PDF has {len(doc)} pages\n")

# Rule of 4: Find question numbers and their A, B, C, D coordinates
questions = []

for page_num in range(len(doc)):
    page = doc[page_num]
    page_dict = page.get_text("dict")
    blocks = page_dict["blocks"]
    
    # Find all bold numbers (question markers) and option letters
    for block in blocks:
        if "lines" not in block:
            continue
            
        for line in block["lines"]:
            for span in line["spans"]:
                text = span["text"].strip()
                bbox = span["bbox"]  # (x0, y0, x1, y1)
                
                # Check if it's a question number (1-40, bold, left margin)
                if text.isdigit() and 1 <= int(text) <= 40:
                    if bbox[0] < 100 and "Bold" in span.get("font", ""):
                        questions.append({
                            'number': int(text),
                            'page': page_num,
                            'y_start': bbox[1],
                            'options': []
                        })
                
                # Check if it's an option letter (A, B, C, D in option column)
                if text in ['A', 'B', 'C', 'D'] and len(questions) > 0:
                    # Option letters are typically in a specific X range
                    if 50 < bbox[0] < 150:
                        last_q = questions[-1]
                        if last_q['page'] == page_num:
                            last_q['options'].append({
                                'letter': text,
                                'y': bbox[1]
                            })

print(f"Found {len(questions)} question markers")

# Filter questions that have exactly 4 options (Rule of 4)
valid_questions = []
for q in questions:
    if len(q['options']) == 4:
        # Verify they are A, B, C, D in order
        letters = [opt['letter'] for opt in q['options']]
        if letters == ['A', 'B', 'C', 'D']:
            valid_questions.append(q)
        else:
            print(f"Q{q['number']}: Found 4 options but not A,B,C,D: {letters}")
    else:
        print(f"Q{q['number']}: Found {len(q['options'])} options (expected 4)")

print(f"\nValid questions with Rule of 4: {len(valid_questions)}")

# Extract each valid question as image
for i, q in enumerate(valid_questions):
    qnum = q['number']
    page_num = q['page']
    page = doc[page_num]
    
    # Y coordinates: from question start to after option D
    y_start = q['y_start'] - 15  # Small margin above question
    y_end = q['options'][-1]['y'] + 50  # After option D
    
    # If there's a next question on same page, stop before it
    if i + 1 < len(valid_questions):
        next_q = valid_questions[i + 1]
        if next_q['page'] == page_num:
            y_end = min(y_end, next_q['y_start'] - 20)
    
    # Create clip rectangle
    page_rect = page.rect
    clip_rect = fitz.Rect(40, y_start, page_rect.width - 40, y_end)
    
    # Render at 2x resolution for quality
    mat = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat, clip=clip_rect)
    
    # Save
    img_path = os.path.join(output_dir, f"q{qnum}.png")
    pix.save(img_path)
    print(f"[OK] Q{qnum} -> q{qnum}.png")

print(f"\n[SUCCESS] Extracted {len(valid_questions)} question images")
print(f"Output directory: {output_dir}")

# Made with Bob
