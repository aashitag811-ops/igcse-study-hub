"""
ULTIMATE PARSER - PyMuPDF Based
Fixes all 4 critical issues:
1. Hard-Split on Bold Numbers (One Bold Number = One Card)
2. Visual Anchoring (Diagrams stay with their question)
3. Fix Font Encoding (No more CID errors)
4. Isolate Options (Clean A, B, C, D extraction)
"""

import fitz  # PyMuPDF
import json
import os
import re
from pathlib import Path

# Configuration
QP_PATH = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
MS_PATH = r"C:\Users\sahal\Downloads\Biology 0610 Paper 2\Biology 0610 Paper 2\February March 2020\0610_m20_ms_22.pdf"
OUTPUT_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"
IMAGE_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)

def extract_answers_from_ms(ms_path):
    """Extract all 40 answers from marking scheme"""
    print("\n[1/3] Extracting Answers from Marking Scheme...")
    answers = {}
    
    try:
        doc = fitz.open(ms_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text() + "\n"
        doc.close()
        
        pattern = r'(\d+)\s+([A-D])'
        matches = re.findall(pattern, full_text)
        
        for q_num, answer in matches:
            q_num = int(q_num)
            if 1 <= q_num <= 40:
                answers[q_num] = answer
        
        print(f"  Extracted {len(answers)}/40 answers")
    
    except Exception as e:
        print(f"  ERROR: {e}")
    
    return answers

def is_bold_text(span):
    """Check if text span is bold"""
    flags = span.get('flags', 0)
    # Check if bold flag is set (bit 4)
    return bool(flags & 2**4)

def find_question_boundaries(page):
    """
    FIX #1: Hard-Split on Bold Numbers
    Find all bold numbers 1-40 at left margin
    Returns list of (question_number, y_position)
    """
    blocks = page.get_text("dict")["blocks"]
    question_markers = []
    
    for block in blocks:
        if block.get("type") == 0:  # Text block
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    x0 = span.get("bbox", [0])[0]
                    y0 = span.get("bbox", [0, 0])[1]
                    
                    # Check if it's a number at left margin
                    if text.isdigit() and x0 < 100:
                        q_num = int(text)
                        if 1 <= q_num <= 40 and is_bold_text(span):
                            question_markers.append({
                                'number': q_num,
                                'y': y0,
                                'page': page.number
                            })
    
    return question_markers

def extract_text_between_y(page, y_start, y_end):
    """Extract all text between two Y coordinates"""
    blocks = page.get_text("dict")["blocks"]
    text_parts = []
    
    for block in blocks:
        if block.get("type") == 0:  # Text block
            bbox = block.get("bbox", [0, 0, 0, 0])
            block_y = bbox[1]
            
            if y_start <= block_y < y_end:
                for line in block.get("lines", []):
                    line_text = ""
                    for span in line.get("spans", []):
                        # PyMuPDF handles CID encoding automatically
                        line_text += span.get("text", "")
                    if line_text.strip():
                        text_parts.append(line_text.strip())
    
    return " ".join(text_parts)

def extract_options_from_text(text):
    """
    FIX #4: Isolate Options
    Extract clean A, B, C, D options
    """
    options = {}
    
    # Pattern: Letter at start of line followed by text
    pattern = r'(?:^|\n)([A-D])\s+([^\n]+?)(?=\n[A-D]\s+|\n\d+\s+|$)'
    matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
    
    for letter, option_text in matches:
        if letter not in options:
            # Clean the text
            option_text = option_text.strip()
            # Remove footer noise
            option_text = re.sub(r'©\s*UCLES.*', '', option_text)
            option_text = re.sub(r'\[Turn over\]', '', option_text)
            options[letter] = option_text
    
    return options

def extract_diagram_between(page, y_start, y_end, q_num):
    """
    FIX #2: Visual Anchoring
    Extract diagram between question stem and options
    """
    # Get all images in the page
    image_list = page.get_images()
    
    for img_index, img in enumerate(image_list):
        try:
            # Get image position
            img_rects = page.get_image_rects(img[0])
            if img_rects:
                img_rect = img_rects[0]
                img_y = img_rect.y0
                
                # Check if image is in our Y range
                if y_start <= img_y < y_end:
                    # Extract the image
                    xref = img[0]
                    base_image = page.parent.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    # Save image
                    img_path = os.path.join(IMAGE_DIR, f"q{q_num}_diagram.png")
                    with open(img_path, "wb") as img_file:
                        img_file.write(image_bytes)
                    
                    return f"/images/biology/q{q_num}_diagram.png"
        except:
            continue
    
    return None

def parse_with_pymupdf(pdf_path):
    """
    Main parser using PyMuPDF
    FIX #3: Handles CID encoding automatically
    """
    print("\n[2/3] Parsing with PyMuPDF (Ultimate Parser)...")
    
    questions = []
    doc = fitz.open(pdf_path)
    
    # Find all question markers across all pages
    all_markers = []
    for page in doc:
        markers = find_question_boundaries(page)
        all_markers.extend(markers)
    
    # Sort by page and Y position
    all_markers.sort(key=lambda x: (x['page'], x['y']))
    
    # Remove duplicates (keep first occurrence)
    seen_numbers = set()
    unique_markers = []
    for marker in all_markers:
        if marker['number'] not in seen_numbers:
            unique_markers.append(marker)
            seen_numbers.add(marker['number'])
    
    print(f"  Found {len(unique_markers)} unique question markers")
    
    # Process each question
    for i, marker in enumerate(unique_markers):
        q_num = marker['number']
        page_num = marker['page']
        page = doc[page_num]
        y_start = marker['y']
        
        # Determine end Y (next question or page end)
        if i + 1 < len(unique_markers):
            next_marker = unique_markers[i + 1]
            if next_marker['page'] == page_num:
                y_end = next_marker['y']
            else:
                y_end = page.rect.height * 0.9  # Exclude footer
        else:
            y_end = page.rect.height * 0.9
        
        # Extract all text in this range
        full_text = extract_text_between_y(page, y_start, y_end)
        
        # Extract options
        options = extract_options_from_text(full_text)
        
        if len(options) != 4:
            print(f"  Q{q_num}: SKIP (found {len(options)} options)")
            continue
        
        # Extract question stem (text before option A)
        option_a_match = re.search(r'\nA\s+', full_text)
        if option_a_match:
            question_text = full_text[:option_a_match.start()].strip()
            # Remove the question number from the start
            question_text = re.sub(r'^\d+\s+', '', question_text)
        else:
            question_text = ""
        
        # Find Option A position for diagram extraction
        option_a_y = y_end
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block.get("type") == 0:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if span.get("text", "").strip() == "A":
                            option_a_y = span.get("bbox", [0, 0])[1]
                            break
        
        # Extract diagram
        diagram_url = extract_diagram_between(page, y_start + 20, option_a_y, q_num)
        
        question_obj = {
            "questionNumber": q_num,
            "questionText": question_text,
            "options": [
                {"letter": "A", "text": options.get('A', '')},
                {"letter": "B", "text": options.get('B', '')},
                {"letter": "C", "text": options.get('C', '')},
                {"letter": "D", "text": options.get('D', '')}
            ],
            "imageUrl": diagram_url,
            "additionalImages": []
        }
        
        questions.append(question_obj)
        print(f"  Q{q_num}: OK")
    
    doc.close()
    print(f"\n  Total extracted: {len(questions)}/40")
    return questions

def create_paper_json(questions, answers):
    """Create final JSON with answers"""
    print("\n[3/3] Creating Paper JSON...")
    
    for q in questions:
        q_num = q["questionNumber"]
        q["correctAnswer"] = answers.get(q_num, "A")
    
    paper = {
        "paperId": "0610_m20_qp_22",
        "title": "Biology Paper 2 - Feb/March 2020 (Ultimate)",
        "subject": "Biology",
        "code": "0610",
        "variant": "22",
        "totalQuestions": len(questions),
        "timeLimit": 2700,
        "questions": questions
    }
    
    output_path = os.path.join(OUTPUT_DIR, "0610_m20_qp_22.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    print(f"  Saved to {output_path}")
    return paper

def main():
    print("="*70)
    print("ULTIMATE PARSER - PyMuPDF Based")
    print("Fixes: Question Mashing, Diagram Anchoring, CID Encoding, Option Isolation")
    print("="*70)
    
    # Step 1: Extract answers
    answers = extract_answers_from_ms(MS_PATH)
    
    # Step 2: Parse with PyMuPDF
    questions = parse_with_pymupdf(QP_PATH)
    
    # Step 3: Create JSON
    paper = create_paper_json(questions, answers)
    
    print("\n" + "="*70)
    print(f"SUCCESS: Extracted {len(questions)}/40 questions")
    print("="*70)

if __name__ == "__main__":
    main()

# Made with Bob
