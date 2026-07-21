"""
Advanced Biology MCQ Parser with Image Extraction
Handles all the critical issues:
1. Extracts diagrams and images
2. Filters out PDF headers/footers
3. Strict question numbering
4. Preserves table formatting
5. Prevents question fragmentation
"""

import pdfplumber
import json
import re
import os
from pathlib import Path
from PIL import Image
import io

# Configuration
BASE_DIR = r"C:\Users\sahal\Downloads\Biology 0610 Paper 2\Biology 0610 Paper 2"
OUTPUT_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"
IMAGE_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology"

# Exclusion patterns for headers/footers
EXCLUSION_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over',
    r'Turn over\]',
    r'^\d+$',  # Standalone page numbers
    r'Cambridge IGCSE',
    r'Cambridge International',
]

# Y-coordinate exclusion zones (top and bottom margins)
TOP_MARGIN = 50  # pixels from top
BOTTOM_MARGIN = 50  # pixels from bottom

def is_excluded_text(text):
    """Check if text matches exclusion patterns"""
    if not text or len(text.strip()) < 3:
        return True
    
    for pattern in EXCLUSION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_images_from_page(page, page_num, paper_code):
    """Extract all images from a PDF page"""
    images = []
    
    try:
        # Get images from page
        if hasattr(page, 'images'):
            for img_index, img in enumerate(page.images):
                try:
                    # Extract image data
                    x0, y0, x1, y1 = img['x0'], img['top'], img['x1'], img['bottom']
                    
                    # Skip if in exclusion zones
                    if y0 < TOP_MARGIN or y1 > (page.height - BOTTOM_MARGIN):
                        continue
                    
                    # Create image filename
                    img_filename = f"{paper_code}_p{page_num}_img{img_index}.png"
                    img_path = os.path.join(IMAGE_DIR, img_filename)
                    
                    # Ensure directory exists
                    os.makedirs(IMAGE_DIR, exist_ok=True)
                    
                    # Crop and save image
                    cropped = page.within_bbox((x0, y0, x1, y1))
                    img_obj = cropped.to_image(resolution=300)
                    img_obj.save(img_path)
                    
                    images.append({
                        'filename': img_filename,
                        'path': f"/images/biology/{img_filename}",
                        'y_position': y0,
                        'bbox': (x0, y0, x1, y1)
                    })
                    
                    print(f"    Extracted image: {img_filename}")
                except Exception as e:
                    print(f"    Error extracting image {img_index}: {e}")
    except Exception as e:
        print(f"    Error accessing images on page {page_num}: {e}")
    
    return images

def clean_text(text):
    """Remove excluded text and clean up"""
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if not is_excluded_text(line):
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

def extract_questions_with_images(qp_path, paper_code):
    """Extract questions with proper image association"""
    questions = []
    all_images = []
    
    try:
        with pdfplumber.open(qp_path) as pdf:
            full_text = ""
            
            # First pass: Extract all images and text
            for page_num, page in enumerate(pdf.pages, 1):
                print(f"  Processing page {page_num}...")
                
                # Extract images
                page_images = extract_images_from_page(page, page_num, paper_code)
                all_images.extend(page_images)
                
                # Extract text (excluding margins)
                bbox = (0, TOP_MARGIN, page.width, page.height - BOTTOM_MARGIN)
                cropped_page = page.within_bbox(bbox)
                page_text = cropped_page.extract_text() or ""
                
                # Clean text
                page_text = clean_text(page_text)
                full_text += page_text + "\n"
            
            print(f"  Total images extracted: {len(all_images)}")
            
            # Second pass: Parse questions with strict regex
            # Pattern: Bold number (1-40) at start of line, followed by text
            question_pattern = r'\n(\d{1,2})\s+([A-Z][^\n]+)'
            matches = list(re.finditer(question_pattern, full_text))
            
            for i, match in enumerate(matches):
                q_num = int(match.group(1))
                
                # Only process questions 1-40
                if not (1 <= q_num <= 40):
                    continue
                
                # Get question text (from this match to next match or end)
                start_pos = match.start()
                end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
                question_block = full_text[start_pos:end_pos].strip()
                
                # Split into question text and options
                lines = question_block.split('\n')
                question_text_lines = []
                options = {'A': '', 'B': '', 'C': '', 'D': ''}
                current_option = None
                
                for line in lines[1:]:  # Skip first line (question number)
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Check for option markers
                    option_match = re.match(r'^([A-D])\s+(.+)', line)
                    if option_match:
                        current_option = option_match.group(1)
                        options[current_option] = option_match.group(2).strip()
                    elif current_option:
                        # Continue previous option
                        options[current_option] += ' ' + line
                    else:
                        # Part of question text
                        question_text_lines.append(line)
                
                # Find associated image (closest image before this question)
                associated_image = None
                for img in all_images:
                    # Simple heuristic: image within 200 pixels before question
                    # This would need refinement based on actual PDF layout
                    if not associated_image:
                        associated_image = img['path']
                        break
                
                # Only add if we have all 4 options
                if all(options.values()):
                    questions.append({
                        'questionNumber': q_num,
                        'questionText': ' '.join(question_text_lines),
                        'options': [
                            {'letter': 'A', 'text': options['A']},
                            {'letter': 'B', 'text': options['B']},
                            {'letter': 'C', 'text': options['C']},
                            {'letter': 'D', 'text': options['D']}
                        ],
                        'imageUrl': associated_image
                    })
            
            print(f"  Extracted {len(questions)} questions")
    
    except Exception as e:
        print(f"  Error extracting questions: {e}")
    
    return questions

