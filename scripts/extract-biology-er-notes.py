"""
Extract Examiner Report notes for Biology (0610) MCQ papers only
Creates component-specific JSON cache files
"""

import pdfplumber
import json
import re
import os

# Configuration
PDFS_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\pdfs"
OUTPUT_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\er-cache"

def extract_er_notes_by_component(er_path, component):
    """Extract ER notes for a specific component (e.g., "12", "22")"""
    er_notes = {}
    
    try:
        with pdfplumber.open(er_path) as pdf:
            full_text = ""
            
            # Extract all text from all pages
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + '\n'
            
            # Find component section
            # Pattern: "Component 0610/12" or "Paper 1" etc.
            patterns = [
                rf'Component\s+0610/{component}',
                rf'Paper\s+{component[0]}.*?Variant\s+{component[1]}',
            ]
            
            component_section = None
            for pattern in patterns:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    start_pos = match.start()
                    
                    # Find next component marker
                    next_match = re.search(r'Component\s+0610/\d{2}', full_text[start_pos + 50:], re.IGNORECASE)
                    if next_match:
                        end_pos = start_pos + 50 + next_match.start()
                    else:
                        end_pos = len(full_text)
                    
                    component_section = full_text[start_pos:end_pos]
                    break
            
            if not component_section:
                return er_notes
            
            # Split by question numbers
            question_sections = re.split(r'\n(?:Question\s+)?(\d{1,2})\s*\n', component_section)
            
            # Process each question
            for i in range(1, len(question_sections), 2):
                if i + 1 < len(question_sections):
                    q_num = int(question_sections[i])
                    content = question_sections[i + 1].strip()
                    
                    # Only MCQ questions (1-40)
                    if 1 <= q_num <= 40 and len(content) > 50:
                        # Get first meaningful paragraph
                        paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
                        if paragraphs:
                            er_note = paragraphs[0]
                            if len(er_note) > 500:
                                er_note = er_note[:497] + "..."
                            er_notes[str(q_num)] = er_note
            
    except Exception as e:
        print(f"      Error: {e}")
    
    return er_notes

def main():
    print("="*70)
    print("BIOLOGY (0610) EXAMINER REPORT EXTRACTOR")
    print("="*70)
    print()
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Find all Biology ER PDF files
    er_files = [f for f in os.listdir(PDFS_DIR) if f.startswith('0610_') and f.endswith('_er.pdf')]
    
    print(f"Found {len(er_files)} Biology ER files\n")
    
    total_cache_files = 0
    
    for idx, er_file in enumerate(sorted(er_files), 1):
        # Parse filename: 0610_m20_er.pdf
        match = re.match(r'(\d{4})_([msw]\d{2})_er\.pdf', er_file)
        if not match:
            continue
        
        subject_code, session_year = match.groups()
        
        print(f"[{idx}/{len(er_files)}] Processing: {er_file}")
        
        er_path = os.path.join(PDFS_DIR, er_file)
        
        # Extract notes for MCQ components only (Paper 1 and 2, variants 1-3)
        components = ['11', '12', '13', '21', '22', '23']
        
        for component in components:
            er_notes = extract_er_notes_by_component(er_path, component)
            
            if er_notes:
                # Save to JSON cache
                cache_filename = f"{subject_code}_{session_year}_er_{component}.json"
                cache_path = os.path.join(OUTPUT_DIR, cache_filename)
                
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump(er_notes, f, indent=2, ensure_ascii=False)
                
                print(f"    [OK] Component {component}: {len(er_notes)} notes")
                total_cache_files += 1
    
    print()
    print("="*70)
    print(f"COMPLETE: Created {total_cache_files} ER cache files")
    print(f"Location: {OUTPUT_DIR}")
    print("="*70)

if __name__ == "__main__":
    main()

# Made with Bob
