"""
Enhanced MCQ Parser with Examiner Report (ER) Integration
Extracts examiner feedback for each question and adds to JSON output
"""

import pdfplumber
import json
import re
import os
from pathlib import Path

# Configuration
PASTPAPERS_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\scripts\pastpapers"
OUTPUT_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"
IMAGE_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images"

# Exclusion zones
TOP_EXCLUSION = 50
BOTTOM_EXCLUSION = 80

# Noise patterns
NOISE_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over',
    r'Turn over\]',
    r'Cambridge IGCSE',
    r'Cambridge International',
    r'Page \d+',
]

def is_noise(text):
    """Check if text is footer/header noise"""
    if not text or len(text.strip()) < 2:
        return True
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_er_notes(er_path):
    """
    Extract examiner report notes for each question
    Returns dict: {question_number: examiner_note}
    """
    er_notes = {}
    
    if not os.path.exists(er_path):
        print(f"    No ER file found: {er_path}")
        return er_notes
    
    try:
        with pdfplumber.open(er_path) as pdf:
            full_text = ""
            
            # Extract all text
            for page in pdf.pages:
                bbox = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                text = cropped.extract_text() or ""
                
                # Clean noise
                lines = text.split('\n')
                clean_lines = [line for line in lines if not is_noise(line)]
                full_text += '\n'.join(clean_lines) + '\n'
            
            # Pattern to find question sections in ER
            # Typically: "Question 1" or "1" followed by examiner commentary
            # We'll look for patterns like:
            # "Question 1" or just "1" at start of line, followed by text
            
            # Split by question markers
            question_sections = re.split(r'\n(?:Question\s+)?(\d{1,2})\s*\n', full_text)
            
            # Process sections (odd indices are question numbers, even are content)
            for i in range(1, len(question_sections), 2):
                if i + 1 < len(question_sections):
                    q_num = int(question_sections[i])
                    content = question_sections[i + 1].strip()
                    
                    # Only process MCQ questions (1-40)
                    if 1 <= q_num <= 40 and content:
                        # Clean up the content - take first substantial paragraph
                        paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
                        if paragraphs:
                            # Take first meaningful paragraph as the examiner note
                            er_note = paragraphs[0]
                            # Limit length to avoid overly long notes
                            if len(er_note) > 500:
                                er_note = er_note[:497] + "..."
                            er_notes[q_num] = er_note
                            print(f"      Q{q_num}: Extracted ER note ({len(er_note)} chars)")
            
            print(f"    Extracted {len(er_notes)} ER notes")
            
    except Exception as e:
        print(f"    Error reading ER: {e}")
    
    return er_notes

def extract_answers_from_ms(ms_path):
    """Extract answers from marking scheme"""
    answers = {}
    
    try:
        with pdfplumber.open(ms_path) as pdf:
            full_text = ""
            
            for page in pdf.pages:
                bbox = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                text = cropped.extract_text() or ""
                
                lines = text.split('\n')
                clean_lines = [line for line in lines if not is_noise(line)]
                full_text += '\n'.join(clean_lines) + '\n'
            
            # Pattern: "1 B" or "1  B"
            pattern = r'(\d+)\s+([A-D])'
            
            for line in full_text.split('\n'):
                line = line.strip()
                match = re.search(pattern, line)
                if match:
                    q_num = int(match.group(1))
                    answer = match.group(2)
                    if 1 <= q_num <= 40:
                        answers[q_num] = answer
            
            print(f"    Extracted {len(answers)} answers from MS")
            
    except Exception as e:
        print(f"    Error reading MS: {e}")
    
    return answers

