"""
Extract Examiner Report notes and create JSON cache files
Creates one JSON file per session containing all ER notes for that session
"""

import pdfplumber
import json
import re
import os
from pathlib import Path

# Configuration
PDFS_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\pdfs"
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
]

def is_noise(text):
    """Check if text is footer/header noise"""
    if not text or len(text.strip()) < 2:
        return True
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_er_notes_by_component(er_path, component):
    """
    Extract examiner report notes for a specific component/paper
    component format: "12", "22", "31", etc.
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
            # Pattern: "Component 0417/12" or "Paper 1" or similar
            subject_code = os.path.basename(er_path)[:4]
            
            # Try multiple patterns to find component section
            patterns = [
                rf'Component\s+{subject_code}/{component}',
                rf'Paper\s+{component[0]}.*?Variant\s+{component[1]}',
                rf'{component[0]}/{component[1]}',
            ]
            
            component_section = None
            for pattern in patterns:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    # Extract text from this component until next component or end
                    start_pos = match.start()
                    
                    # Find next component marker
                    next_component = re.search(r'Component\s+\d{4}/\d{2}', full_text[start_pos + 50:], re.IGNORECASE)
                    if next_component:
                        end_pos = start_pos + 50 + next_component.start()
                    else:
                        end_pos = len(full_text)
                    
                    component_section = full_text[start_pos:end_pos]
                    break
            
            if not component_section:
                print(f"      Could not find component {component} section in ER")
                return er_notes
            
            # Split by question markers within this component section
            question_sections = re.split(r'\n(?:Question\s+)?(\d{1,2})\s*\n', component_section)
            
            # Process sections
            for i in range(1, len(question_sections), 2):
                if i + 1 < len(question_sections):
                    q_num = int(question_sections[i])
                    content = question_sections[i + 1].strip()
                    
                    # Only process valid question numbers (1-40 for MCQ, 1-10 for others)
                    if 1 <= q_num <= 40 and content:
                        # Clean up the content
                        paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
                        if paragraphs:
                            er_note = paragraphs[0]
                            if len(er_note) > 500:
                                er_note = er_note[:497] + "..."
                            er_notes[str(q_num)] = er_note
            
            print(f"      Component {component}: Extracted {len(er_notes)} ER notes")
            
    except Exception as e:
        print(f"      Error reading ER for component {component}: {e}")
    
    return er_notes

def process_all_er_files():
    """Process all ER PDF files and extract notes by component"""
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Find all ER PDF files
    er_files = [f for f in os.listdir(PDFS_DIR) if f.endswith('_er.pdf')]
    
    print(f"Found {len(er_files)} ER files to process\n")
    
    processed = 0
    
    for er_file in sorted(er_files):
        # Parse filename: 0610_m20_er.pdf
        match = re.match(r'(\d{4})_([msw]\d{2})_er\.pdf', er_file)
        if not match:
            continue
        
        subject_code, session_year = match.groups()
        
        print(f"Processing: {er_file}")
        
        er_path = os.path.join(PDFS_DIR, er_file)
        
        # Extract notes for each component (Paper 1-6, variants 1-3)
        # Common components: 11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43, 51, 52, 53, 61, 62, 63
        components = []
        for paper in ['1', '2', '3', '4', '5', '6']:
            for variant in ['1', '2', '3']:
                components.append(f"{paper}{variant}")
        
        total_extracted = 0
        
        for component in components:
            er_notes = extract_er_notes_by_component(er_path, component)
            
            if er_notes:
                # Save to JSON cache with component-specific filename
                cache_filename = f"{subject_code}_{session_year}_er_{component}.json"
                cache_path = os.path.join(OUTPUT_DIR, cache_filename)
                
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump(er_notes, f, indent=2, ensure_ascii=False)
                
                total_extracted += len(er_notes)
        
        if total_extracted > 0:
            print(f"    Total: {total_extracted} notes across all components\n")
            processed += 1
        else:
            print(f"    No notes extracted\n")
    
    return processed

def main():
    print("="*70)
    print("EXAMINER REPORT NOTES EXTRACTOR")
    print("="*70)
    print()
    
    total = process_all_er_files()
    
    print("="*70)
    print(f"COMPLETE: Processed {total} ER files")
    print(f"Cache files saved to: {OUTPUT_DIR}")
    print("="*70)

if __name__ == "__main__":
    main()

# Made with Bob
