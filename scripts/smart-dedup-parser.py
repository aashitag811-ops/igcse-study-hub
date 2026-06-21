#!/usr/bin/env python3
"""
Smart Parser with Duplicate Detection
Handles page headers by tracking question sequence
"""

import sys
import re
import json
from pathlib import Path
import PyPDF2

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF with page tracking"""
    with open(pdf_path, 'rb') as file:
        pdf = PyPDF2.PdfReader(file)
        pages_text = []
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            pages_text.append((page_num, text))
    return pages_text

def is_junk(text):
    """Check if line is junk"""
    # Don't filter single digits (could be question numbers 1-9)
    if re.match(r'^\d$', text):
        return False
    
    if len(text) < 2:
        return True
    
    junk_patterns = [
        r'^\d{2}_\d{4}_\d{2}_\d{4}',  # Codes like 06_0417_12_2020
        r'^©\s*UCLES',
        r'^Cambridge',
        r'^\[Turn over\]?$',
        r'^\d+$',  # Pure numbers (but not single digits)
        r'^Page \d+',
    ]
    
    for pattern in junk_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return True
    
    return False

def clean_text(text):
    """Clean extracted text"""
    # Remove junk codes
    text = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', text)
    # Replace checkmarks
    text = text.replace('✓', '[OK]').replace('✔', '[OK]')
    return text.strip()

def detect_marker(line):
    """
    Detect question markers and return (type, number, is_at_line_start)
    type: 'main', 'subpart', 'nested'
    is_at_line_start: True if marker is at the very start of the line
    """
    line_stripped = line.strip()
    
    # Main question: "1 " or "1\t" at start
    match = re.match(r'^(\d+)\s+', line_stripped)
    if match:
        return ('main', int(match.group(1)), True)
    
    # Subpart: "(a) " at start
    match = re.match(r'^\(([a-z])\)\s+', line_stripped)
    if match:
        return ('subpart', match.group(1), True)
    
    # Nested: "(i) " at start
    match = re.match(r'^\(([ivx]+)\)\s+', line_stripped)
    if match:
        return ('nested', match.group(1), True)
    
    # Check if line is ONLY a number (page header)
    if re.match(r'^\d+$', line_stripped):
        return ('main', int(line_stripped), True)
    
    return (None, None, False)

def parse_pdf(pdf_path):
    """Parse PDF into structured questions"""
    print(f"\n{'='*60}")
    print(f"SMART DEDUP PARSER: {pdf_path}")
    print(f"{'='*60}\n")
    
    # Extract text
    print("Step 1: Extracting text from PDF...")
    pages_text = extract_text_from_pdf(pdf_path)
    print(f"  [OK] Extracted {len(pages_text)} pages\n")
    
    # Process line by line with page tracking
    print("Step 2: Processing lines with duplicate detection...")
    
    questions = []
    current_question = None
    current_subpart = None
    last_main_num = 0
    
    for page_num, page_text in pages_text:
        lines = page_text.split('\n')
        
        for line_idx, line in enumerate(lines):
            if is_junk(line):
                continue
            
            line = clean_text(line)
            if not line:
                continue
            
            marker_type, marker_num, at_start = detect_marker(line)
            
            if marker_type == 'main':
                # Check if this is a duplicate (page header)
                if marker_num == last_main_num:
                    # This is a page header - skip it
                    print(f"  [SKIP] Q{marker_num} duplicate on page {page_num} (page header)")
                    continue
                
                # Check if this is sequential
                if marker_num == last_main_num + 1:
                    # New question!
                    text = line[len(str(marker_num)):].strip()
                    current_question = {
                        'number': str(marker_num),
                        'text': text,
                        'marks': None,
                        'subparts': []
                    }
                    questions.append(current_question)
                    current_subpart = None
                    last_main_num = marker_num
                    print(f"  [NEW] Q{marker_num} on page {page_num}")
                else:
                    # Non-sequential - might be page header or error
                    print(f"  [WARN] Q{marker_num} non-sequential (last was Q{last_main_num}) on page {page_num}")
                    continue
            
            elif marker_type == 'subpart':
                if current_question:
                    text = line[len(f"({marker_num})"):].strip()
                    current_subpart = {
                        'number': marker_num,
                        'text': text,
                        'marks': None,
                        'type': 'text'
                    }
                    current_question['subparts'].append(current_subpart)
                    print(f"  [SUB] Q{current_question['number']}({marker_num}) on page {page_num}")
            
            elif marker_type == 'nested':
                if current_subpart:
                    # Add to subpart text
                    text = line[len(f"({marker_num})"):].strip()
                    current_subpart['text'] += f" ({marker_num}) {text}"
                    print(f"  [NEST] Q{current_question['number']}({current_subpart['number']})({marker_num}) on page {page_num}")
            
            else:
                # Regular text - append to current context
                if current_subpart:
                    current_subpart['text'] += ' ' + line
                elif current_question:
                    current_question['text'] += ' ' + line
    
    print(f"\n  [OK] Built {len(questions)} questions\n")
    
    # Print summary
    print("Question Summary:")
    for q in questions:
        subpart_count = len(q['subparts'])
        subpart_letters = [s['number'] for s in q['subparts']]
        print(f"  Q{q['number']}: {subpart_count} subparts {subpart_letters}")
    
    return questions

def create_json_output(questions, pdf_path):
    """Create JSON output"""
    # Extract paper info from filename
    filename = Path(pdf_path).stem
    match = re.match(r'(\d{4})_([smw])(\d{2})_qp_(\d{2})', filename)
    
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
        season = 'May/June'
        variant = 12
    
    return {
        'id': filename,
        'subject': f'ICT {subject_code}',
        'year': year,
        'season': season,
        'variant': variant,
        'totalMarks': 80,
        'duration': 120,
        'questions': questions
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python smart-dedup-parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    # Parse
    questions = parse_pdf(pdf_path)
    
    # Create JSON
    output = create_json_output(questions, pdf_path)
    
    # Save
    output_path = Path('public/papers') / f"{output['id']}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"SUCCESS! Saved to: {output_path}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()

# Made with Bob
