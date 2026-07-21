"""
Fix 0417 Summer 2011 ER extraction - properly separate Paper 11 from Paper 12
"""

import pdfplumber
import json
import re
import os

# Configuration
ER_PDF = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\scripts\pastpapers\0417-Information and Communication Technology\2011\Summer\0417_s11_er.pdf"
OUTPUT_FILE = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\er-cache\0417_s11_er_11.json"

def extract_paper_11_notes():
    """Extract ER notes specifically for Paper 11"""
    er_notes = {}
    
    try:
        with pdfplumber.open(ER_PDF) as pdf:
            full_text = ""
            
            # Extract all text
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + '\n'
            
            # Find Paper 11 section
            # Look for "Paper 0417/11" header
            paper_11_match = re.search(r'Paper\s+0417/11\s*\n\s*Written Paper', full_text, re.IGNORECASE)
            
            if not paper_11_match:
                print("Could not find Paper 11 section")
                return er_notes
            
            start_pos = paper_11_match.start()
            
            # Find where Paper 11 ends (next paper starts or end of document)
            # Look for "Paper 0417/12" or similar
            next_paper_match = re.search(r'Paper\s+0417/1[2-3]', full_text[start_pos + 100:], re.IGNORECASE)
            
            if next_paper_match:
                end_pos = start_pos + 100 + next_paper_match.start()
            else:
                end_pos = len(full_text)
            
            paper_11_text = full_text[start_pos:end_pos]
            
            print(f"Paper 11 section: {len(paper_11_text)} characters")
            print(f"First 500 chars:\n{paper_11_text[:500]}\n")
            
            # Split by "Question X" markers
            question_pattern = r'\n(?:Question\s+)?(\d{1,2})\s*\n'
            question_sections = re.split(question_pattern, paper_11_text)
            
            # Process sections
            for i in range(1, len(question_sections), 2):
                if i + 1 < len(question_sections):
                    q_num = question_sections[i].strip()
                    content = question_sections[i + 1].strip()
                    
                    # Only process valid question numbers
                    if q_num.isdigit():
                        q_num_int = int(q_num)
                        if 1 <= q_num_int <= 40 and content:
                            # Extract first meaningful paragraph
                            lines = content.split('\n')
                            meaningful_lines = []
                            
                            for line in lines:
                                line = line.strip()
                                # Skip headers, footers, page numbers
                                if line and len(line) > 20:
                                    if not re.match(r'^\d+\s*�\s*\d{4}', line):  # Skip copyright
                                        if not re.match(r'^Cambridge International', line):
                                            if not re.match(r'^0417 Information', line):
                                                if not re.match(r'^Principal Examiner', line):
                                                    meaningful_lines.append(line)
                            
                            if meaningful_lines:
                                # Take first paragraph (up to first blank line or 500 chars)
                                er_note = meaningful_lines[0]
                                
                                # If first line is short, add more lines
                                if len(er_note) < 100 and len(meaningful_lines) > 1:
                                    er_note = ' '.join(meaningful_lines[:3])
                                
                                # Limit length
                                if len(er_note) > 500:
                                    er_note = er_note[:497] + "..."
                                
                                er_notes[str(q_num_int)] = er_note
                                print(f"Q{q_num_int}: {er_note[:80]}...")
            
            print(f"\nExtracted {len(er_notes)} ER notes for Paper 11")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    return er_notes

if __name__ == "__main__":
    print("Extracting ER notes for 0417 Summer 2011 Paper 11...\n")
    
    notes = extract_paper_11_notes()
    
    if notes:
        # Save to file
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(notes, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ Saved to: {OUTPUT_FILE}")
        print(f"✓ Total questions: {len(notes)}")
    else:
        print("\n✗ No notes extracted")

# Made with Bob
