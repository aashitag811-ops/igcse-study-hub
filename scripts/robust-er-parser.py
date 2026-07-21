"""
Robust ER Parser - Handles both MCQ and Theory papers correctly
Based on Cambridge ER structure analysis
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
    """Remove headers, footers, and noise"""
    noise_patterns = [
        r'©\s*UCLES\s*\d{4}',
        r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
        r'Cambridge IGCSE',
        r'Cambridge International',
        r'Principal Examiner Report',
        r'^\d+\s*$',  # Page numbers
    ]
    
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text, flags=re.MULTILINE | re.IGNORECASE)
    
    return text.strip()

def is_mcq_paper(text):
    """Detect if this is an MCQ paper by looking for Key Data Matrix"""
    return bool(re.search(r'"Question Number"\s*,\s*"Key"', text, re.IGNORECASE))

def extract_component_section(full_text, subject_code, component):
    """
    Extract the text section for a specific component
    Returns: (section_text, is_mcq)
    """
    paper_num = component[0]
    variant_num = component[1]
    
    # Try multiple header patterns
    patterns = [
        rf'Paper\s+{subject_code}/{component}\b',  # Paper 0417/11
        rf'Paper\s+{component}\b',  # Paper 11
        rf'Component\s+{subject_code}/{component}',  # Component 0417/11
    ]
    
    start_pos = None
    for pattern in patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            start_pos = match.start()
            break
    
    if start_pos is None:
        return None, False
    
    # Find where this component ends (next component starts)
    next_patterns = [
        r'Paper\s+\d{4}/\d{2}',
        r'Paper\s+\d{1,2}\b',
        r'Component\s+\d{4}/\d{2}',
    ]
    
    end_pos = len(full_text)
    for pattern in next_patterns:
        match = re.search(pattern, full_text[start_pos + 100:], re.IGNORECASE)
        if match:
            end_pos = start_pos + 100 + match.start()
            break
    
    section_text = full_text[start_pos:end_pos]
    is_mcq = is_mcq_paper(section_text)
    
    return section_text, is_mcq

def extract_mcq_notes(section_text):
    """
    Extract notes from MCQ paper
    Handles: Key Data Matrix, missing questions, sparse feedback
    """
    notes = {}
    
    # Find "Comments on specific questions" section
    match = re.search(r'Comments on specific questions', section_text, re.IGNORECASE)
    if not match:
        return notes
    
    # Start after this header
    feedback_text = section_text[match.end():]
    
    # Split by "Question X" markers
    question_pattern = r'\nQuestion\s+(\d{1,2})\b'
    parts = re.split(question_pattern, feedback_text)
    
    # Process question-feedback pairs
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            q_num = parts[i].strip()
            content = parts[i + 1].strip()
            
            if q_num.isdigit() and content:
                # Extract first meaningful paragraph
                lines = [line.strip() for line in content.split('\n') if len(line.strip()) > 20]
                if lines:
                    note = lines[0]
                    if len(note) > 500:
                        note = note[:497] + "..."
                    notes[q_num] = clean_text(note)
    
    return notes

def extract_theory_notes(section_text):
    """
    Extract notes from Theory/Written paper
    Handles: sub-parts (a), (b), (c), complex structure
    """
    notes = {}
    
    # Find "Comments on specific questions" section
    match = re.search(r'Comments on specific questions', section_text, re.IGNORECASE)
    if not match:
        return notes
    
    # Start after this header
    feedback_text = section_text[match.end():]
    
    # Split by "Question X" markers
    question_pattern = r'\nQuestion\s+(\d{1,2})\b'
    parts = re.split(question_pattern, feedback_text)
    
    # Process question-feedback pairs
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            q_num = parts[i].strip()
            content = parts[i + 1].strip()
            
            if q_num.isdigit() and content:
                # Check for sub-parts
                sub_part_pattern = r'\n\(([a-z]+|i+)\)\s*\n'
                if re.search(sub_part_pattern, content):
                    # Has sub-parts - extract general note before first sub-part
                    first_sub = re.search(sub_part_pattern, content)
                    general_note = content[:first_sub.start()].strip()
                    
                    # Get first sub-part note
                    sub_parts = re.split(sub_part_pattern, content)
                    if len(sub_parts) > 2:
                        first_sub_note = sub_parts[2].split('\n')[0].strip()
                        combined = f"{general_note} {first_sub_note}" if general_note else first_sub_note
                    else:
                        combined = general_note
                else:
                    # No sub-parts - take first paragraph
                    lines = [line.strip() for line in content.split('\n') if len(line.strip()) > 20]
                    combined = lines[0] if lines else content
                
                if combined:
                    if len(combined) > 500:
                        combined = combined[:497] + "..."
                    notes[q_num] = clean_text(combined)
    
    return notes

def extract_er_for_component(er_path, subject_code, component):
    """Main extraction function for a single component"""
    try:
        with pdfplumber.open(er_path) as pdf:
            # Extract all text
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + '\n'
            
            # Get component section
            section_text, is_mcq = extract_component_section(full_text, subject_code, component)
            
            if section_text is None:
                return None
            
            # Extract notes based on paper type
            if is_mcq:
                notes = extract_mcq_notes(section_text)
            else:
                notes = extract_theory_notes(section_text)
            
            return notes if notes else None
            
    except Exception as e:
        print(f"      Error: {e}")
        return None

def process_all_er_files():
    """Process all ER PDFs"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Find all ER PDFs
    er_files = []
    for root, dirs, files in os.walk(PDFS_DIR):
        for file in files:
            if file.endswith('_er.pdf'):
                er_files.append(os.path.join(root, file))
    
    print(f"Found {len(er_files)} ER files\n")
    
    total_components = 0
    
    for er_path in sorted(er_files):
        filename = os.path.basename(er_path)
        match = re.match(r'(\d{4})_([msw]\d{2})_er\.pdf', filename)
        if not match:
            continue
        
        subject_code, session_year = match.groups()
        print(f"Processing: {filename}")
        
        # Try all common components
        components = ['11', '12', '13', '21', '22', '23', '31', '32', '33', 
                     '41', '42', '43', '51', '52', '53', '61', '62', '63']
        
        for component in components:
            notes = extract_er_for_component(er_path, subject_code, component)
            
            if notes:
                output_filename = f"{subject_code}_{session_year}_er_{component}.json"
                output_path = os.path.join(OUTPUT_DIR, output_filename)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(notes, f, indent=2, ensure_ascii=False)
                
                print(f"  Component {component}: {len(notes)} questions")
                total_components += 1
        
        print()
    
    print(f"\nComplete! Created {total_components} component files")

if __name__ == "__main__":
    print("="*70)
    print("ROBUST ER PARSER - MCQ & Theory Support")
    print("="*70)
    print()
    process_all_er_files()

# Made with Bob
