"""
HIERARCHY-FOCUSED ICT PARSER V2
Based on user feedback - clean, strict, state machine approach
"""

import fitz  # PyMuPDF
import re
import json
import sys
from pathlib import Path

# Junk patterns to filter out
JUNK_PATTERNS = [
    r'www\.dynamicpapers\.com',
    r'©\s*UCLES\s*\d{4}',
    r'^\s*\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}\s*$',
    r'^\s*\[Turn over\s*$',
    r'^\s*BLANK PAGE\s*$',
    r'^\s*\*+\s*\d+\s*\*+\s*$',  # Barcode patterns
    r'^\d+\s+hours?$',  # "2 hours" on cover page
    r'^Paper\s+\d+',  # "Paper 1 Theory"
    r'^INFORMATION AND COMMUNICATION TECHNOLOGY$',
    r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+',  # Junk codes like "06_0417_12_2020_1.15"
]

def is_junk(text):
    """Check if text is junk (watermarks, page numbers, etc.)"""
    text = text.strip()
    
    # Don't filter out single digits (could be question numbers)
    if re.match(r'^\d{1,2}$', text):
        return False
    
    if len(text) < 3:
        return True
    
    for pattern in JUNK_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def clean_lines(lines):
    """Clean extracted lines - remove dots, junk, empty lines"""
    cleaned = []
    for line in lines:
        line = line.strip()

        # Remove empty lines
        if not line:
            continue

        # Remove junk patterns
        if is_junk(line):
            continue

        # Remove dot answer lines
        if re.match(r'^\.*$', line):
            continue

        # Remove lines with mostly dots (>60% dots)
        if len(re.findall(r'\.', line)) > len(line) * 0.6:
            continue

        # Remove pure numbers (table junk like 03, 082, 123)
        if re.match(r'^\d{2,}$', line):
            continue

        cleaned.append(line)
    return cleaned

def is_main_question(line):
    """
    STRICT: Main questions are:
    - '1 ' (digit + space + text)
    - '1' alone on a line (will be followed by text on next line)
    BUT NOT dates like "26 March 2020"
    """
    # Check if it's a date (number followed by month name)
    if re.match(r'^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)', line, re.IGNORECASE):
        return False
    
    # Single digit or double digit, optionally followed by space
    return re.match(r'^\d{1,2}(\s|$)', line) is not None

def is_subpart(line):
    """Subparts: (a), (b), (c), etc."""
    return re.match(r'^\([a-z]\)', line) is not None

def is_nested_subpart(line):
    """Nested: (i), (ii), (iii), etc."""
    return re.match(r'^\([ivx]+\)', line) is not None

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF line by line"""
    doc = fitz.open(pdf_path)
    lines = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        
        for line in text.split('\n'):
            lines.append(line.strip())
    
    doc.close()
    return lines

def parse_questions_state_machine(lines):
    """
    Parse using STATE MACHINE approach
    Track: current question, current subpart, prevent duplicates
    """
    questions = []
    current_q = None
    current_sub = None
    last_q_num = 0
    
    for line in lines:
        if is_main_question(line):
            # Extract question number
            q_num = int(line.split()[0])
            
            # PREVENT DUPLICATES: Skip if number <= last number
            if q_num <= last_q_num:
                continue
            
            last_q_num = q_num
            
            # Remove question number from text (e.g., "5 Part of..." -> "Part of...")
            text_without_number = re.sub(r'^\d{1,2}\s*', '', line).strip()
            
            # Start new main question
            current_q = {
                'number': str(q_num),
                'text': text_without_number,
                'marks': None,
                'subparts': []
            }
            questions.append(current_q)
            current_sub = None
        
        elif is_subpart(line) and current_q:
            # Extract subpart letter
            label = line[1]  # (a) -> a
            
            # Remove subpart label from text (e.g., "(a) Describe..." -> "Describe...")
            text_without_label = re.sub(r'^\([a-z]\)\s*', '', line).strip()
            
            # Start new subpart
            current_sub = {
                'number': label,
                'text': text_without_label,
                'marks': None,
                'type': 'text'
            }
            current_q['subparts'].append(current_sub)
        
        elif is_nested_subpart(line) and current_sub:
            # Remove nested label from text (e.g., "(i) The teacher..." -> "The teacher...")
            text_without_label = re.sub(r'^\([ivx]+\)\s*', '', line).strip()
            # Append to current subpart text
            current_sub['text'] += ' ' + text_without_label
        
        else:
            # Regular text - append to most recent thing
            if current_sub:
                current_sub['text'] += ' ' + line
            elif current_q:
                current_q['text'] += ' ' + line
    
    return questions

def extract_marks(text):
    """Extract marks from text like [4 marks] or [4]"""
    match = re.search(r'\[(\d+)\s*(?:marks?)?\]', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None

def clean_and_enhance_questions(questions):
    """Clean text, extract marks, and remove junk codes"""
    for q in questions:
        # Extract marks from main question text
        if q['text']:
            marks = extract_marks(q['text'])
            if marks:
                q['marks'] = marks
                # Remove marks notation from text
                q['text'] = re.sub(r'\[\d+\s*(?:marks?)?\]', '', q['text'], flags=re.IGNORECASE).strip()
            
            # Remove junk codes (e.g., "06_0417_12_2020_1.15")
            q['text'] = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', q['text']).strip()
        
        # Process subparts
        for sub in q['subparts']:
            if sub['text']:
                marks = extract_marks(sub['text'])
                if marks:
                    sub['marks'] = marks
                    sub['text'] = re.sub(r'\[\d+\s*(?:marks?)?\]', '', sub['text'], flags=re.IGNORECASE).strip()
                
                # Remove junk codes from subparts too
                sub['text'] = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', sub['text']).strip()
    
    return questions

def parse_pdf(pdf_path, output_path=None):
    """Main parsing function"""
    print(f"Parsing: {pdf_path}")
    
    # Extract filename info
    filename = Path(pdf_path).stem
    match = re.match(r'(\d{4})_([smw])(\d{2})_qp_(\d+)', filename)
    
    if match:
        subject_code = match.group(1)
        season_code = match.group(2)
        year = 2000 + int(match.group(3))
        variant = int(match.group(4))
        
        season_map = {'s': 'May/June', 'm': 'Feb/March', 'w': 'Oct/Nov'}
        season = season_map.get(season_code, 'Unknown')
    else:
        subject_code = '0417'
        year = 2020
        season = 'Unknown'
        variant = 1
    
    # Extract and clean
    raw_lines = extract_text_from_pdf(pdf_path)
    print(f"Extracted {len(raw_lines)} raw lines")
    
    cleaned_lines = clean_lines(raw_lines)
    print(f"Cleaned to {len(cleaned_lines)} lines")
    
    # Parse with state machine
    questions = parse_questions_state_machine(cleaned_lines)
    print(f"Found {len(questions)} main questions")
    
    # Enhance
    questions = clean_and_enhance_questions(questions)
    
    # Build output structure
    paper_data = {
        'id': filename,
        'subject': f'ICT {subject_code}',
        'year': year,
        'season': season,
        'variant': variant,
        'totalMarks': 80,
        'duration': 120,
        'questions': questions
    }
    
    # Save to file
    if output_path is None:
        output_path = f'public/papers/{filename}.json'
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper_data, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {output_path}")
    
    # Print summary
    for q in questions:
        subpart_count = len(q['subparts'])
        print(f"  Q{q['number']}: {subpart_count} subparts")
    
    return paper_data

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python hierarchy-parser.py <pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    parse_pdf(pdf_path)

# Made with Bob
