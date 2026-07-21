"""
BOSS LEVEL PARSER - Coordinate-Based Logic
Treats PDF as a visual grid, not a text stream
Implements all 5 critical rules for perfect extraction
"""

import pdfplumber
import json
import os
import re
from PIL import Image
import io

# Configuration
QP_PATH = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
MS_PATH = r"C:\Users\sahal\Downloads\Biology 0610 Paper 2\Biology 0610 Paper 2\February March 2020\0610_m20_ms_22.pdf"
OUTPUT_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"
IMAGE_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)

# RULE 4: Footer Kill - Bottom 10% is dead zone
FOOTER_DEAD_ZONE = 0.10  # Bottom 10% of page

# RULE 1: Left-Margin Anchor - Question numbers must be at left margin
LEFT_MARGIN_THRESHOLD = 100  # X-coordinate must be less than this

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

def is_bold_text(char):
    """Check if character is bold based on font name"""
    font_name = char.get('fontname', '').lower()
    return 'bold' in font_name or 'heavy' in font_name

def find_question_numbers_by_coordinates(page):
    """
    RULE 1: Left-Margin Anchor Rule
    Find question numbers that are:
    1. Bold
    2. At far-left margin (X < LEFT_MARGIN_THRESHOLD)
    3. Followed by whitespace
    """
    chars = page.chars
    page_height = page.height
    footer_y = page_height * (1 - FOOTER_DEAD_ZONE)
    
    question_markers = []
    
    for i, char in enumerate(chars):
        # RULE 4: Skip footer dead zone
        if char['y0'] > footer_y:
            continue
        
        # Check if it's a digit
        if char['text'].isdigit():
            # RULE 1: Check if it's at left margin
            if char['x0'] < LEFT_MARGIN_THRESHOLD:
                # Check if it's bold
                if is_bold_text(char):
                    # Build the full number (could be 1-40)
                    number_str = char['text']
                    j = i + 1
                    while j < len(chars) and chars[j]['text'].isdigit():
                        number_str += chars[j]['text']
                        j += 1
                    
                    q_num = int(number_str)
                    if 1 <= q_num <= 40:
                        question_markers.append({
                            'number': q_num,
                            'x': char['x0'],
                            'y': char['y0'],
                            'page': page.page_number
                        })
    
    return question_markers

def extract_diagram_between_stem_and_options(page, stem_bottom_y, option_a_top_y):
    """
    RULE 3: Coordinate-Based Diagram Snipping
    If gap > 40 pixels between stem and Option A, extract diagram
    """
    gap = option_a_top_y - stem_bottom_y
    
    if gap > 40:
        # There's a diagram here - extract it
        bbox = (0, stem_bottom_y, page.width, option_a_top_y)
        
        try:
            # Crop the page to this region
            cropped = page.within_bbox(bbox)
            img = cropped.to_image(resolution=300)
            return img.original
        except:
            return None
    
    return None

def extract_options_by_coordinates(page, question_y, next_question_y):
    """
    RULE 2: A-B-C-D Boundary (Hard Stop)
    Extract options A, B, C, D and STOP after D
    """
    chars = page.chars
    page_height = page.height
    footer_y = page_height * (1 - FOOTER_DEAD_ZONE)
    
    # Find A, B, C, D at left margin
    options = {}
    option_positions = {}
    
    for char in chars:
        # RULE 4: Skip footer
        if char['y0'] > footer_y:
            continue
        
        # Check if Y is in question range
        if question_y <= char['y0'] < next_question_y:
            # Check if it's A, B, C, or D at left margin
            if char['text'] in ['A', 'B', 'C', 'D'] and char['x0'] < LEFT_MARGIN_THRESHOLD:
                if is_bold_text(char):
                    option_positions[char['text']] = char['y0']
    
    # Extract text for each option
    for letter in ['A', 'B', 'C', 'D']:
        if letter not in option_positions:
            continue
        
        option_y = option_positions[letter]
        
        # Find next option or end
        next_letters = [l for l in ['A', 'B', 'C', 'D'] if l > letter and l in option_positions]
        if next_letters:
            next_y = option_positions[next_letters[0]]
        else:
            # RULE 2: After D, stop at next question or page end
            next_y = next_question_y if next_question_y < page_height else footer_y
        
        # Extract text in this Y range
        option_text = ""
        for char in chars:
            if option_y <= char['y0'] < next_y and char['x0'] > LEFT_MARGIN_THRESHOLD:
                option_text += char['text']
        
        options[letter] = option_text.strip()
    
    return options

