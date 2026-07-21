"""
ICT (0417) Examiner Report Parser
Based on multi-year structure analysis (2015, 2022, 2023)
Handles both simple questions and sub-part nested questions
"""

import pdfplumber
import json
import re
import os
from pathlib import Path

# Configuration
PDFS_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\scripts\pastpapers"
OUTPUT_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\er-cache"

def clean_text(text):
    """Remove headers, footers, page numbers, and Cambridge noise"""
    # Remove common noise patterns
    noise_patterns = [
        r'©\s*\d{4}',  # Copyright symbols
        r'©\s*UCLES\s*\d{4}',
        r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
        r'Cambridge IGCSE',
        r'Cambridge International',
        r'General Certificate of Secondary Education',
        r'Principal Examiner Report',
        r'Information and Communication Technology',
        r'for Teachers',
        r'INFORMATION AND COMMUNICATION TECHNOLOGY',
        r'^\d+\s*$',  # Standalone page numbers
        r'\[Turn over\]',
        r'[A-Z][a-z]+\s+\d{4}',  # Month Year patterns like "June 2015", "November 2017"
    ]
    
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text, flags=re.MULTILINE | re.IGNORECASE)
    
    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()

def extract_component_section(full_text, component):
    """
    Extract text for a specific component (e.g., "11", "12", "21")
    Handles variations: "Paper 0417/11 Written Paper", "Paper 0417/11 Theory", etc.
    """
    # Build flexible pattern to match component headers
    # Matches: "Paper 0417/11", "Paper 0417/11 Theory", "Paper 0417/11 Written Paper", etc.
    pattern = rf'Paper\s+0417/{component}\b[^\n]*'
    
    match = re.search(pattern, full_text, re.IGNORECASE)
    if not match:
        return None
    
    start_pos = match.start()
    
    # Find where this component ends (next component starts)
    # Look for next "Paper 0417/XX" pattern
    next_pattern = r'Paper\s+0417/\d{2}\b'
    next_match = re.search(next_pattern, full_text[start_pos + 100:], re.IGNORECASE)
    
    if next_match:
        end_pos = start_pos + 100 + next_match.start()
    else:
        end_pos = len(full_text)
    
    return full_text[start_pos:end_pos]

def extract_questions_from_section(section_text):
    """
    Extract all questions from a component section
    Returns: dict mapping question numbers to their content
    """
    # Find "Comments on specific questions" boundary
    boundary_match = re.search(r'\nComments on specific questions\s*\n', section_text, re.IGNORECASE)
    if not boundary_match:
        return {}
    
    # Start extraction after this boundary
    questions_text = section_text[boundary_match.end():]
    
    # Use lookahead to split by "Question X" without consuming the marker
    # This catches ALL questions including the last one
    question_chunks = re.split(r'\n(?=Question\s+\d+)', questions_text)
    
    questions = {}
    
    # Process each chunk (each starts with "Question X")
    for chunk in question_chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        
        # Extract question number from start of chunk
        number_match = re.match(r'^Question\s+(\d{1,2})', chunk, re.IGNORECASE)
        if not number_match:
            continue
        
        q_num = number_match.group(1)
        
        # Remove "Question X" header and get the content
        content = re.sub(r'^Question\s+\d{1,2}\s*\n?', '', chunk, flags=re.IGNORECASE).strip()
        
        if not content:
            continue
        
        # Check if this question has sub-parts (a), (b), (c), etc.
        sub_part_pattern = r'\n\(([a-z])\)\s*\n'
        sub_matches = list(re.finditer(sub_part_pattern, content))
        
        if sub_matches:
            # Has sub-parts - extract general comment and sub-parts
            general_comment = content[:sub_matches[0].start()].strip()
            
            # Extract each sub-part
            sub_parts = []
            for idx, match in enumerate(sub_matches):
                letter = match.group(1)
                start = match.end()
                
                # Find where this sub-part ends (next sub-part or end of content)
                if idx + 1 < len(sub_matches):
                    end = sub_matches[idx + 1].start()
                else:
                    end = len(content)
                
                sub_text = content[start:end].strip()
                if sub_text:
                    sub_parts.append({
                        "letter": letter,
                        "note": clean_text(sub_text)
                    })
            
            # Build the question object
            question_obj = {
                "hasSubParts": True,
                "generalComment": clean_text(general_comment) if general_comment else "",
                "subParts": sub_parts
            }
            
            # For display, combine general + first sub-part
            if general_comment and sub_parts:
                display_note = f"{clean_text(general_comment)} {sub_parts[0]['note']}"
            elif sub_parts:
                display_note = sub_parts[0]['note']
            else:
                display_note = clean_text(general_comment)
            
            questions[q_num] = display_note[:500]  # Limit to 500 chars for display
            
        else:
            # Simple question without sub-parts
            note = clean_text(content)
            if len(note) > 500:
                note = note[:497] + "..."
            questions[q_num] = note
    
    return questions

def process_ict_er_file(er_path):
    """Process a single ICT ER PDF file"""
    try:
        filename = os.path.basename(er_path)
        match = re.match(r'0417_([msw]\d{2})_er\.pdf', filename)
        if not match:
            return
        
        session_year = match.group(1)
        print(f"Processing: {filename}")
        
        with pdfplumber.open(er_path) as pdf:
            # Extract all text
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + '\n'
            
            # Try all common components
            components = ['11', '12', '13', '21', '22', '23', '31', '32', '33']
            
            for component in components:
                section_text = extract_component_section(full_text, component)
                
                if section_text:
                    questions = extract_questions_from_section(section_text)
                    
                    if questions:
                        output_filename = f"0417_{session_year}_er_{component}.json"
                        output_path = os.path.join(OUTPUT_DIR, output_filename)
                        
                        with open(output_path, 'w', encoding='utf-8') as f:
                            json.dump(questions, f, indent=2, ensure_ascii=False)
                        
                        print(f"  Component {component}: {len(questions)} questions")
        
        print()
        
    except Exception as e:
        print(f"  Error: {e}\n")

def process_all_ict_files():
    """Process all ICT (0417) ER files"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Find all 0417 ER PDFs
    ict_files = []
    for root, dirs, files in os.walk(PDFS_DIR):
        for file in files:
            if file.startswith('0417_') and file.endswith('_er.pdf'):
                ict_files.append(os.path.join(root, file))
    
    print(f"Found {len(ict_files)} ICT (0417) ER files\n")
    print("="*70)
    
    for er_path in sorted(ict_files):
        process_ict_er_file(er_path)
    
    print("="*70)
    print(f"Complete! Processed {len(ict_files)} files")

if __name__ == "__main__":
    print("="*70)
    print("ICT (0417) EXAMINER REPORT PARSER")
    print("Multi-year structure support (2015-2023)")
    print("="*70)
    print()
    process_all_ict_files()

# Made with Bob
