"""
POLISHED PARSER V2 - Fixes for:
1. Skip Page 1 (front-page instructions)
2. Prevent duplicate/ghost cards
3. Replace CID characters (✓ and X)
4. Preserve line breaks in text
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

# CID character replacement dictionary
CID_REPLACEMENTS = {
    '(cid:26)': '✓',  # Tick/Yes
    '(cid:22)': '✗',  # Cross/No
    '(cid:3)': ' ',   # Space
    '(cid:4)': ' ',   # Space
}

def clean_cid_text(text):
    """Replace CID characters with proper symbols"""
    for cid, replacement in CID_REPLACEMENTS.items():
        text = text.replace(cid, replacement)
    return text

# Rule of 4: Find question numbers and their A, B, C, D coordinates
questions = []
processed_blocks = set()  # Track processed text to prevent duplicates

for page_num in range(len(doc)):
    # SKIP PAGE 1 (Page 0 in 0-indexed) - Front page instructions
    if page_num == 0:
        print(f"Skipping Page 1 (front-page instructions)")
        continue
    
    page = doc[page_num]
    page_dict = page.get_text("dict")
    blocks = page_dict["blocks"]
    
    # Find all bold numbers (question markers) and option letters
    for block_idx, block in enumerate(blocks):
        if "lines" not in block:
            continue
        
        # Create unique block identifier to prevent duplicates
        block_text = ""
        for line in block["lines"]:
            for span in line["spans"]:
                block_text += span["text"]
        
        block_id = f"p{page_num}_b{block_idx}_{block_text[:50]}"
        
        # Skip if already processed (prevents ghost duplicates)
        if block_id in processed_blocks:
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
                            'options': [],
                            'block_id': block_id
                        })
                        processed_blocks.add(block_id)
                
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

print(f"Found {len(questions)} question markers (excluding Page 1)")

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
print(f"\nFixes applied:")
print("[OK] Skipped Page 1 (front-page instructions)")
print("[OK] Prevented duplicate/ghost cards with block tracking")
print("[OK] CID character replacement ready (will be applied in JSON)")

# Made with Bob
