"""
0610 M20 22 MCQ/ER Parser Engine - Blueprint Implementation
Standardized parser for Biology (0610) February/March 2020 Paper 22
Handles MCQ extraction and Examiner Report segmentation
"""

import pdfplumber
import json
import re
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
OUTPUT_DIR = PROJECT_ROOT / "public" / "papers"
IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "biology"

# Exclusion patterns for headers/footers
EXCLUSION_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over',
    r'Turn over\]',
    r'Cambridge IGCSE',
    r'Cambridge International',
]

# Y-coordinate exclusion zones (top and bottom margins)
TOP_MARGIN = 50
BOTTOM_MARGIN = 50


def is_excluded_text(text: str) -> bool:
    """Check if text matches exclusion patterns"""
    if not text or len(text.strip()) < 3:
        return True
    
    for pattern in EXCLUSION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def clean_text(text: str) -> str:
    """Remove excluded text and clean up"""
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if not is_excluded_text(line):
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)


def extract_qp_text(qp_path: str) -> str:
    """Extract clean text from question paper PDF"""
    full_text = ""
    
    try:
        with pdfplumber.open(qp_path) as pdf:
            for page in pdf.pages:
                # Extract text excluding margins
                bbox = (0, TOP_MARGIN, page.width, page.height - BOTTOM_MARGIN)
                cropped_page = page.within_bbox(bbox)
                page_text = cropped_page.extract_text() or ""
                
                # Clean text
                page_text = clean_text(page_text)
                full_text += page_text + "\n"
    
    except Exception as e:
        print(f"Error extracting QP text: {e}")
    
    return full_text


def parse_mcq_questions(text: str) -> List[Dict]:
    """
    Parse MCQ questions using the Blueprint Pattern from 0610/m20/22
    
    Pattern: Questions start with number followed by space, 
    options are clean uppercase letters A, B, C, D
    """
    questions = []
    
    # Split text using question boundary marker: /\n(?=\d+\s)/g
    # This regex looks ahead for a digit followed by space at line start
    question_blocks = re.split(r'\n(?=\d+\s)', text)
    
    for block in question_blocks:
        if not block.strip():
            continue
        
        # Extract question number from first line
        first_line_match = re.match(r'^(\d+)\s+(.+)', block)
        if not first_line_match:
            continue
        
        q_num = int(first_line_match.group(1))
        
        # Only process questions 1-40
        if not (1 <= q_num <= 40):
            continue
        
        # Extract question text (everything before first option)
        # Pattern: text up until \n\s*A\s+
        option_a_match = re.search(r'\n\s*A\s+', block)
        if not option_a_match:
            continue
        
        question_text = block[:option_a_match.start()].strip()
        # Remove question number from question text
        question_text = re.sub(r'^\d+\s+', '', question_text)
        
        # Extract options A, B, C, D
        options = {}
        option_pattern = r'\n\s*([A-D])\s+([^\n]+(?:\n(?!\s*[A-D]\s+)[^\n]+)*)'
        
        for match in re.finditer(option_pattern, block):
            letter = match.group(1)
            text = match.group(2).strip()
            # Clean up multi-line options
            text = ' '.join(text.split())
            options[letter] = text
        
        # Only add if we have all 4 options
        if len(options) == 4 and all(k in options for k in ['A', 'B', 'C', 'D']):
            questions.append({
                'questionNumber': q_num,
                'questionText': question_text,
                'options': [
                    {'letter': 'A', 'text': options['A']},
                    {'letter': 'B', 'text': options['B']},
                    {'letter': 'C', 'text': options['C']},
                    {'letter': 'D', 'text': options['D']}
                ],
                'correctAnswer': None,  # Will be filled from MS
                'examinerReportNote': None  # Will be filled from ER
            })
    
    return questions


def extract_answers_from_ms(ms_path: str) -> Dict[int, str]:
    """Extract correct answers from marking scheme"""
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
            # Pattern matches: number followed by space and letter A-D
            pattern = r'(\d+)\s+([A-D])\b'
            matches = re.findall(pattern, text)
            
            for q_num_str, answer in matches:
                q_num = int(q_num_str)
                if 1 <= q_num <= 40:
                    answers[q_num] = answer
    
    except Exception as e:
        print(f"Error extracting answers: {e}")
    
    return answers


def isolate_paper_22_er_section(er_text: str) -> str:
    """
    Isolate Component 22 section from master ER file
    
    Start Boundary: "Component 0610/22 Multiple Choice (Extended)"
    End Boundary: "Component 0610/32" (or next component)
    """
    # Find start boundary
    start_pattern = r'Component\s+0610/22\s+Multiple\s+Choice\s+\(Extended\)'
    start_match = re.search(start_pattern, er_text, re.IGNORECASE)
    
    if not start_match:
        print("Warning: Could not find Paper 22 start boundary in ER")
        return ""
    
    start_pos = start_match.end()
    
    # Find end boundary (next component)
    end_pattern = r'Component\s+0610/3[0-9]'
    end_match = re.search(end_pattern, er_text[start_pos:], re.IGNORECASE)
    
    if end_match:
        end_pos = start_pos + end_match.start()
        return er_text[start_pos:end_pos]
    else:
        # If no next component found, take rest of document
        return er_text[start_pos:]


