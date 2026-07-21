import pdfplumber
import re
import json
import sys
from pathlib import Path

def normalize_text(text):
    """Fix common PDF extraction errors"""
    if not text:
        return text
    
    # Remove copyright text
    copyright_start = text.find('Permission to reproduce items')
    if copyright_start != -1:
        text = text[:copyright_start]
    
    # Fix common spacing issues with 'ing' words
    fixes = [
        (r'process\s*in\s*g', 'processing'),
        (r'us\s*in\s*g', 'using'),
        (r'stor\s*in\s*g', 'storing'),
        (r'enter\s*in\s*g', 'entering'),
        (r'format\s*t\s*in\s*g', 'formatting'),
        (r'monitor\s*in\s*g', 'monitoring'),
        (r'track\s*in\s*g', 'tracking'),
        (r'd\s*at\s*a', 'data'),
        (r'in\s*form\s*at\s*i\s*on', 'information'),
        (r'c\s*on\s*ta\s*in', 'contain'),
        (r'de\s*vice', 'device'),
        (r'ne\s*two\s*rk', 'network'),
        (r's\s*of\s*tw\s*are', 'software'),
        (r'hardw\s*are', 'hardware'),
    ]
    
    for pattern, replacement in fixes:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Clean up multiple spaces
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def detect_question_type(text, next_lines):
    """Detect question type based on content"""
    text_lower = text.lower()
    
    # Check for selection/tick tables
    if any(keyword in text_lower for keyword in ['tick', '✓', 'circle', 'select']):
        # Look ahead for table structure
        combined = ' '.join(next_lines[:5])
        if 'true' in combined.lower() and 'false' in combined.lower():
            return 'selection_table'
        if any(word in combined.lower() for word in ['yes', 'no', 'correct', 'incorrect']):
            return 'selection_table'
    
    # Check for word bank
    if 'from the list' in text_lower or 'word bank' in text_lower:
        return 'word_bank'
    
    # Check for MCQ
    if any(keyword in text_lower for keyword in ['which of the following', 'select', 'choose']):
        return 'mcq'
    
    # Check for paired list (method + description)
    if 'describe' in text_lower and 'method' in text_lower:
        return 'paired_list'
    
    # Check for numbered list
    if any(keyword in text_lower for keyword in ['state two', 'give two', 'identify two', 'state three']):
        return 'numbered_list'
    
    # Default to text
    return 'text'

def extract_marks(text):
    """Extract marks from [X] pattern"""
    match = re.search(r'\[(\d+)\]', text)
    if match:
        return int(match.group(1))
    return None

def parse_ict_paper(pdf_path):
    """Parse ICT Paper 1 PDF into JSON format"""
    
    paper_info = {
        "id": Path(pdf_path).stem,
        "subject": "ICT 0417",
        "year": 2024,
        "season": "Sample",
        "variant": 1,
        "totalMarks": 0,
        "duration": 75,
        "questions": []
    }
    
    all_text = []
    
    # Extract all text from PDF
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                all_text.append(text)
    
    full_text = '\n'.join(all_text)
    lines = full_text.split('\n')
    
    current_question = None
    current_part = None
    current_subpart = None
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        if not line:
            i += 1
            continue
        
        # Skip copyright text
        if 'Permission to reproduce' in line or 'UCLES' in line:
            break
        
        # Main question (e.g., "1  Some text" or "1 Some text")
        main_q_match = re.match(r'^(\d+)\s{2,}(.+)', line)
        if main_q_match:
            # Save previous question
            if current_question:
                paper_info["questions"].append(current_question)
            
            q_num = main_q_match.group(1)
            q_text = normalize_text(main_q_match.group(2))
            
            # Get next few lines for context
            next_lines = [lines[j] for j in range(i+1, min(i+6, len(lines)))]
            
            current_question = {
                "number": q_num,
                "text": q_text,
                "marks": None,
                "subparts": []
            }
            current_part = None
            current_subpart = None
            i += 1
            continue
        
        # Part (e.g., "(a)" or " (a) ")
        part_match = re.match(r'^\s*\(([a-z])\)\s*(.+)', line)
        if part_match and current_question:
            part_letter = part_match.group(1)
            part_text = normalize_text(part_match.group(2))
            
            # Extract marks
            marks = extract_marks(part_text)
            if marks:
                part_text = re.sub(r'\s*\[\d+\]\s*', '', part_text)
                paper_info["totalMarks"] += marks
            
            # Get next few lines for type detection
            next_lines = [lines[j] for j in range(i+1, min(i+6, len(lines)))]
            q_type = detect_question_type(part_text, next_lines)
            
            current_part = {
                "number": part_letter,
                "text": part_text,
                "marks": marks,
                "type": q_type,
                "subparts": []
            }
            current_question["subparts"].append(current_part)
            current_subpart = None
            i += 1
            continue
        
        # Sub-part (e.g., "(i)" or " (i) ")
        subpart_match = re.match(r'^\s*\(([ivx]+)\)\s*(.+)', line)
        if subpart_match and current_part:
            subpart_num = subpart_match.group(1)
            subpart_text = normalize_text(subpart_match.group(2))
            
            # Extract marks
            marks = extract_marks(subpart_text)
            if marks:
                subpart_text = re.sub(r'\s*\[\d+\]\s*', '', subpart_text)
                paper_info["totalMarks"] += marks
            
            # Get next few lines for type detection
            next_lines = [lines[j] for j in range(i+1, min(i+6, len(lines)))]
            q_type = detect_question_type(subpart_text, next_lines)
            
            current_subpart = {
                "number": subpart_num,
                "text": subpart_text,
                "marks": marks,
                "type": q_type
            }
            current_part["subparts"].append(current_subpart)
            i += 1
            continue
        
        # Continue previous question/part text
        if current_subpart:
            current_subpart["text"] += " " + normalize_text(line)
        elif current_part:
            current_part["text"] += " " + normalize_text(line)
        elif current_question:
            current_question["text"] += " " + normalize_text(line)
        
        i += 1
    
    # Add last question
    if current_question:
        paper_info["questions"].append(current_question)
    
    return paper_info

def main():
    if len(sys.argv) < 2:
        print("Usage: python ict-pdf-parser.py <pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"Error: File not found: {pdf_path}")
        sys.exit(1)
    
    print(f"Parsing {pdf_path}...")
    
    try:
        paper_data = parse_ict_paper(pdf_path)
        
        # Save to JSON
        output_path = Path(pdf_path).stem + '.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(paper_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Successfully parsed!")
        print(f"📄 Output: {output_path}")
        print(f"📊 Total marks: {paper_data['totalMarks']}")
        print(f"❓ Questions: {len(paper_data['questions'])}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

# Made with Bob
