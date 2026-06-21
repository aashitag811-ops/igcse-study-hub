#!/usr/bin/env python3
"""
IMPROVED PARSER - Fixes spacing, duplicates, and handles images
Based on parser-almost-there-backup.py with enhancements:
- Better spacing fixes
- Duplicate question prevention
- Image region detection (removes text from image areas)
- Better text cleaning
"""

import pdfplumber
import fitz  # PyMuPDF for image detection
import re
import json
import sys
from pathlib import Path

class ImprovedParser:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.questions = []
        self.current_question = None
        self.current_part = None
        self.current_subpart = None
        self.stop_parsing = False
        self.blank_buffer = []
        
        # Track seen question numbers to prevent duplicates
        self.seen_question_numbers = set()
        
        # Store image regions to exclude from text extraction
        self.image_regions = {}  # page_num -> list of (y0, y1) tuples
        
        # Store detected tables
        self.tables = {}  # page_num -> list of table dicts
        self.table_detection_log = []
        
    def detect_tables_on_page(self, fitz_page, page_num):
        """Detect tables using PyMuPDF's find_tables with multiple strategies"""
        detected_tables = []
        
        # Try multiple strategies for Cambridge papers
        strategies = ["lines", "text"]  # lines for bordered, text for borderless
        
        for strategy in strategies:
            try:
                tabs = fitz_page.find_tables(strategy=strategy)
                
                if tabs.tables:
                    for i, tab in enumerate(tabs.tables):
                        # Extract table data
                        table_data = tab.extract()
                        
                        # Skip empty tables
                        if not table_data or len(table_data) == 0:
                            continue
                        
                        # Clean the table data
                        cleaned_rows = []
                        for row in table_data:
                            cleaned_row = [cell.strip() if cell else "" for cell in row]
                            # Skip completely empty rows
                            if any(cleaned_row):
                                cleaned_rows.append(cleaned_row)
                        
                        if not cleaned_rows:
                            continue
                        
                        # VALIDATION: Check if this is a real table
                        if not self._is_valid_table(cleaned_rows, tab.col_count):
                            print(f"    [Skipped] Not a valid table (likely answer lines or image text)")
                            continue
                        
                        # Detect if this is a tick table
                        is_tick_table = self._is_tick_table(cleaned_rows, tab.col_count)
                        
                        # Create table metadata
                        table_info = {
                            'page': page_num,
                            'table_id': len(detected_tables),
                            'strategy': strategy,
                            'bbox': [round(coord, 2) for coord in tab.bbox],
                            'rows': len(cleaned_rows),
                            'cols': tab.col_count,
                            'headers': cleaned_rows[0] if len(cleaned_rows) > 0 else [],
                            'data': cleaned_rows[1:] if len(cleaned_rows) > 1 else [],
                            'raw': cleaned_rows,
                            'type': 'tick_table' if is_tick_table else 'data_table'
                        }
                        
                        # Check if this table overlaps with already detected ones
                        is_duplicate = False
                        for existing in detected_tables:
                            # Simple overlap check using bbox
                            if self._tables_overlap(table_info['bbox'], existing['bbox']):
                                is_duplicate = True
                                break
                        
                        if not is_duplicate:
                            detected_tables.append(table_info)
                            self.table_detection_log.append({
                                'page': page_num,
                                'table_id': table_info['table_id'],
                                'strategy': strategy,
                                'bbox': table_info['bbox'],
                                'rows': table_info['rows'],
                                'cols': table_info['cols']
                            })
                            print(f"    [Table {table_info['table_id']}] {table_info['cols']} cols x {table_info['rows']} rows (strategy: {strategy})")
                
            except Exception as e:
                print(f"    Warning: Table detection with strategy '{strategy}' failed: {e}")
                continue
        
        if detected_tables:
            self.tables[page_num] = detected_tables
            return detected_tables
        return None
    
    def _tables_overlap(self, bbox1, bbox2, threshold=0.5):
        """Check if two bounding boxes overlap significantly"""
        x0_1, y0_1, x1_1, y1_1 = bbox1
        x0_2, y0_2, x1_2, y1_2 = bbox2
        
        # Calculate intersection
        x_overlap = max(0, min(x1_1, x1_2) - max(x0_1, x0_2))
        y_overlap = max(0, min(y1_1, y1_2) - max(y0_1, y0_2))
        intersection = x_overlap * y_overlap
        
        # Calculate areas
        area1 = (x1_1 - x0_1) * (y1_1 - y0_1)
        area2 = (x1_2 - x0_2) * (y1_2 - y0_2)
        
        # Check if overlap is significant
        if area1 > 0 and area2 > 0:
            overlap_ratio = intersection / min(area1, area2)
            return overlap_ratio > threshold
        return False
    def _is_valid_table(self, rows, col_count):
        """
        Validate if detected structure is a real table vs answer lines/images
        
        Real tables have:
        - Multiple columns (at least 2)
        - Varied content (not just dots/lines)
        - Reasonable cell content
        """
        # Must have at least 2 columns
        if col_count < 2:
            return False
        
        # Must have at least 2 rows (header + data)
        if len(rows) < 2:
            return False
        
        # Check if it's mostly answer lines (dots)
        total_cells = 0
        dot_cells = 0
        empty_cells = 0
        
        for row in rows:
            for cell in row:
                total_cells += 1
                if not cell or cell.strip() == '':
                    empty_cells += 1
                elif cell.count('.') > len(cell) * 0.7:  # More than 70% dots
                    dot_cells += 1
        
        # Reject if more than 50% are dots (answer lines)
        if total_cells > 0 and dot_cells / total_cells > 0.5:
            return False
        
        # Reject if more than 70% empty (likely image text fragments)
        if total_cells > 0 and empty_cells / total_cells > 0.7:
            return False
        
        # Check for menu/UI text patterns (Files, Edit, View, etc.)
        ui_keywords = ['files', 'edit', 'view', 'insert', 'format', 'tools', 'help', 'reply', 'forward']
        ui_matches = 0
        for row in rows[:2]:  # Check first 2 rows
            row_text = ' '.join(row).lower()
            for keyword in ui_keywords:
                if keyword in row_text:
                    ui_matches += 1
        
        # Reject if looks like UI/menu text
        if ui_matches >= 3:
            return False
        
        # Check if first row looks like a header (has meaningful text)
        if rows:
            first_row = rows[0]
            non_empty = [cell for cell in first_row if cell and cell.strip()]
            if len(non_empty) < col_count * 0.5:  # Less than 50% filled
                return False
        
        return True
    
    def _is_tick_table(self, rows, col_count):
        """
        Detect if a table is a tick table (checkbox selection table)
        
        Tick tables have:
        - First column with row labels (text descriptions)
        - Header row with category names
        - Mostly empty cells (for ticking)
        - High percentage of empty cells (>60%)
        - At least 3 columns (label + 2+ options)
        """
        # Must have at least 3 columns (label + options)
        if col_count < 3:
            return False
        
        # Must have at least 3 rows (header + 2+ data rows)
        if len(rows) < 3:
            return False
        
        # Count empty cells (excluding first column which has labels)
        total_data_cells = 0
        empty_data_cells = 0
        
        for row_idx, row in enumerate(rows):
            if row_idx == 0:  # Skip header row
                continue
            
            for col_idx, cell in enumerate(row):
                if col_idx == 0:  # Skip first column (labels)
                    continue
                
                total_data_cells += 1
                if not cell or cell.strip() == '' or cell.strip() in ['✓', '✗', '☐', '☑', '×']:
                    empty_data_cells += 1
        
        # Tick tables should have >60% empty cells (for student to fill)
        if total_data_cells > 0:
            empty_ratio = empty_data_cells / total_data_cells
            if empty_ratio < 0.6:
                return False
        
        # Check if first column has meaningful labels (not empty)
        first_col_filled = 0
        for row_idx, row in enumerate(rows):
            if row_idx == 0:  # Skip header
                continue
            if row and row[0] and len(row[0].strip()) > 2:
                first_col_filled += 1
        
        # At least 70% of first column should have labels
        data_rows = len(rows) - 1
        if data_rows > 0 and first_col_filled / data_rows < 0.7:
            return False
        
        # Check if header row has meaningful text
        if rows and rows[0]:
            header_filled = sum(1 for cell in rows[0][1:] if cell and len(cell.strip()) > 2)
            if header_filled < (col_count - 1) * 0.5:  # At least 50% of headers filled
                return False
        
        return True
    
    
    def detect_image_regions_and_tables(self):
        """Detect regions where images are located and extract tables"""
        print("Detecting image regions and tables...")
        doc = fitz.open(self.pdf_path)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            regions = []
            
            # Get standard images
            image_list = page.get_images()
            for img in image_list:
                try:
                    xref = img[0]
                    img_rects = page.get_image_rects(xref)
                    for rect in img_rects:
                        regions.append((rect.y0, rect.y1))
                except:
                    pass
            
            # Get drawings (vector graphics)
            drawings = page.get_drawings()
            for drawing in drawings:
                rect = drawing["rect"]
                # Only consider significant drawings (likely images/diagrams)
                if rect.width > 50 and rect.height > 50:
                    regions.append((rect.y0, rect.y1))
            
            if regions:
                self.image_regions[page_num + 1] = regions
                print(f"  Page {page_num + 1}: {len(regions)} image regions detected")
            
            # Detect tables on this page (skip first and last pages - cover/copyright)
            # Skip page 1 (cover page with candidate details)
            # Skip last page (usually copyright/blank)
            if page_num > 0 and page_num < len(doc) - 1:
                tables = self.detect_tables_on_page(page, page_num + 1)
                if tables:
                    print(f"  Page {page_num + 1}: {len(tables)} table(s) detected")
            else:
                print(f"  Page {page_num + 1}: Skipped (cover/copyright page)")
        
        doc.close()
    
    def is_in_image_region(self, page_num, y_position):
        """Check if a Y-position falls within an image region"""
        if page_num not in self.image_regions:
            return False
        
        for y0, y1 in self.image_regions[page_num]:
            if y0 <= y_position <= y1:
                return True
        return False
    
    def is_junk(self, text):
        """Check if line is junk (watermark, answer lines, etc.)"""
        text = text.strip()
        
        if not text:
            return True
            
        junk_patterns = [
            r'^www\.dynamicpapers\.com$',
            r'^©\s*UCLES',
            r'Permission to reproduce',
            r'^0417/\d+',
            r'^\[Turn over',
            r'^BLANK PAGE$',
            r'^\d+$',  # Just page number
        ]
        
        for pattern in junk_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                return True
        
        # Check for numbered answer lines like "1........"
        if re.match(r'^\d+\.{5,}', text):
            return True
            
        # Check for labeled answer lines like "Method........"
        if re.match(r'^(Method|Improvement|Suggestion|Mistake).*\.{5,}', text, re.IGNORECASE):
            return True
        
        return False
    
    def is_fill_in_blank_line(self, text):
        """Check if line is a fill-in-the-blank (ends with dots for answer)"""
        text = text.strip()
        if len(text) > 10 and text.count('.') > len(text) * 0.6:
            return False  # This is an answer line, not a question
        
        return bool(re.search(r'\.{3,}\.?\s*$', text))
    
    def clean_blank_line(self, text):
        """Remove trailing dots from fill-in-blank line"""
        return re.sub(r'\s*\.{3,}\.?\s*$', '', text).strip()
    
    def remove_answer_dots(self, text):
        """Remove all answer line dots from text (.......)"""
        if not text:
            return text
        text = re.sub(r'\.{3,}', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def fix_spacing(self, text):
        """ENHANCED: Fix spacing issues in extracted text"""
        if not text:
            return text
        
        # Fix common spacing issues - EXTREMELY comprehensive list
        # Using \s+ to match one or more spaces (flexible matching)
        spacing_fixes = {
            # Common split words - alphabetical order
            r'a\s+dvantages': 'advantages',
            r'a\s+lphanumeric': 'alphanumeric',
            r'a\s+nd\b': 'and',
            r'a\s+ppropriate': 'appropriate',
            r'a\s+pplications': 'applications',
            r'a\s+re\b': 'are',
            r'a\s+t\b': 'at',
            r'a\s+ttendance': 'attendance',
            r'a\s+ttending': 'attending',
            r'A\s+ctions': 'Actions',
            r'A\s+dam': 'Adam',
            r'A\s+ge\b': 'Age',
            r'A\s+hmed': 'Ahmed',
            r'A\s+ll\b': 'All',
            r'A\s+rtwork': 'Artwork',
            r'A\s+thlete': 'Athlete',
            r'be\s+en\b': 'been',
            r'be\s+fore': 'before',
            r'be\s+ing': 'being',
            r'Be\s+fore': 'Before',
            r'd\s+at\s+a': 'data',
            r'd\s+ata': 'data',
            r'Descri\s+be': 'Describe',
            r'descri\s+be': 'describe',
            r'do\s+es\b': 'does',
            r'do\s+wn': 'down',
            r'Expla\s+in': 'Explain',
            r'expla\s+in': 'explain',
            r'for\s+m\b': 'form',
            r'for\s+mat\b': 'format',
            r'for\s+matting': 'formatting',
            r'for\s+mul\s+a': 'formula',
            r'for\s+mula': 'formula',
            r'for\s+ward': 'forward',
            r'h\s+as\b': 'has',
            r'h\s+ave': 'have',
            r'in\s+clude': 'include',
            r'in\s+sert': 'insert',
            r'in\s+stead': 'instead',
            r'in\s+terface': 'interface',
            r'in\s+troduce': 'introduce',
            r'M\s+as\s+on': 'Mason',
            r'need\s+s': 'needs',
            r'On\s+e\b': 'One',
            r'presentati\s+on': 'presentation',
            r'Pho\s+to': 'Photo',
            r'recogniti\s+on': 'recognition',
            r'Ret\s+in\s+a': 'Retina',
            r's\s+can': 'scan',
            r'softw\s+are': 'software',
            r'th\s+at\b': 'that',
            r'th\s+is\b': 'this',
            r'Th\s+is': 'This',
            r'the\s+ir': 'their',
            r'the\s+n\b': 'then',
            r'the\s+re': 'there',
            r'The\s+re': 'There',
            r'The\s+y': 'They',
            r'to\s+ols': 'tools',
            r'to\s+p\b': 'top',
            r'to\s+uch': 'touch',
            r'To\s+tal': 'Total',
            r'tra\s+in': 'train',
            r'validati\s+on': 'validation',
            r'wh\s+at': 'what',
            r'Wh\s+at': 'What',
            r'wh\s+ere': 'where',
            r'wh\s+ich': 'which',
            r'wh\s+o\b': 'who',
        }
        
        # Apply all spacing fixes
        for pattern, replacement in spacing_fixes.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # Fix single letter splits (most aggressive fix)
        # "Expla in" -> "Explain", "wh at" -> "what", "be en" -> "been"
        # Match: letter + space + 1-2 letters + space/end
        # This catches patterns like "a in", "a nd", "a t", etc.
        text = re.sub(r'([a-z])\s+([a-z]{1,2})\s+([a-z]{2,})', r'\1\2 \3', text, flags=re.IGNORECASE)
        text = re.sub(r'([a-z]{2,})\s+([a-z]{1,2})\b', r'\1\2', text, flags=re.IGNORECASE)
        
        # Fix merged words - more aggressive
        # "Masonistheheadofayeargroupataschool" -> "Mason is the head of a year group at a school"
        # This is tricky - we'll use a dictionary of common words
        common_words = [
            'the', 'is', 'of', 'a', 'to', 'in', 'for', 'and', 'that', 'this', 'with', 
            'from', 'be', 'can', 'could', 'would', 'should', 'at', 'on', 'by', 'as',
            'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
            'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can',
            'could', 'need', 'needs', 'needed'
        ]
        
        # Add space before common words that are merged
        for word in common_words:
            # Match lowercase letter followed by the word
            text = re.sub(rf'([a-z])({word})\b', r'\1 \2', text, flags=re.IGNORECASE)
            # Match word followed by lowercase letter (start of next word)
            text = re.sub(rf'\b({word})([a-z])', r'\1 \2', text, flags=re.IGNORECASE)
        
        # Add space before capital letters that follow lowercase
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        
        # Add space after periods followed by capital letters
        text = re.sub(r'\.([A-Z])', r'. \1', text)
        
        # Add space after commas without space
        text = re.sub(r',([^\s])', r', \1', text)
        
        # Clean up multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def is_instruction_only_question(self, text):
        """Check if question text is just instructions"""
        instruction_patterns = [
            r'complete\s+the\s+following',
            r'fill\s+in\s+the\s+blank',
            r'write\s+down\s+the',
            r'state\s+the',
            r'give\s+the',
            r'name\s+the',
        ]
        
        text_lower = text.lower()
        for pattern in instruction_patterns:
            if re.search(pattern, text_lower):
                return True
        return False
    
    def is_fill_in_blank_question(self, text):
        """Check if this is a fill-in-blank type question"""
        fill_patterns = [
            r'^complete\s+the\s+following',
            r'^complete\s+each',
        ]
        
        text_lower = text.lower().strip()
        for pattern in fill_patterns:
            if re.match(pattern, text_lower):
                return True
        return False
    
    def extract_instruction_from_question(self, text):
        """Extract just the instruction part from a question with fill-in-blanks"""
        if not self.is_instruction_only_question(text):
            return text
        
        sentences = re.split(r'([.!?])\s+', text)
        
        full_sentences = []
        for i in range(0, len(sentences)-1, 2):
            if i+1 < len(sentences):
                full_sentences.append(sentences[i] + sentences[i+1])
        if len(sentences) % 2 == 1:
            full_sentences.append(sentences[-1])
        
        if full_sentences and self.is_instruction_only_question(full_sentences[0]):
            return full_sentences[0].strip()
        
        return text
    
    def flush_blank_buffer(self):
        """Convert buffered blank lines into subparts"""
        if not self.blank_buffer:
            return
        
        if self.current_question and self.current_question['text']:
            cleaned_instruction = self.extract_instruction_from_question(self.current_question['text'])
            if cleaned_instruction != self.current_question['text']:
                self.current_question['text'] = cleaned_instruction
        
        for i, blank_text in enumerate(self.blank_buffer):
            letter = chr(ord('a') + i)
            
            subpart = {
                'number': letter,
                'text': blank_text,
                'marks': 1,
                'subparts': []
            }
            
            if self.current_question:
                self.current_question['subparts'].append(subpart)
        
        self.blank_buffer = []
    
    def detect_marker_type(self, text):
        """Detect what type of marker this line starts with"""
        text = text.strip()
        
        # Question: "1  Some text" or "12  Some text"
        match = re.match(r'^(\d+)\s+(.*)$', text)
        if match:
            num = int(match.group(1))
            if 1 <= num <= 20:
                return ('question', match.group(1), match.group(2))
        
        # Part: "(a) Some text"
        match = re.match(r'^\(([a-z])\)\s+(.*)$', text)
        if match:
            return ('part', match.group(1), match.group(2))
        
        # Subpart: "(i) Some text"
        match = re.match(r'^\(([ivx]+)\)\s+(.*)$', text)
        if match:
            return ('subpart', match.group(1), match.group(2))
        
        return (None, None, text)
    
    def extract_marks(self, text):
        """Extract marks from text like [4] or [Total: 6]"""
        match = re.search(r'\[(\d+)\]', text)
        if match:
            return int(match.group(1)), re.sub(r'\[\d+\]', '', text).strip()
        
        match = re.search(r'\[Total:\s*(\d+)\]', text)
        if match:
            return int(match.group(1)), re.sub(r'\[Total:\s*\d+\]', '', text).strip()
        
        return None, text
    
    def save_current_hierarchy(self):
        """Save current subpart -> part -> question"""
        self.flush_blank_buffer()
        
        if self.current_subpart and self.current_part:
            self.current_part['subparts'].append(self.current_subpart)
            self.current_subpart = None
        
        if self.current_part and self.current_question:
            self.current_question['subparts'].append(self.current_part)
            self.current_part = None
        
        if self.current_question:
            self.questions.append(self.current_question)
            self.current_question = None
    
    def add_text_to_current(self, text):
        """Add text to the current question/part/subpart"""
        if not text:
            return
        
        text = self.remove_answer_dots(text)
        text = self.fix_spacing(text)
        
        if self.current_subpart:
            if self.current_subpart['text']:
                self.current_subpart['text'] += ' ' + text
            else:
                self.current_subpart['text'] = text
        elif self.current_part:
            if self.current_part['text']:
                self.current_part['text'] += ' ' + text
            else:
                self.current_part['text'] = text
        elif self.current_question:
            if self.current_question['text']:
                self.current_question['text'] += ' ' + text
            else:
                self.current_question['text'] = text
    
    def parse_page(self, page, page_num):
        """Parse a single page"""
        if self.stop_parsing:
            return
            
        text = page.extract_text(layout=True)
        if not text:
            return
        
        lines = text.split('\n')
        
        for line_idx, line in enumerate(lines):
            if 'Permission to reproduce' in line or 'Permissiontoreproduce' in line:
                self.stop_parsing = True
                return
            
            if self.is_junk(line):
                continue
            
            # Skip lines that are in image regions
            # (This is approximate - we'd need Y-coordinates from extract_words for precision)
            # For now, we'll just use the text-based approach
            
            if self.is_fill_in_blank_line(line):
                clean_text = self.clean_blank_line(line)
                if clean_text:
                    self.blank_buffer.append(clean_text)
                continue
            
            if self.blank_buffer:
                self.flush_blank_buffer()
            
            marker_type, marker_value, remaining_text = self.detect_marker_type(line)
            
            if marker_type == 'question':
                # DUPLICATE PREVENTION: Check if we've seen this question number
                q_num = int(marker_value)
                if q_num in self.seen_question_numbers:
                    # This is a duplicate - likely table content or page header
                    # Skip it
                    continue
                
                self.save_current_hierarchy()
                
                marks, clean_text = self.extract_marks(remaining_text)
                clean_text = self.remove_answer_dots(clean_text)
                clean_text = self.fix_spacing(clean_text)
                
                question_type = None
                if self.is_fill_in_blank_question(clean_text):
                    question_type = 'fill_in_blank'
                
                self.current_question = {
                    'number': marker_value,
                    'text': clean_text,
                    'marks': marks,
                    'type': question_type,
                    'subparts': []
                }
                
                # Mark this question number as seen
                self.seen_question_numbers.add(q_num)
                
            elif marker_type == 'part':
                if self.current_subpart and self.current_part:
                    self.current_part['subparts'].append(self.current_subpart)
                    self.current_subpart = None
                
                if self.current_part and self.current_question:
                    self.current_question['subparts'].append(self.current_part)
                
                marks, clean_text = self.extract_marks(remaining_text)
                clean_text = self.remove_answer_dots(clean_text)
                clean_text = self.fix_spacing(clean_text)
                
                self.current_part = {
                    'number': marker_value,
                    'text': clean_text,
                    'marks': marks,
                    'subparts': []
                }
                
            elif marker_type == 'subpart':
                if self.current_subpart and self.current_part:
                    self.current_part['subparts'].append(self.current_subpart)
                
                marks, clean_text = self.extract_marks(remaining_text)
                clean_text = self.remove_answer_dots(clean_text)
                clean_text = self.fix_spacing(clean_text)
                
                self.current_subpart = {
                    'number': marker_value,
                    'text': clean_text,
                    'marks': marks,
                    'subparts': []
                }
                
            else:
                marks, clean_text = self.extract_marks(line.strip())
                
                if marks:
                    if self.current_subpart:
                        self.current_subpart['marks'] = marks
                    elif self.current_part:
                        self.current_part['marks'] = marks
                    elif self.current_question:
                        self.current_question['marks'] = marks
                
                self.add_text_to_current(clean_text)
    
    def parse(self):
        """Parse the entire PDF"""
        print(f"\n{'='*60}")
        print(f"IMPROVED PARSER WITH TABLE DETECTION")
        print(f"{'='*60}")
        print(f"Opening PDF: {self.pdf_path}")
        
        # First, detect image regions and tables
        self.detect_image_regions_and_tables()
        
        with pdfplumber.open(self.pdf_path) as pdf:
            print(f"Total pages: {len(pdf.pages)}")
            print("\nParsing text...")
            
            for page_num, page in enumerate(pdf.pages, 1):
                print(f"  Processing page {page_num}...")
                self.parse_page(page, page_num)
        
        self.save_current_hierarchy()
        
        print(f"\n[SUCCESS] Extracted {len(self.questions)} questions")
        print(f"[INFO] Prevented {len(self.seen_question_numbers) - len(self.questions)} duplicate questions")
        return self.questions
    
    def to_json(self, output_path):
        """Convert to JSON format with tables"""
        # Calculate total marks
        total_marks = 0
        for q in self.questions:
            if q.get('marks'):
                total_marks += q['marks']
            for part in q.get('subparts', []):
                if part.get('marks'):
                    total_marks += part['marks']
                for subpart in part.get('subparts', []):
                    if subpart.get('marks'):
                        total_marks += subpart['marks']
        
        # Extract paper info from filename
        filename = Path(self.pdf_path).stem
        match = re.match(r'(\d+)_([a-z])(\d+)_qp_(\d+)', filename)
        
        if match:
            subject_code = match.group(1)
            season_code = match.group(2)
            year = int('20' + match.group(3))
            variant = int(match.group(4))
            
            season_map = {'s': 'May/June', 'w': 'Oct/Nov', 'm': 'Feb/March'}
            season = season_map.get(season_code, 'Unknown')
        else:
            subject_code = '0417'
            season_code = 's'
            season = 'May/June'
            year = 2020
            variant = 12
        
        paper_data = {
            'id': f'{subject_code}_{season_code}{year % 100}_qp_{variant:02d}',
            'subject': f'ICT {subject_code}',
            'year': year,
            'season': season,
            'variant': variant,
            'totalMarks': total_marks,
            'duration': 120,
            'questions': self.questions,
            'tables': self.tables  # Add detected tables
        }
        
        # Write main JSON to file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(paper_data, f, indent=2, ensure_ascii=False)
        
        # Save table detection log separately
        if self.table_detection_log:
            log_path = output_path.replace('.json', '_table_log.json')
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'paper_id': paper_data['id'],
                    'total_tables': len(self.table_detection_log),
                    'tables': self.table_detection_log
                }, f, indent=2, ensure_ascii=False)
            print(f"[INFO] Table detection log saved to: {log_path}")
        
        print(f"\n{'='*60}")
        print(f"[SUCCESS] Saved to: {output_path}")
        print(f"Total marks: {total_marks}")
        print(f"Total questions: {len(self.questions)}")
        print(f"Total tables detected: {len(self.table_detection_log)}")
        print(f"{'='*60}\n")
        
        return paper_data


def main():
    if len(sys.argv) < 2:
        print("Usage: python parser-improved.py <pdf_path> [output_path]")
        print("\nExample:")
        print("  python parser-improved.py path/to/0417_s20_qp_13.pdf")
        print("  python parser-improved.py path/to/0417_s20_qp_13.pdf output.json")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    else:
        paper_id = Path(pdf_path).stem
        output_path = f'public/papers/{paper_id}.json'
    
    parser = ImprovedParser(pdf_path)
    questions = parser.parse()
    
    # Show summary
    print("\nParsing Summary:")
    print("-" * 60)
    for q in questions:
        parts = [p['number'] for p in q.get('subparts', [])]
        print(f"Q{q['number']}: {len(q.get('subparts', []))} parts {parts}")
        if q.get('marks'):
            print(f"  Marks: {q['marks']}")
    print("-" * 60)
    
    # Save to JSON
    parser.to_json(output_path)
    
    print("Parsing complete!")


if __name__ == '__main__':
    main()

# Made with Bob