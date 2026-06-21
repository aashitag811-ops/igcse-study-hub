"""
SMART BLOCK-BASED PARSER
Uses PDF blocks and positioning to understand structure
"""
import fitz  # PyMuPDF
import re
import json
import sys
from pathlib import Path
from collections import defaultdict

def extract_blocks_from_pdf(pdf_path):
    """Extract text blocks with position info"""
    doc = fitz.open(pdf_path)
    all_blocks = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if block["type"] == 0:  # Text block
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if text:
                            all_blocks.append({
                                'page': page_num + 1,
                                'text': text,
                                'x': span["bbox"][0],
                                'y': span["bbox"][1],
                                'font_size': span["size"],
                                'font': span["font"]
                            })
    
    doc.close()
    return all_blocks

def is_junk(text):
    """Check if text is junk"""
    junk_patterns = [
        r'www\.dynamicpapers\.com',
        r'©\s*UCLES\s*\d{4}',
        r'^\s*\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}\s*$',
        r'^\s*\[Turn over\s*$',
        r'^\s*BLANK PAGE\s*$',
        r'^\s*\*+\s*\d+\s*\*+\s*$',
        r'^\d+\s+hours?$',
        r'^Paper\s+\d+',
        r'^INFORMATION AND COMMUNICATION TECHNOLOGY$',
        r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+',
    ]
    
    for pattern in junk_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def is_main_question(text):
    """Check if text starts a main question"""
    # Must start with digit(s) followed by space or end
    # NOT dates
    if re.match(r'^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)', text, re.IGNORECASE):
        return False
    
    match = re.match(r'^(\d{1,2})(\s|$)', text)
    return match is not None

def is_subpart(text):
    """Check if text starts a subpart"""
    return re.match(r'^\([a-z]\)', text) is not None

def is_nested_subpart(text):
    """Check if text starts a nested subpart"""
    return re.match(r'^\([ivx]+\)', text) is not None

def extract_question_number(text):
    """Extract question number from text"""
    match = re.match(r'^(\d{1,2})', text)
    return int(match.group(1)) if match else None

def extract_subpart_letter(text):
    """Extract subpart letter from text"""
    match = re.match(r'^\(([a-z])\)', text)
    return match.group(1) if match else None

def extract_nested_label(text):
    """Extract nested label from text"""
    match = re.match(r'^\(([ivx]+)\)', text)
    return match.group(1) if match else None

def remove_label_from_text(text):
    """Remove question number/letter from start of text"""
    # Remove main question number
    text = re.sub(r'^\d{1,2}\s*', '', text)
    # Remove subpart letter
    text = re.sub(r'^\([a-z]\)\s*', '', text)
    # Remove nested label
    text = re.sub(r'^\([ivx]+\)\s*', '', text)
    # Remove junk codes
    text = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', text)
    return text.strip()

def extract_marks(text):
    """Extract marks from text like [4] or [4 marks]"""
    match = re.search(r'\[(\d+)\s*(?:marks?)?\]', text, re.IGNORECASE)
    return int(match.group(1)) if match else None

def group_blocks_by_page(blocks):
    """Group blocks by page and sort by position"""
    pages = defaultdict(list)
    for block in blocks:
        if not is_junk(block['text']):
            pages[block['page']].append(block)
    
    # Sort each page by Y position (top to bottom)
    for page in pages:
        pages[page].sort(key=lambda b: (b['y'], b['x']))
    
    return pages

def parse_questions_smart(blocks):
    """Parse questions using block positioning"""
    pages = group_blocks_by_page(blocks)
    questions = []
    current_q = None
    current_sub = None
    last_q_num = 0
    
    # Process all pages in order
    for page_num in sorted(pages.keys()):
        page_blocks = pages[page_num]
        
        for block in page_blocks:
            text = block['text']
            
            # Check for main question
            if is_main_question(text):
                q_num = extract_question_number(text)
                
                # Skip duplicates
                if q_num and q_num <= last_q_num:
                    continue
                
                if q_num:
                    last_q_num = q_num
                    clean_text = remove_label_from_text(text)
                    
                    current_q = {
                        'number': str(q_num),
                        'text': clean_text,
                        'marks': extract_marks(text),
                        'subparts': []
                    }
                    questions.append(current_q)
                    current_sub = None
            
            # Check for subpart
            elif is_subpart(text) and current_q:
                letter = extract_subpart_letter(text)
                if letter:
                    clean_text = remove_label_from_text(text)
                    
                    current_sub = {
                        'number': letter,
                        'text': clean_text,
                        'marks': extract_marks(text),
                        'type': 'text'
                    }
                    current_q['subparts'].append(current_sub)
            
            # Check for nested subpart
            elif is_nested_subpart(text) and current_sub:
                clean_text = remove_label_from_text(text)
                # Append to current subpart
                if current_sub['text']:
                    current_sub['text'] += ' ' + clean_text
                else:
                    current_sub['text'] = clean_text
            
            # Regular text - append to most recent
            else:
                if current_sub:
                    if current_sub['text']:
                        current_sub['text'] += ' ' + text
                    else:
                        current_sub['text'] = text
                elif current_q:
                    if current_q['text']:
                        current_q['text'] += ' ' + text
                    else:
                        current_q['text'] = text
    
    return questions

def clean_questions(questions):
    """Final cleanup of questions"""
    for q in questions:
        # Clean main question text
        if q['text']:
            q['text'] = re.sub(r'\s+', ' ', q['text']).strip()
            q['text'] = re.sub(r'\[\d+\s*(?:marks?)?\]', '', q['text'], flags=re.IGNORECASE).strip()
        
        # Clean subparts
        for sub in q['subparts']:
            if sub['text']:
                sub['text'] = re.sub(r'\s+', ' ', sub['text']).strip()
                sub['text'] = re.sub(r'\[\d+\s*(?:marks?)?\]', '', sub['text'], flags=re.IGNORECASE).strip()
    
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
    
    # Extract blocks
    blocks = extract_blocks_from_pdf(pdf_path)
    print(f"Extracted {len(blocks)} text blocks")
    
    # Parse questions
    questions = parse_questions_smart(blocks)
    print(f"Found {len(questions)} main questions")
    
    # Clean up
    questions = clean_questions(questions)
    
    # Build output
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
    
    # Save
    if output_path is None:
        output_path = f'public/papers/{filename}.json'
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper_data, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {output_path}")
    
    # Print summary
    for q in questions:
        subpart_letters = [s['number'] for s in q.get('subparts', [])]
        print(f"Q{q['number']}: {len(q.get('subparts', []))} subparts {subpart_letters}")
    
    return paper_data

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python smart-block-parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    parse_pdf(pdf_path)

# Made with Bob
