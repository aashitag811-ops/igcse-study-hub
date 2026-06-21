#!/usr/bin/env python3
"""
FINAL WORKING PARSER - Based on coordinate extraction with state machine
Uses pdfplumber for clean extraction and proper hierarchy
"""

import pdfplumber
import re
import json
import sys
from pathlib import Path

class IGCSEParser:
    def __init__(self):
        # Regex Patterns for hierarchy detection
        self.patterns = {
            'q_num': re.compile(r'^(\d+)(?:\s+|$)'),  # Number + space OR end of line
            'part': re.compile(r'^\(([a-z])\)(?:\s+|$)'),
            'sub_part': re.compile(r'^\(([ivx]+)\)(?:\s+|$)')
        }
        self.tree = []
        self.current_q = None
        self.current_part = None
        self.seen_q_nums = set()  # Track duplicates (page headers)

    def clean_text(self, text):
        """Aggressive cleaning - remove ALL junk"""
        if not text:
            return ""
        
        # Remove answer dots (3+ consecutive)
        text = re.sub(r'\.{3,}', '', text)
        
        # Remove marks notation [2], [4 marks]
        text = re.sub(r'\[\d+\s*(?:marks?)?\]', '', text, flags=re.IGNORECASE)
        
        # Remove paper codes (0417/12/M/J/23 or 06_0417_12_2020_1.15)
        text = re.sub(r'\d{4}/\d{2}/\w/\w/\d{2}', '', text)
        text = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', text)
        
        # Remove checkmarks
        text = text.replace('✓', '').replace('✔', '')
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()

    def is_metadata_line(self, line):
        """Filter lines that are just metadata (paper codes, page numbers)"""
        # Less than 3 words but more than 5 numbers = metadata
        words = line.split()
        if len(words) < 3:
            num_count = sum(1 for c in line if c.isdigit())
            if num_count > 5:
                return True
        
        # Common junk patterns
        junk_patterns = [
            r'^www\.dynamicpapers',
            r'^©\s*UCLES',
            r'^Cambridge',
            r'^Permission to reproduce',
            r'^\[Turn over',
            r'^BLANK PAGE',
        ]
        
        for pattern in junk_patterns:
            if re.match(pattern, line, re.IGNORECASE):
                return True
        
        return False

    def parse_pdf(self, path):
        """Main parsing function"""
        with pdfplumber.open(path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                # Skip page 1 (cover)
                if page_num == 1:
                    continue
                
                # Crop to content area (removes headers/footers)
                # bbox = (x0, top, x1, bottom) for A4 (595x842 points)
                content_area = (50, 80, 545, 780)
                cropped = page.within_bbox(content_area)
                
                if not cropped:
                    continue
                
                # Use extract_words for better spacing
                words = cropped.extract_words()
                if not words:
                    continue
                
                # Group words by Y-coordinate (same line)
                from collections import defaultdict
                lines_dict = defaultdict(list)
                for word in words:
                    y = round(word['top'])
                    lines_dict[y].append(word)
                
                # Reconstruct lines with proper spacing
                for y in sorted(lines_dict.keys()):
                    line_words = sorted(lines_dict[y], key=lambda w: w['x0'])
                    line = ' '.join(w['text'] for w in line_words)
                    self.process_line(line)

        return self.tree

    def process_line(self, line):
        """Process each line with state machine"""
        # Skip empty or metadata
        if not line or self.is_metadata_line(line):
            return
        
        clean_line = self.clean_text(line)
        if not clean_line:
            return

        # Check for Question (Level 1)
        q_match = self.patterns['q_num'].match(clean_line)
        if q_match:
            q_num = int(q_match.group(1))
            
            # Skip if duplicate (page header)
            if q_num in self.seen_q_nums:
                return
            
            self.current_q = {
                "number": q_match.group(1),
                "text": clean_line[len(q_match.group(0)):].strip(),  # Remove marker
                "marks": None,
                "subparts": []
            }
            self.tree.append(self.current_q)
            self.current_part = None
            self.seen_q_nums.add(q_num)
            return

        # Check for Part (Level 2)
        p_match = self.patterns['part'].match(clean_line)
        if p_match and self.current_q:
            self.current_part = {
                "number": p_match.group(1),
                "text": clean_line[len(p_match.group(0)):].strip(),  # Remove marker
                "marks": None,
                "type": "text"
            }
            self.current_q['subparts'].append(self.current_part)
            return

        # Check for Sub-part (Level 3)
        s_match = self.patterns['sub_part'].match(clean_line)
        if s_match and self.current_part:
            # Append to current part with marker
            sub_text = clean_line[len(s_match.group(0)):].strip()
            self.current_part['text'] += f" ({s_match.group(1)}) {sub_text}"
            return

        # Append text to current active level (multiline questions)
        if self.current_part:
            self.current_part['text'] += " " + clean_line
        elif self.current_q:
            self.current_q['text'] += " " + clean_line

    def get_json_output(self, pdf_path):
        """Convert tree to final JSON format"""
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
        
        return {
            'id': filename,
            'subject': f'ICT {subject_code}',
            'year': year,
            'season': season,
            'variant': variant,
            'totalMarks': 80,
            'duration': 120,
            'questions': self.tree
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python final-working-parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    print(f"\n{'='*60}")
    print(f"FINAL WORKING PARSER: {pdf_path}")
    print(f"{'='*60}\n")
    
    # Parse
    parser = IGCSEParser()
    questions = parser.parse_pdf(pdf_path)
    
    print(f"Parsed {len(questions)} questions\n")
    
    # Show summary
    print("Questions Found:")
    print("-" * 60)
    for q in questions:
        parts = [p['number'] for p in q['subparts']]
        print(f"Q{q['number']}: {len(q['subparts'])} parts {parts}")
        print(f"  Text: {q['text'][:100]}...")
        if q['subparts']:
            for p in q['subparts'][:2]:
                print(f"    ({p['number']}): {p['text'][:80]}...")
    print("-" * 60)
    
    # Save
    output = parser.get_json_output(pdf_path)
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
