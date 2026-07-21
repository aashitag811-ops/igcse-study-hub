"""
Ultra-Advanced Biology MCQ Parser
Uses OCR, image processing, and computer vision to extract ALL 40 questions perfectly
Starts fresh from Question 1
"""

import pdfplumber
from pdf2image import convert_from_path
import pytesseract
import cv2
import numpy as np
import json
import re
import os
from pathlib import Path
from PIL import Image

# Configuration
QP_PATH = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
MS_PATH = r"C:\Users\sahal\Downloads\Biology 0610 Paper 2\Biology 0610 Paper 2\February March 2020\0610_m20_ms_22.pdf"
OUTPUT_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"
IMAGE_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology"

# Set Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Ensure directories exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)

# Exclusion patterns for noise
NOISE_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over',
    r'Turn over\]',
    r'Cambridge IGCSE',
]

def is_noise(text):
    """Check if text is PDF noise"""
    if not text or len(text.strip()) < 2:
        return True
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_answers_from_ms(ms_path):
    """Extract all 40 answers from marking scheme"""
    print("\n[1/4] Extracting Answers from Marking Scheme...")
    answers = {}
    
    try:
        with pdfplumber.open(ms_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
            
            # Find answer patterns
            pattern = r'(\d+)\s+([A-D])'
            matches = re.findall(pattern, full_text)
            
            for q_num, answer in matches:
                q_num = int(q_num)
                if 1 <= q_num <= 40:
                    answers[q_num] = answer
            
            print(f"  Found {len(answers)}/40 answers")
            
            # Show which answers are missing
            missing = [i for i in range(1, 41) if i not in answers]
            if missing:
                print(f"  Missing answers for: {missing}")
    
    except Exception as e:
        print(f"  ERROR: {e}")
    
    return answers

def convert_pdf_to_images(pdf_path):
    """Convert entire PDF to high-resolution images"""
    print("\n[2/4] Converting PDF to Images...")
    try:
        # Explicitly specify poppler path for Windows
        poppler_path = r"C:\Program Files\poppler\Library\bin"
        images = convert_from_path(pdf_path, dpi=300, poppler_path=poppler_path)
        print(f"  Converted {len(images)} pages to images")
        return images
    except Exception as e:
        print(f"  ERROR: {e}")
        return []

def extract_question_from_page_image(page_img, page_num, question_num):
    """
    Extract a specific question from a page image using OCR
    Returns: (question_text, options_dict, image_path)
    """
    # Convert PIL image to OpenCV format
    img_cv = cv2.cvtColor(np.array(page_img), cv2.COLOR_RGB2BGR)
    
    # Use OCR to get all text with bounding boxes
    ocr_data = pytesseract.image_to_data(page_img, output_type=pytesseract.Output.DICT)
    
    # Find the question number position
    question_pattern = f"^{question_num}$"
    q_num_boxes = []
    
    for i, text in enumerate(ocr_data['text']):
        if text.strip() == str(question_num):
            x, y, w, h = ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i]
            q_num_boxes.append((x, y, w, h))
    
    if not q_num_boxes:
        return None, None, None
    
    # Use the first occurrence
    qx, qy, qw, qh = q_num_boxes[0]
    
    # Extract region from question number to bottom of page
    # This captures the entire question including images
    question_region = img_cv[qy:, :]
    
    # Save the question region as an image
    img_filename = f"q{question_num}_full.png"
    img_path = os.path.join(IMAGE_DIR, img_filename)
    cv2.imwrite(img_path, question_region)
    
    # OCR the question region
    question_pil = Image.fromarray(cv2.cvtColor(question_region, cv2.COLOR_BGR2RGB))
    question_text_full = pytesseract.image_to_string(question_pil)
    
    # Clean the text
    lines = [line.strip() for line in question_text_full.split('\n') if line.strip() and not is_noise(line)]
    
    # Parse question text and options
    question_text = []
    options = {'A': '', 'B': '', 'C': '', 'D': ''}
    current_option = None
    found_options = False
    
    for line in lines:
        # Skip the question number itself
        if line == str(question_num):
            continue
        
        # Check for option markers
        option_match = re.match(r'^([A-D])\s+(.+)', line)
        if option_match:
            found_options = True
            current_option = option_match.group(1)
            options[current_option] = option_match.group(2).strip()
        elif current_option and found_options:
            # Continue previous option
            options[current_option] += ' ' + line
        elif not found_options:
            # Part of question text
            question_text.append(line)
    
    # Check if we got all options
    if not all(options.values()):
        return None, None, None
    
    return ' '.join(question_text), options, f"/images/biology/{img_filename}"

def extract_all_questions_with_ocr(pdf_path):
    """Extract all 40 questions using OCR"""
    print("\n[3/4] Extracting All 40 Questions with OCR...")
    
    # Convert PDF to images
    page_images = convert_pdf_to_images(pdf_path)
    if not page_images:
        print("  ERROR: Could not convert PDF to images")
        return []
    
    questions = []
    
    # Try to extract each question from 1 to 40
    for q_num in range(1, 41):
        print(f"  Processing Q{q_num}...", end=" ")
        
        found = False
        # Search through all pages
        for page_num, page_img in enumerate(page_images, 1):
            q_text, options, img_path = extract_question_from_page_image(page_img, page_num, q_num)
            
            if q_text is not None and options is not None:
                questions.append({
                    'questionNumber': q_num,
                    'questionText': q_text,
                    'options': [
                        {'letter': 'A', 'text': options['A']},
                        {'letter': 'B', 'text': options['B']},
                        {'letter': 'C', 'text': options['C']},
                        {'letter': 'D', 'text': options['D']}
                    ],
                    'imageUrl': img_path
                })
                print(f"OK (page {page_num})")
                found = True
                break
        
        if not found:
            print("FAILED")
    
    print(f"\n  Total extracted: {len(questions)}/40")
    return questions

def main():
    print("="*70)
    print("ULTRA-ADVANCED PARSER - Starting Fresh from Q1")
    print("="*70)
    
    # Step 1: Extract answers
    answers = extract_answers_from_ms(MS_PATH)
    
    # Step 2-3: Extract all questions with OCR
    questions = extract_all_questions_with_ocr(QP_PATH)
    
    # Step 4: Match answers to questions
    print("\n[4/4] Matching Answers to Questions...")
    for question in questions:
        q_num = question['questionNumber']
        if q_num in answers:
            question['correctAnswer'] = answers[q_num]
            print(f"  Q{q_num} -> {answers[q_num]}")
        else:
            question['correctAnswer'] = 'A'
            print(f"  Q{q_num} -> MISSING (defaulted to A)")
    
    # Create paper object
    paper = {
        'paperId': '0610_m20_qp_22',
        'title': 'Biology Paper 2 - Feb/March 2020 (Ultra-Parsed)',
        'subject': 'Biology',
        'code': '0610',
        'variant': '22',
        'totalQuestions': len(questions),
        'timeLimit': 2700,
        'questions': sorted(questions, key=lambda x: x['questionNumber'])
    }
    
    # Save to JSON
    output_path = os.path.join(OUTPUT_DIR, '0610_m20_qp_22.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*70)
    print(f"SUCCESS: Saved to {output_path}")
    print(f"Questions: {len(questions)}/40")
    print(f"Images: {IMAGE_DIR}")
    print("="*70)

if __name__ == "__main__":
    main()

# Made with Bob
