"""
Universal MCQ Parser Engine
Works for all IGCSE MCQ papers (0455 Economics, 0610 Biology, etc.)
Handles MCQ extraction and Examiner Report segmentation
"""

import pdfplumber
import json
import re
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
OUTPUT_DIR = PROJECT_ROOT / "public" / "papers"
IMAGE_DIR = PROJECT_ROOT / "public" / "images"

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


def extract_pdf_text(pdf_path: str) -> str:
    """Extract clean text from PDF"""
    full_text = ""
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Extract text excluding margins
                bbox = (0, TOP_MARGIN, page.width, page.height - BOTTOM_MARGIN)
                cropped_page = page.within_bbox(bbox)
                page_text = cropped_page.extract_text() or ""
                
                # Clean text
                page_text = clean_text(page_text)
                full_text += page_text + "\n"
    
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
    
    return full_text


def parse_mcq_questions(text: str, max_questions: int = 40) -> List[Dict]:
    """
    Universal MCQ parser using the Blueprint Pattern
    
    Pattern: Questions start with number followed by space, 
    options are clean uppercase letters A, B, C, D
    """
    questions = []
    
    # Split text using question boundary marker
    question_blocks = re.split(r'\n(?=\d+\s)', text)
    
    for block in question_blocks:
        if not block.strip():
            continue
        
        # Extract question number from first line
        first_line_match = re.match(r'^(\d+)\s+(.+)', block)
        if not first_line_match:
            continue
        
        q_num = int(first_line_match.group(1))
        
        # Only process valid question numbers
        if not (1 <= q_num <= max_questions):
            continue
        
        # Extract question text (everything before first option)
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
                'correctAnswer': None,
                'examinerReportNote': None
            })
    
    return questions


def extract_answers_from_ms(ms_path: str, max_questions: int = 40) -> Dict[int, str]:
    """Extract correct answers from marking scheme"""
    answers = {}
    
    try:
        text = extract_pdf_text(ms_path)
        
        # Look for answer patterns like "1 B", "2 C", etc.
        pattern = r'(\d+)\s+([A-D])\b'
        matches = re.findall(pattern, text)
        
        for q_num_str, answer in matches:
            q_num = int(q_num_str)
            if 1 <= q_num <= max_questions:
                answers[q_num] = answer
    
    except Exception as e:
        print(f"Error extracting answers: {e}")
    
    return answers


def isolate_paper_er_section(er_text: str, subject_code: str, variant: str) -> str:
    """
    Isolate specific paper section from master ER file
    
    Args:
        er_text: Full ER text
        subject_code: e.g., "0610", "0455"
        variant: e.g., "22", "12"
    """
    # Find start boundary - flexible pattern
    start_patterns = [
        rf'Component\s+{subject_code}/{variant}\s+Multiple\s+Choice',
        rf'Component\s+{subject_code}/{variant}',
        rf'Paper\s+{variant}',
    ]
    
    start_match = None
    for pattern in start_patterns:
        start_match = re.search(pattern, er_text, re.IGNORECASE)
        if start_match:
            break
    
    if not start_match:
        print(f"Warning: Could not find Paper {variant} start boundary in ER")
        return ""
    
    start_pos = start_match.end()
    
    # Find end boundary (next component/paper)
    end_patterns = [
        rf'Component\s+{subject_code}/[0-9]{{2}}',
        r'Component\s+\d{4}/[0-9]{2}',
        r'Paper\s+[0-9]{2}',
    ]
    
    end_pos = len(er_text)
    for pattern in end_patterns:
        end_match = re.search(pattern, er_text[start_pos:], re.IGNORECASE)
        if end_match:
            end_pos = start_pos + end_match.start()
            break
    
    return er_text[start_pos:end_pos]