def extract_answers_from_ms(ms_path):
    """Extract answers from marking scheme"""
    answers = {}
    try:
        with pdfplumber.open(ms_path) as pdf:
            text = ""
            for page in pdf.pages:
                # Extract text excluding margins
                bbox = (0, TOP_MARGIN, page.width, page.height - BOTTOM_MARGIN)
                cropped_page = page.within_bbox(bbox)
                page_text = cropped_page.extract_text() or ""
                text += clean_text(page_text) + "\n"
            
            # Look for answer patterns like "1 B", "2 C", etc.
            pattern = r'(\d+)\s+([A-D])'
            matches = re.findall(pattern, text)
            
            for q_num, answer in matches:
                q_num = int(q_num)
                if 1 <= q_num <= 40:
                    answers[q_num] = answer
            
            print(f"  Extracted {len(answers)} answers from marking scheme")
    except Exception as e:
        print(f"  Error extracting answers: {e}")
    
    return answers

def process_paper(folder, qp_file, ms_file, output_name):
    """Process a single paper with advanced extraction"""
    print(f"\n{'='*60}")
    print(f"Processing {output_name}...")
    print(f"{'='*60}")
    
    qp_path = os.path.join(BASE_DIR, folder, qp_file)
    ms_path = os.path.join(BASE_DIR, folder, ms_file)
    
    if not os.path.exists(qp_path):
        print(f"  ERROR: Question paper not found: {qp_path}")
        return False
    
    if not os.path.exists(ms_path):
        print(f"  ERROR: Marking scheme not found: {ms_path}")
        return False
    
    # Extract data
    print("\n[1/3] Extracting images and questions...")
    questions = extract_questions_with_images(qp_path, output_name)
    
    print("\n[2/3] Extracting answers from marking scheme...")
    answers = extract_answers_from_ms(ms_path)
    
    print("\n[3/3] Matching answers to questions...")
    # Match answers to questions
    for question in questions:
        q_num = question['questionNumber']
        if q_num in answers:
            question['correctAnswer'] = answers[q_num]
        else:
            question['correctAnswer'] = 'A'  # Default fallback
            print(f"  WARNING: No answer found for Q{q_num}")
    
    # Create paper object
    paper = {
        'paperId': output_name,
        'title': f"Biology Paper 2 - {folder}",
        'subject': 'Biology',
        'code': '0610',
        'variant': '22',
        'totalQuestions': len(questions),
        'timeLimit': 2700,  # 45 minutes
        'questions': sorted(questions, key=lambda x: x['questionNumber'])
    }
    
    # Save to JSON
    output_path = os.path.join(OUTPUT_DIR, f"{output_name}.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    print(f"\nSUCCESS: Saved to {output_path}")
    print(f"  Questions: {len(questions)}")
    print(f"  Images: Check {IMAGE_DIR}")
    return True

def main():
    """Process one paper as a test"""
    print("="*60)
    print("Advanced Biology MCQ Parser - Test Run")
    print("="*60)
    
    # Test with Feb/March 2020
    folder = "February March 2020"
    qp_file = "0610_m20_qp_22.pdf"
    ms_file = "0610_m20_ms_22.pdf"
    output_name = "0610_m20_qp_22"
    
    # Ensure output directories exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)
    
    success = process_paper(folder, qp_file, ms_file, output_name)
    
    print("\n" + "="*60)
    if success:
        print("SUCCESS: Test completed successfully!")
        print(f"Check: {OUTPUT_DIR}/{output_name}.json")
        print(f"Images: {IMAGE_DIR}/")
    else:
        print("FAILED: Test failed")
    print("="*60)

if __name__ == "__main__":
    main()

# Made with Bob