def parse_with_coordinate_logic(pdf_path):
    """
    Main parser using coordinate-based logic
    """
    print("\n[2/4] Parsing with Coordinate-Based Logic...")
    
    questions = []
    
    with pdfplumber.open(pdf_path) as pdf:
        # Find all question markers across all pages
        all_markers = []
        for page in pdf.pages:
            markers = find_question_numbers_by_coordinates(page)
            all_markers.extend(markers)
        
        # Sort by page and Y position
        all_markers.sort(key=lambda x: (x['page'], x['y']))
        
        print(f"  Found {len(all_markers)} question markers using coordinate logic")
        
        # Process each question
        for i, marker in enumerate(all_markers):
            q_num = marker['number']
            page_num = marker['page']
            page = pdf.pages[page_num - 1]
            
            # Determine end of this question
            if i + 1 < len(all_markers):
                next_marker = all_markers[i + 1]
                if next_marker['page'] == page_num:
                    next_y = next_marker['y']
                else:
                    next_y = page.height * (1 - FOOTER_DEAD_ZONE)
            else:
                next_y = page.height * (1 - FOOTER_DEAD_ZONE)
            
            # Extract options
            options = extract_options_by_coordinates(page, marker['y'], next_y)
            
            if len(options) != 4:
                print(f"  Q{q_num}: SKIP (found {len(options)} options)")
                continue
            
            # Extract question stem (text between question number and Option A)
            if 'A' in options:
                # Find Option A position
                option_a_y = None
                for char in page.chars:
                    if char['text'] == 'A' and char['x0'] < LEFT_MARGIN_THRESHOLD and is_bold_text(char):
                        if marker['y'] < char['y0'] < next_y:
                            option_a_y = char['y0']
                            break
                
                if option_a_y:
                    # Extract stem text
                    stem_text = ""
                    for char in page.chars:
                        if marker['y'] < char['y0'] < option_a_y:
                            stem_text += char['text']
                    
                    # RULE 3: Check for diagram
                    diagram = extract_diagram_between_stem_and_options(page, marker['y'] + 20, option_a_y)
                    
                    question_obj = {
                        "questionNumber": q_num,
                        "questionText": stem_text.strip(),
                        "options": [
                            {"letter": "A", "text": options.get('A', '')},
                            {"letter": "B", "text": options.get('B', '')},
                            {"letter": "C", "text": options.get('C', '')},
                            {"letter": "D", "text": options.get('D', '')}
                        ],
                        "imageUrl": f"/images/biology/q{q_num}_diagram.png" if diagram else None,
                        "additionalImages": []
                    }
                    
                    # Save diagram if exists
                    if diagram:
                        img_path = os.path.join(IMAGE_DIR, f"q{q_num}_diagram.png")
                        diagram.save(img_path)
                    
                    questions.append(question_obj)
                    print(f"  Q{q_num}: OK")
    
    print(f"\n  Total extracted: {len(questions)}/40")
    return questions

def create_paper_json(questions, answers):
    """Create final JSON with answers"""
    print("\n[3/4] Creating Paper JSON...")
    
    for q in questions:
        q_num = q["questionNumber"]
        q["correctAnswer"] = answers.get(q_num, "A")
    
    paper = {
        "paperId": "0610_m20_qp_22",
        "title": "Biology Paper 2 - Feb/March 2020 (Boss Level)",
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
    print("BOSS LEVEL PARSER - Coordinate-Based Logic")
    print("="*70)
    
    # Step 1: Extract answers
    answers = extract_answers_from_ms(MS_PATH)
    
    # Step 2: Parse with coordinate logic
    questions = parse_with_coordinate_logic(QP_PATH)
    
    # Step 3: Create JSON
    paper = create_paper_json(questions, answers)
    
    print("\n" + "="*70)
    print(f"SUCCESS: Extracted {len(questions)}/40 questions")
    print("="*70)

if __name__ == "__main__":
    main()

# Made with Bob