def extract_er_notes(er_path: str, subject_code: str, variant: str, max_questions: int = 40) -> Dict[int, str]:
    """
    Extract Examiner Report notes for each question
    """
    er_notes = {}
    
    try:
        full_text = extract_pdf_text(er_path)
        
        # Isolate paper section
        paper_text = isolate_paper_er_section(full_text, subject_code, variant)
        
        if not paper_text:
            print(f"Warning: No Paper {variant} section found in ER")
            return er_notes
        
        # Extract question notes
        question_pattern = r'Question\s+(\d+)\s*\n((?:(?!Question\s+\d+).)+)'
        
        matches = re.finditer(question_pattern, paper_text, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            q_num = int(match.group(1))
            note_text = match.group(2).strip()
            
            # Clean up the note text
            note_text = ' '.join(note_text.split())
            
            if 1 <= q_num <= max_questions and note_text:
                er_notes[q_num] = note_text
    
    except Exception as e:
        print(f"Error extracting ER notes: {e}")
    
    return er_notes


def parse_paper_id(filename: str) -> Dict[str, str]:
    """
    Parse paper ID from filename
    
    Examples:
        0610_m20_qp_22.pdf -> {code: 0610, session: m20, type: qp, variant: 22}
        0455_s23_ms_12.pdf -> {code: 0455, session: s23, type: ms, variant: 12}
    """
    pattern = r'(\d{4})_([a-z]\d{2})_([a-z]{2})_(\d{2})'
    match = re.match(pattern, filename)
    
    if match:
        return {
            'code': match.group(1),
            'session': match.group(2),
            'type': match.group(3),
            'variant': match.group(4)
        }
    return {}


def get_subject_name(code: str) -> str:
    """Get subject name from code"""
    subjects = {
        '0610': 'Biology',
        '0455': 'Economics',
        '0580': 'Mathematics',
        '0620': 'Chemistry',
        '0625': 'Physics',
    }
    return subjects.get(code, 'Unknown Subject')


def create_paper_json(qp_path: str, ms_path: str, er_path: Optional[str] = None) -> bool:
    """
    Create complete JSON file with MCQ data and ER notes
    """
    # Parse paper info from filename
    qp_filename = os.path.basename(qp_path)
    paper_info = parse_paper_id(qp_filename)
    
    if not paper_info:
        print(f"ERROR: Could not parse paper ID from {qp_filename}")
        return False
    
    subject_code = paper_info['code']
    session = paper_info['session']
    variant = paper_info['variant']
    subject_name = get_subject_name(subject_code)
    
    output_name = f"{subject_code}_{session.split('_')[0]}_{variant}"
    
    print(f"\n{'='*60}")
    print(f"Processing {subject_name} Paper {variant} ({session})")
    print(f"{'='*60}")
    
    # Validate input files
    if not os.path.exists(qp_path):
        print(f"ERROR: Question paper not found: {qp_path}")
        return False
    
    if not os.path.exists(ms_path):
        print(f"ERROR: Marking scheme not found: {ms_path}")
        return False
    
    # ER is optional
    has_er = er_path and os.path.exists(er_path)
    
    # Step 1: Extract and parse questions
    print("\n[1/4] Extracting and parsing questions...")
    qp_text = extract_pdf_text(qp_path)
    questions = parse_mcq_questions(qp_text)
    print(f"  [OK] Extracted {len(questions)} questions")
    
    # Step 2: Extract answers
    print("\n[2/4] Extracting answers from marking scheme...")
    answers = extract_answers_from_ms(ms_path)
    print(f"  [OK] Extracted {len(answers)} answers")
    
    # Step 3: Extract ER notes if available
    er_notes = {}
    if has_er and er_path:
        print("\n[3/4] Extracting Examiner Report notes...")
        er_notes = extract_er_notes(er_path, subject_code, variant)
        print(f"  [OK] Extracted {len(er_notes)} ER notes")
    else:
        print("\n[3/4] Skipping ER extraction (file not provided)")
    
    # Step 4: Combine all data
    print("\n[4/4] Combining data and creating JSON...")
    
    for question in questions:
        q_num = question['questionNumber']
        
        # Add correct answer
        if q_num in answers:
            question['correctAnswer'] = answers[q_num]
        else:
            question['correctAnswer'] = 'A'
            print(f"  Warning: No answer found for Q{q_num}")
        
        # Add ER note if available
        if q_num in er_notes:
            question['examinerReportNote'] = er_notes[q_num]
    
    # Create paper object
    paper = {
        'paperId': output_name,
        'title': f'{subject_name} Paper {variant} - {session}',
        'subject': subject_name,
        'code': subject_code,
        'variant': variant,
        'session': session,
        'totalQuestions': len(questions),
        'timeLimit': 2700,  # 45 minutes
        'questions': sorted(questions, key=lambda x: x['questionNumber'])
    }
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Save to JSON
    output_path = OUTPUT_DIR / f"{output_name}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"[SUCCESS] Created {output_path}")
    print(f"  Questions: {len(questions)}")
    print(f"  Answers: {len(answers)}")
    print(f"  ER Notes: {len(er_notes)}")
    print(f"{'='*60}\n")
    
    return True


def main():
    """Main execution function"""
    if len(sys.argv) < 3:
        print("Usage: python universal-mcq-parser.py <qp_path> <ms_path> [er_path]")
        print("\nExample:")
        print("  python universal-mcq-parser.py 0455_m20_qp_22.pdf 0455_m20_ms_22.pdf")
        print("  python universal-mcq-parser.py 0610_m20_qp_22.pdf 0610_m20_ms_22.pdf 0610_m20_er.pdf")
        return 1
    
    qp_path = sys.argv[1]
    ms_path = sys.argv[2]
    er_path = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Convert to absolute paths if relative
    if not os.path.isabs(qp_path):
        qp_path = str(SCRIPTS_DIR / qp_path)
    if not os.path.isabs(ms_path):
        ms_path = str(SCRIPTS_DIR / ms_path)
    if er_path and not os.path.isabs(er_path):
        er_path = str(SCRIPTS_DIR / er_path)
    
    print("="*60)
    print("Universal MCQ Parser Engine")
    print("="*60)
    
    success = create_paper_json(qp_path, ms_path, er_path)
    
    if success:
        print("\n[OK] Parser completed successfully!")
    else:
        print("\n[FAIL] Parser failed!")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

# Made with Bob
