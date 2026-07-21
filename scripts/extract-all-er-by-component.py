"""
Extract ER notes for ALL paper components from ALL ER PDFs
Creates component-specific JSON files (e.g., 0417_s11_er_11.json, 0417_s11_er_12.json)
"""

import pdfplumber
import json
import re
import os
from pathlib import Path

# Configuration
PDFS_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\scripts\pastpapers"
OUTPUT_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\er-cache"

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
    r'^\d+\s*�\s*\d{4}',
    r'^Principal Examiner Report',
]

def is_noise(text):
    """Check if text is footer/header noise"""
    if not text or len(text.strip()) < 2:
        return True
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_component_notes(er_path, subject_code, component):
    """
    Extract ER notes for a specific component from ER PDF
    component format: "11", "12", "13", "21", "22", "23", etc.
    Returns dict: {question_number: examiner_note}
    """
    er_notes = {}
    
    if not os.path.exists(er_path):
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
            
            # Find the section for this specific component
            # Try multiple patterns to find component section
            paper_num = component[0]  # First digit (1, 2, 3, etc.)
            variant_num = component[1]  # Second digit (1, 2, 3, etc.)
            
            patterns = [
                rf'Paper\s+{subject_code}/{component}\s*\n',  # Paper 0417/11
                rf'Paper\s+{component}\s*\n',  # Paper 11
                rf'Component\s+{subject_code}/{component}',  # Component 0417/11
                rf'Paper\s+{paper_num}\s*.*?Variant\s+{variant_num}',  # Paper 1 Variant 1
            ]
            
            component_section = None
            start_pos = 0
            
            for pattern in patterns:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    start_pos = match.start()
                    
                    # Find next component marker (where this component ends)
                    # Look for next Paper X or Component markers
                    next_patterns = [
                        r'Paper\s+\d{4}/\d{2}',
                        r'Paper\s+\d{1,2}\s*\n',
                        r'Component\s+\d{4}/\d{2}',
                    ]
                    
                    end_pos = len(full_text)
                    for next_pattern in next_patterns:
                        next_match = re.search(next_pattern, full_text[start_pos + 100:], re.IGNORECASE)
                        if next_match:
                            end_pos = start_pos + 100 + next_match.start()
                            break
                    
                    component_section = full_text[start_pos:end_pos]
                    break
            
            if not component_section:
                return er_notes
            
            # Split by question markers within this component section
            question_pattern = r'\n(?:Question\s+)?(\d{1,2})\s*\n'
            question_sections = re.split(question_pattern, component_section)
            
            # Process sections
            for i in range(1, len(question_sections), 2):
                if i + 1 < len(question_sections):
                    q_num = question_sections[i].strip()
                    content = question_sections[i + 1].strip()
                    
                    # Only process valid question numbers
                    if q_num.isdigit():
                        q_num_int = int(q_num)
                        if 1 <= q_num_int <= 50 and content:
                            # Extract first meaningful paragraph
                            lines = content.split('\n')
                            meaningful_lines = []
                            
                            for line in lines:
                                line = line.strip()
                                # Skip short lines and noise
                                if line and len(line) > 20 and not is_noise(line):
                                    meaningful_lines.append(line)
                            
                            if meaningful_lines:
                                # Take first paragraph
                                er_note = meaningful_lines[0]
                                
                                # If first line is short, add more lines
                                if len(er_note) < 100 and len(meaningful_lines) > 1:
                                    er_note = ' '.join(meaningful_lines[:3])
                                
                                # Limit length
                                if len(er_note) > 500:
                                    er_note = er_note[:497] + "..."
                                
                                er_notes[str(q_num_int)] = er_note
            
    except Exception as e:
        print(f"      Error reading ER for component {component}: {e}")
    
    return er_notes

def process_all_er_files():
    """Process all ER PDF files and extract notes by component"""
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Find all ER PDF files recursively
    er_files = []
    for root, dirs, files in os.walk(PDFS_DIR):
        for file in files:
            if file.endswith('_er.pdf'):
                er_files.append(os.path.join(root, file))
    
    print(f"Found {len(er_files)} ER files to process\n")
    
    processed = 0
    total_components = 0
    
    for er_path in sorted(er_files):
        # Parse filename: 0610_m20_er.pdf
        filename = os.path.basename(er_path)
        match = re.match(r'(\d{4})_([msw]\d{2})_er\.pdf', filename)
        if not match:
            continue
        
        subject_code, session_year = match.groups()
        
        print(f"Processing: {filename}")
        
        # Extract notes for common components
        # Paper 1: variants 1, 2, 3
        # Paper 2: variants 1, 2, 3
        # Paper 3: variants 1, 2, 3
        # etc.
        components = ['11', '12', '13', '21', '22', '23', '31', '32', '33', 
                     '41', '42', '43', '51', '52', '53', '61', '62', '63']
        
        for component in components:
            notes = extract_component_notes(er_path, subject_code, component)
            
            if notes:
                # Save component-specific file
                output_filename = f"{subject_code}_{session_year}_er_{component}.json"
                output_path = os.path.join(OUTPUT_DIR, output_filename)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(notes, f, indent=2, ensure_ascii=False)
                
                print(f"  Component {component}: {len(notes)} questions -> {output_filename}")
                total_components += 1
        
        processed += 1
        print()
    
    print(f"\nProcessing complete!")
    print(f"Processed {processed} ER files")
    print(f"Created {total_components} component-specific JSON files")

if __name__ == "__main__":
    print("=" * 70)
    print("ER EXTRACTION - ALL COMPONENTS")
    print("=" * 70)
    print()
    
    process_all_er_files()

# Made with Bob
