#!/usr/bin/env python3
"""
PRODUCTION PARSER - IMPROVED VERSION
Fixes table extraction, text spacing, and table-to-question matching

Key Improvements:
1. Tables extracted to separate 'tables' object with page numbers
2. Better text extraction with spacing fixes
3. Improved table-to-question matching using proximity
4. Proper tick table vs data table classification
5. Prevents table duplication across questions
"""

import pdfplumber
import re
import json
import sys
from pathlib import Path
from collections import defaultdict

class ImprovedParser:
    def __init__(self):
        # Regex patterns for hierarchy detection
        self.patterns = {
            'q_num': re.compile(r'^(\d+)$'),
            'q_with_text': re.compile(r'^(\d+)\s+(.+)'),
            'part': re.compile(r'^\(([a-z])\)$'),
            'part_with_text': re.compile(r'^\(([a-z])\)\s+(.+)'),
            'sub_part': re.compile(r'^\(([ivx]+)\)$'),
            'sub_part_with_text': re.compile(r'^\(([ivx]+)\)\s+(.+)'),
        }
        
        # State tracking
        self.questions = []
        self.current_q = None
        self.current_part = None
        self.seen_q_ids = set()
        self.highest_q_num = 0
        
        # Table tracking
        self.all_tables = defaultdict(list)  # page_num -> [tables]
        self.table_assignments = {}  # table_id -> question_number
        
    def fix_text_spacing(self, text):
        """Fix common PDF extraction spacing errors"""
        if not text:
            return ""
        
        # Fix character-level spacing (e.g., "M a s on" -> "Mason")
        # Run multiple times to catch nested patterns
        for _ in range(5):
            text = re.sub(r'\b([a-z])\s+([a-z])\b', r'\1\2', text, flags=re.IGNORECASE)
        
        # Fix common broken words
        broken_words = [
            (r'd\s*a\s*t\s*a\s*b\s*a\s*s\s*e', 'database'),
            (r's\s*o\s*f\s*t\s*w\s*a\s*r\s*e', 'software'),
            (r'p\s*r\s*o\s*c\s*e\s*s\s*s\s*i\s*n\s*g', 'processing'),
            (r'i\s*n\s*f\s*o\s*r\s*m\s*a\s*t\s*i\s*o\s*n', 'information'),
        ]
        
        for pattern, replacement in broken_words:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text
        
    def clean_text(self, text):
        """Aggressive text cleaning"""
        if not text:
            return ""
        
        # Fix spacing first
        text = self.fix_text_spacing(text)
        
        # Remove answer dots
        text = re.sub(r'\.{3,}', '', text)
        
        # Remove marks notation
        text = re.sub(r'\[\d+\s*(?:marks?)?\]', '', text, flags=re.IGNORECASE)
        
        # Remove paper codes
        text = re.sub(r'\d{4}/\d{2}/\w/\w/\d{2}', '', text)
        text = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', text)
        
        # Remove checkmarks (keep in table detection, remove from text)
        text = text.replace('✓', '').replace('✔', '')
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def is_junk_line(self, line):
        """Detect and filter junk lines"""
        if not line or len(line) < 2:
            return True
        
        # Metadata patterns
        junk_patterns = [
            r'^www\.dynamicpapers',
            r'^©\s*UCLES',
            r'^Cambridge',
            r'^Permission to reproduce',
            r'^\[Turn over',
            r'^BLANK PAGE',
            r'^University of Cambridge',
            r'ermissiontoreproduceitemswherethird',
            r'fforthasbeenmadebythepublisher',
            r'epleasedtomakeamendsattheearliestpossibleopportunity',
            r'oavoidtheissueofdisclosureofanswer',
            r'nternational Education Copyright',
            r'ambridgeAssessmentInternationalEducation',
            r'ambridgeLocalExaminationsSyndicate',
            r'ww\.cambridgeinternational\.org',
        ]
        
        for pattern in junk_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                return True
        
        # Short lines with many numbers = metadata
        words = line.split()
        if len(words) < 3:
            num_count = sum(1 for c in line if c.isdigit())
            if num_count > 5:
                return True
        
        return False
    
    def extract_tables_with_metadata(self, page, page_num):
        """Extract tables with position metadata for matching"""
        tables = page.extract_tables()
        table_objects = page.find_tables()
        classified_tables = []
        
        for idx, (table, table_obj) in enumerate(zip(tables, table_objects)):
            if not table or len(table) == 0:
                continue
            
            # Clean table cells
            cleaned = []
            for row in table:
                cleaned_row = [self.clean_text(cell) if cell else "" for cell in row]
                if any(cleaned_row):  # Skip empty rows
                    cleaned.append(cleaned_row)
            
            if not cleaned or len(cleaned) < 2:
                continue
            
            # Classify table type
            table_type = self.classify_table(cleaned)
            
            # Get table position
            bbox = table_obj.bbox if table_obj else None
            
            table_data = {
                "page": page_num,
                "table_id": idx,
                "type": table_type,
                "bbox": list(bbox) if bbox else None,
                "rows": len(cleaned),
                "cols": len(cleaned[0]) if cleaned else 0,
                "headers": cleaned[0] if cleaned else [],
                "data": cleaned[1:] if len(cleaned) > 1 else [],
                "raw": cleaned
            }
            
            classified_tables.append(table_data)
            self.all_tables[page_num].append(table_data)
        
        return classified_tables
    
    def classify_table(self, table_data):
        """Classify table as tick_table or data_table"""
        # Check first 2 rows for tick indicators
        header_text = " ".join([str(cell) for row in table_data[:2] for cell in row]).lower()
        
        tick_indicators = ["tick", "✓", "✔", "()", "( )"]
        for indicator in tick_indicators:
            if indicator in header_text:
                return "tick_table"
        
        return "data_table"
    
    def get_table_bboxes(self, page):
        """Get bounding boxes of tables to mask text extraction"""
        tables = page.find_tables()
        return [table.bbox for table in tables if table.bbox]
    
    def match_tables_to_questions(self):
        """Match tables to questions based on proximity and context"""
        # For each table, find the closest question
        for page_num, tables in self.all_tables.items():
            for table in tables:
                table_id = f"{page_num}_{table['table_id']}"
                
                # Find questions on same page or adjacent pages
                candidate_questions = []
                for q in self.questions:
                    q_page = q.get('page', 0)
                    if abs(q_page - page_num) <= 1:  # Same or adjacent page
                        candidate_questions.append(q)
                
                if not candidate_questions:
                    continue
                
                # Match based on context (tick/table keywords in question text)
                best_match = None
                for q in candidate_questions:
                    q_text = (q.get('text', '') + ' ' + 
                             ' '.join([p.get('text', '') for p in q.get('subparts', [])])).lower()
                    
                    if table['type'] == 'tick_table':
                        if 'tick' in q_text or 'select' in q_text or 'choose' in q_text:
                            best_match = q
                            break
                    else:
                        if 'table' in q_text or 'data' in q_text:
                            best_match = q
                            break
                
                # If no context match, use closest question on same page
                if not best_match and candidate_questions:
                    same_page_qs = [q for q in candidate_questions if q.get('page') == page_num]
                    if same_page_qs:
                        best_match = same_page_qs[0]
                
                if best_match:
                    self.table_assignments[table_id] = best_match['number']
    
    def process_pdf(self, pdf_path):
        """Main parsing logic"""
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                # Skip cover page
                if page_num == 1:
                    continue
                
                # Extract tables first
                tables = self.extract_tables_with_metadata(page, page_num)
                table_bboxes = self.get_table_bboxes(page)
                
                # Crop to content area (remove headers/footers)
                content = page.within_bbox((20, 70, 545, 790))
                if not content:
                    continue
                
                # Extract text
                text = content.extract_text()
                if not text:
                    continue
                
                lines = text.split('\n')
                
                # Process each line
                for line in lines:
                    # Skip junk
                    if self.is_junk_line(line):
                        continue
                    
                    # Clean text
                    line = self.clean_text(line)
                    if not line:
                        continue
                    
                    # Try to match hierarchy patterns
                    self.process_line(line, page_num)
        
        # Match tables to questions after all parsing
        self.match_tables_to_questions()
        
        return self.questions
    
    def process_line(self, line, page_num):
        """Process a single line and update hierarchy"""
        
        # 1. Check for Question Number
        q_match = self.patterns['q_num'].match(line)
        q_text_match = self.patterns['q_with_text'].match(line)
        
        if q_match or q_text_match:
            q_id = q_match.group(1) if q_match else q_text_match.group(1)
            q_num = int(q_id)
            
            # Skip duplicates (page headers only)
            if q_id in self.seen_q_ids:
                return
            
            # Create new question
            initial_text = "" if q_match else q_text_match.group(2)
            
            self.current_q = {
                "number": q_id,
                "text": initial_text,
                "marks": None,
                "page": page_num,
                "subparts": []
            }
            
            self.questions.append(self.current_q)
            self.current_part = None
            self.seen_q_ids.add(q_id)
            self.highest_q_num = q_num
            return
        
        # 2. Check for Part
        p_match = self.patterns['part'].match(line)
        p_text_match = self.patterns['part_with_text'].match(line)
        
        if (p_match or p_text_match) and self.current_q:
            p_id = p_match.group(1) if p_match else p_text_match.group(1)
            initial_text = "" if p_match else p_text_match.group(2)
            
            self.current_part = {
                "number": p_id,
                "text": initial_text,
                "marks": None,
                "subparts": []
            }
            
            self.current_q['subparts'].append(self.current_part)
            return
        
        # 3. Check for Sub-part
        s_match = self.patterns['sub_part'].match(line)
        s_text_match = self.patterns['sub_part_with_text'].match(line)
        
        if (s_match or s_text_match) and self.current_part:
            # Add sub-part marker to current part
            s_id = s_match.group(1) if s_match else s_text_match.group(1)
            s_text = "" if s_match else s_text_match.group(2)
            self.current_part['text'] += f" ({s_id}) {s_text}"
            return
        
        # 4. Regular text - accumulate to deepest level
        if self.current_part:
            self.current_part['text'] += " " + line
        elif self.current_q:
            self.current_q['text'] += " " + line
    
    def get_json_output(self, pdf_path):
        """Generate final JSON output with separate tables object"""
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
        
        # Build tables object organized by page
        tables_by_page = {}
        for page_num, tables in self.all_tables.items():
            tables_by_page[str(page_num)] = tables
        
        return {
            'id': filename,
            'subject': f'ICT {subject_code}',
            'year': year,
            'season': season,
            'variant': variant,
            'totalMarks': 80,
            'duration': 120,
            'questions': self.questions,
            'tables': tables_by_page  # NEW: Separate tables object
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python production-parser-improved.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    print(f"\n{'='*60}")
    print(f"PRODUCTION PARSER - IMPROVED VERSION")
    print(f"{'='*60}\n")
    
    # Parse
    parser = ImprovedParser()
    questions = parser.process_pdf(pdf_path)
    
    print(f"[OK] Parsed {len(questions)} questions")
    print(f"[OK] Extracted {sum(len(tables) for tables in parser.all_tables.values())} tables\n")
    
    # Show summary
    print("Questions Found:")
    print("-" * 60)
    for q in questions:
        parts = [p['number'] for p in q['subparts']]
        print(f"\nQ{q['number']} (Page {q.get('page', '?')}): {len(q['subparts'])} parts {parts}")
        print(f"  Text: {q['text'][:100]}...")
        
        for p in q['subparts'][:2]:
            print(f"    ({p['number']}): {p['text'][:80]}...")
    
    print("\n" + "-" * 60)
    print("\nTables Found:")
    print("-" * 60)
    for page_num, tables in parser.all_tables.items():
        for table in tables:
            assigned_q = parser.table_assignments.get(f"{page_num}_{table['table_id']}", "Unassigned")
            print(f"Page {page_num}, Table {table['table_id']}: {table['type']} ({table['rows']}x{table['cols']}) -> Q{assigned_q}")
    
    print("-" * 60)
    
    # Save
    output = parser.get_json_output(pdf_path)
    output_path = Path('public/papers') / f"{output['id']}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"[SUCCESS] Saved to: {output_path}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()

# Made with Bob