def extract_er_notes(er_path: str) -> Dict[int, str]:
    """
    Extract Examiner Report notes for each question
    
    Pattern: Lines starting with "Question 1", "Question 2", etc.
    Extract the analytical paragraph following each question marker
    """
    er_notes = {}
    
    try:
        with pdfplumber.open(er_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                # Extract text excluding margins
                bbox = (0, TOP_MARGIN, page.width, page.height - BOTTOM_MARGIN)
                cropped_page = page.within_bbox(bbox)
                page_text = cropped_page.extract_text() or ""
                full_text += clean_text(page_text) + "\n"
            
            # Isolate Paper 22 section
            paper_22_text = isolate_paper_22_er_section(full_text)
            
            if not paper_22_text:
                print("Warning: No Paper 22 section found in ER")
                return er_notes
            
            # Extract question notes
            # Pattern: "Question N" followed by text until next "Question" or end
            question_pattern = r'Question\s+(\d+)\s*\n((?:(?!Question\s+\d+).)+)'
            
            matches = re.finditer(question_pattern, paper_22_text, re.DOTALL | re.IGNORECASE)
            
            for match in matches:
                q_num = int(match.group(1))
                note_text = match.group(2).strip()
                
                # Clean up the note text
                note_text = ' '.join(note_text.split())
                
                if 1 <= q_num <= 40 and note_text:
                    er_notes[q_num] = note_text
    
    except Exception as e:
        print(f"Error extracting ER notes: {e}")
    
    return er_notes


def create_paper_json(qp_path: str, ms_path: str, er_path: str, output_name: str) -> bool:
    """
    Create complete JSON file with MCQ data and ER notes
    
    Args:
        qp_path: Path to question paper PDF
        ms_path: Path to marking scheme PDF
        er_path: Path to examiner report PDF
        output_name: Output filename (without .json)
    
    Returns:
        True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"Processing {output_name}...")
    print(f"{'='*60}")
    
    # Validate input files
    if not os.path.exists(qp_path):
        print(f"ERROR: Question paper not found: {qp_path}")
        return False
    
    if not os.path.exists(ms_path):
        print(f"ERROR: Marking scheme not found: {ms_path}")
        return False
    
    # ER is optional
    has_er = os.path.exists(er_path)
    if not has_er:
        print(f"Warning: Examiner report not found: {er_path}")
    
    # Step 1: Extract question paper text and parse questions
    print("\n[1/4] Extracting and parsing questions...")
    qp_text = extract_qp_text(qp_path)
    questions = parse_mcq_questions(qp_text)
    print(f"  ✓ Extracted {len(questions)} questions")
    
    # Step 2: Extract answers from marking scheme
    print("\n[2/4] Extracting answers from marking scheme...")
    answers = extract_answers_from_ms(ms_path)
    print(f"  ✓ Extracted {len(answers)} answers")
    
    # Step 3: Extract ER notes if available
    er_notes = {}
    if has_er:
        print("\n[3/4] Extracting Examiner Report notes...")
        er_notes = extract_er_notes(er_path)
        print(f"  ✓ Extracted {len(er_notes)} ER notes")
    else:
        print("\n[3/4] Skipping ER extraction (file not found)")
    
    # Step 4: Combine all data
    print("\n[4/4] Combining data and creating JSON...")
    
    for question in questions:
        q_num = question['questionNumber']
        
        # Add correct answer
        if q_num in answers:
            question['correctAnswer'] = answers[q_num]
        else:
            question['correctAnswer'] = 'A'  # Default fallback
            print(f"  Warning: No answer found for Q{q_num}")
        
        # Add ER note if available
        if q_num in er_notes:
            question['examinerReportNote'] = er_notes[q_num]
    
    # Create paper object
    paper = {
        'paperId': output_name,
        'title': 'Biology Paper 2 - February/March 2020',
        'subject': 'Biology',
        'code': '0610',
        'variant': '22',
        'session': 'm20',
        'totalQuestions': len(questions),
        'timeLimit': 2700,  # 45 minutes in seconds
        'questions': sorted(questions, key=lambda x: x['questionNumber'])
    }
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Save to JSON
    output_path = OUTPUT_DIR / f"{output_name}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"SUCCESS: Created {output_path}")
    print(f"  Questions: {len(questions)}")
    print(f"  Answers: {len(answers)}")
    print(f"  ER Notes: {len(er_notes)}")
    print(f"{'='*60}\n")
    
    return True


def main():
    """Main execution function"""
    print("="*60)
    print("0610 M20 22 MCQ/ER Parser Engine")
    print("Blueprint Implementation for Biology Feb/March 2020 Paper 22")
    print("="*60)
    
    # Define file paths
    qp_path = str(SCRIPTS_DIR / "0610_m20_qp_22.pdf")
    ms_path = str(SCRIPTS_DIR / "0610_m20_ms_22.pdf")
    er_path = str(SCRIPTS_DIR / "0610_m20_er.pdf")
    output_name = "0610_2020_m_22"
    
    # Process the paper
    success = create_paper_json(qp_path, ms_path, er_path, output_name)
    
    if success:
        print("\n✓ Parser completed successfully!")
        print(f"✓ Output: {OUTPUT_DIR / output_name}.json")
    else:
        print("\n✗ Parser failed!")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

# Made with Bob