def parse_mcq_paper(qp_path, ms_path, er_path, paper_id):
    """Parse MCQ paper with ER notes integration"""
    questions = []
    
    try:
        with pdfplumber.open(qp_path) as pdf:
            # Extract all text
            page_texts = []
            for page_num, page in enumerate(pdf.pages):
                bbox = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                text = cropped.extract_text() or ""
                
                lines = text.split('\n')
                clean_lines = [line for line in lines if not is_noise(line)]
                clean_text = '\n'.join(clean_lines)
                
                page_texts.append({'page_num': page_num, 'text': clean_text})
            
            full_text = '\n'.join([pt['text'] for pt in page_texts])
            
            # Find question boundaries
            question_pattern = r'\n(\d{1,2})\s+([A-Z][^\n]{10,})'
            matches = list(re.finditer(question_pattern, full_text))
            
            processed_questions = set()
            
            for i, match in enumerate(matches):
                q_num = int(match.group(1))
                
                if not (1 <= q_num <= 40) or q_num in processed_questions:
                    continue
                
                processed_questions.add(q_num)
                
                # Get question block
                start_pos = match.start()
                end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
                question_block = full_text[start_pos:end_pos].strip()
                
                # Parse question text and options
                lines = question_block.split('\n')
                question_text_lines = []
                options = {'A': '', 'B': '', 'C': '', 'D': ''}
                current_option = None
                found_options = False
                
                for line in lines[1:]:
                    line = line.strip()
                    if not line:
                        continue
                    
                    option_match = re.match(r'^([A-D])\s+(.+)', line)
                    if option_match:
                        found_options = True
                        current_option = option_match.group(1)
                        options[current_option] = option_match.group(2).strip()
                    elif current_option and found_options:
                        options[current_option] += ' ' + line
                    else:
                        question_text_lines.append(line)
                
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
                        'imageUrl': None,
                        'additionalImages': []
                    })
            
    except Exception as e:
        print(f"    Error parsing QP: {e}")
    
    # Extract answers from MS
    answers = extract_answers_from_ms(ms_path)
    
    # Extract ER notes
    er_notes = extract_er_notes(er_path)
    
    # Map answers and ER notes to questions
    for question in questions:
        q_num = question['questionNumber']
        
        # Add correct answer
        if q_num in answers:
            question['correctAnswer'] = answers[q_num]
        else:
            question['correctAnswer'] = 'A'
        
        # Add examiner report note if available
        if q_num in er_notes:
            question['examinerReportNote'] = er_notes[q_num]
        else:
            question['examinerReportNote'] = None
    
    return questions

def process_paper(subject_code, subject_name, year, session, session_code, component, variant):
    """Process a single paper with ER integration"""
    
    # Build file paths
    session_dir = os.path.join(PASTPAPERS_DIR, f"{subject_code}-{subject_name}", str(year), session)
    
    qp_file = f"{subject_code}_{session_code}{str(year)[2:]}_qp_{component}{variant}.pdf"
    ms_file = f"{subject_code}_{session_code}{str(year)[2:]}_ms_{component}{variant}.pdf"
    er_file = f"{subject_code}_{session_code}{str(year)[2:]}_er.pdf"  # Note: ER is NOT variant-specific
    
    qp_path = os.path.join(session_dir, qp_file)
    ms_path = os.path.join(session_dir, ms_file)
    er_path = os.path.join(session_dir, er_file)
    
    # Check if files exist
    if not os.path.exists(qp_path):
        print(f"  SKIP: QP not found - {qp_file}")
        return False
    
    if not os.path.exists(ms_path):
        print(f"  SKIP: MS not found - {ms_file}")
        return False
    
    paper_id = f"{subject_code}_{session_code}{str(year)[2:]}_qp_{component}{variant}"
    
    print(f"\n  Processing: {paper_id}")
    print(f"    QP: {qp_file}")
    print(f"    MS: {ms_file}")
    print(f"    ER: {er_file} {'(found)' if os.path.exists(er_path) else '(not found)'}")
    
    # Parse the paper
    questions = parse_mcq_paper(qp_path, ms_path, er_path, paper_id)
    
    if not questions:
        print(f"    ERROR: No questions extracted")
        return False
    
    # Create paper object
    paper = {
        'paperId': paper_id,
        'title': f'{subject_name} Paper {component} - {session} {year}',
        'subject': subject_name,
        'code': subject_code,
        'variant': f'{component}{variant}',
        'totalQuestions': len(questions),
        'timeLimit': 2700,  # 45 minutes
        'questions': sorted(questions, key=lambda x: x['questionNumber'])
    }
    
    # Save to JSON
    output_path = os.path.join(OUTPUT_DIR, f'{paper_id}.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    # Count questions with ER notes
    er_count = sum(1 for q in questions if q.get('examinerReportNote'))
    
    print(f"    OK Saved: {len(questions)} questions ({er_count} with ER notes)")
    return True

def main():
    """Test with a single Biology paper"""
    print("="*70)
    print("ENHANCED MCQ PARSER WITH EXAMINER REPORT INTEGRATION")
    print("="*70)
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Test with Biology March 2020 Paper 22
    success = process_paper(
        subject_code="0610",
        subject_name="Biology",
        year=2020,
        session="March",
        session_code="m",
        component="2",
        variant="2"
    )
    
    if success:
        print("\n" + "="*70)
        print("SUCCESS: Paper processed with ER notes!")
        print("="*70)
    else:
        print("\n" + "="*70)
        print("FAILED: Could not process paper")
        print("="*70)

if __name__ == "__main__":
    main()

# Made with Bob
