#!/usr/bin/env python3
"""
SMART HIERARCHY PARSER
Properly detects questions, parts, and subparts with inline markers
"""

import pdfplumber
import re
import json
import sys
from pathlib import Path

class SmartParser:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.questions = []
        self.current_question = None
        self.current_part = None
        self.current_subpart = None
        self.stop_parsing = False
        self.blank_buffer = []  # Buffer for fill-in-the-blank lines
        
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
        # Match lines ending with 3+ dots, possibly followed by a period
        # But NOT lines that are mostly dots (those are answer lines)
        text = text.strip()
        if len(text) > 10 and text.count('.') > len(text) * 0.6:
            return False  # This is an answer line, not a question
        
        return bool(re.search(r'\.{3,}\.?\s*$', text))
    
    def clean_blank_line(self, text):
        """Remove trailing dots from fill-in-blank line"""
        # Remove 3+ dots and optional trailing period
        return re.sub(r'\s*\.{3,}\.?\s*$', '', text).strip()
    
    def remove_answer_dots(self, text):
        """Remove all answer line dots from text (.......)"""
        if not text:
            return text
        # Remove sequences of 3+ dots anywhere in the text
        text = re.sub(r'\.{3,}', '', text)
        # Clean up extra spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def is_instruction_only_question(self, text):
        """Check if question text is just instructions (like 'Complete the following sentences')"""
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
        # Questions starting with "Complete the following" or "Complete each"
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
        # For questions like "Complete the following sentences using the most appropriate network term."
        # We want to keep ONLY the instruction, not the actual fill-in sentences
        
        # Check if this looks like an instruction-only question
        if not self.is_instruction_only_question(text):
            return text
        
        # Split by sentence-ending punctuation
        sentences = re.split(r'([.!?])\s+', text)
        
        # Reconstruct sentences with their punctuation
        full_sentences = []
        for i in range(0, len(sentences)-1, 2):
            if i+1 < len(sentences):
                full_sentences.append(sentences[i] + sentences[i+1])
        if len(sentences) % 2 == 1:
            full_sentences.append(sentences[-1])
        
        # Return only the first sentence if it contains instruction keywords
        if full_sentences and self.is_instruction_only_question(full_sentences[0]):
            return full_sentences[0].strip()
        
        return text
    
    def flush_blank_buffer(self):
        """Convert buffered blank lines into subparts"""
        if not self.blank_buffer:
            return
        
        # If current question text contains fill-in-blanks, clean it
        if self.current_question and self.current_question['text']:
            cleaned_instruction = self.extract_instruction_from_question(self.current_question['text'])
            if cleaned_instruction != self.current_question['text']:
                self.current_question['text'] = cleaned_instruction
        
        # Create subparts from blank lines
        for i, blank_text in enumerate(self.blank_buffer):
            # Use letters for subparts: a, b, c, d...
            letter = chr(ord('a') + i)
            
            subpart = {
                'number': letter,
                'text': blank_text,
                'marks': 1,  # Each blank is typically 1 mark
                'subparts': []
            }
            
            if self.current_question:
                self.current_question['subparts'].append(subpart)
        
        self.blank_buffer = []
    
    def detect_marker_type(self, text):
        """
        Detect what type of marker this line starts with
        Returns: ('question', number, remaining_text) or ('part', letter, remaining_text) or ('subpart', roman, remaining_text) or (None, None, text)
        """
        text = text.strip()
        
        # Question: "1  Some text" or "12  Some text" (number with 1+ spaces)
        # Changed from 2+ to 1+ to catch more questions
        match = re.match(r'^(\d+)\s+(.*)$', text)
        if match:
            num = int(match.group(1))
            if 1 <= num <= 20:
                return ('question', match.group(1), match.group(2))
        
        # Part: "(a) Some text" or "(b) Some text"
        match = re.match(r'^\(([a-z])\)\s+(.*)$', text)
        if match:
            return ('part', match.group(1), match.group(2))
        
        # Subpart: "(i) Some text" or "(ii) Some text"
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
        # Flush any pending blanks first
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
    
    def fix_spacing(self, text):
        """Fix spacing issues in extracted text"""
        if not text:
            return text
        
        # Add space before capital letters that follow lowercase (camelCase fix)
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        
        # Add space after periods followed by capital letters
        text = re.sub(r'\.([A-Z])', r'. \1', text)
        
        # Add space after commas without space
        text = re.sub(r',([^\s])', r', \1', text)
        
        # Fix common merged words - more aggressive
        # Add space between lowercase and uppercase
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        
        # Add space after common word endings before new words
        # e.g., "thegraph" -> "the graph", "tothe" -> "to the"
        common_words = ['the', 'to', 'of', 'in', 'for', 'and', 'that', 'this', 'with', 'from', 'be', 'can', 'could', 'would', 'should']
        for word in common_words:
            # Match word followed by lowercase letter (start of next word)
            text = re.sub(rf'\b{word}([a-z])', rf'{word} \1', text, flags=re.IGNORECASE)
        
        # Add space before common words that are merged
        for word in common_words:
            # Match lowercase letter followed by common word
            text = re.sub(rf'([a-z])({word})\b', r'\1 \2', text, flags=re.IGNORECASE)
        
        return text
    
    def add_text_to_current(self, text):
        """Add text to the current question/part/subpart"""
        if not text:
            return
        
        # Remove answer dots first
        text = self.remove_answer_dots(text)
        
        # Fix spacing issues
        text = self.fix_spacing(text)
        
        # Add to most specific level
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
    
    def parse_page(self, page):
        """Parse a single page"""
        if self.stop_parsing:
            return
            
        text = page.extract_text(layout=True)
        if not text:
            return
        
        lines = text.split('\n')
        
        for line in lines:
            # Check for copyright section - stop parsing everything after this
            if 'Permission to reproduce' in line or 'Permissiontoreproduce' in line:
                self.stop_parsing = True
                return
            
            if self.is_junk(line):
                continue
            
            # Check if this is a fill-in-the-blank line
            if self.is_fill_in_blank_line(line):
                clean_text = self.clean_blank_line(line)
                if clean_text:
                    self.blank_buffer.append(clean_text)
                continue
            
            # If we have buffered blanks and hit a non-blank line, flush them
            if self.blank_buffer:
                self.flush_blank_buffer()
            
            marker_type, marker_value, remaining_text = self.detect_marker_type(line)
            
            if marker_type == 'question':
                # Save previous hierarchy
                self.save_current_hierarchy()
                
                # Extract marks, remove dots, and fix spacing
                marks, clean_text = self.extract_marks(remaining_text)
                clean_text = self.remove_answer_dots(clean_text)
                clean_text = self.fix_spacing(clean_text)
                
                # Detect question type
                question_type = None
                if self.is_fill_in_blank_question(clean_text):
                    question_type = 'fill_in_blank'
                
                # Start new question
                self.current_question = {
                    'number': marker_value,
                    'text': clean_text,
                    'marks': marks,
                    'type': question_type,
                    'subparts': []
                }
                
            elif marker_type == 'part':
                # Save previous subpart if exists
                if self.current_subpart and self.current_part:
                    self.current_part['subparts'].append(self.current_subpart)
                    self.current_subpart = None
                
                # Save previous part if exists
                if self.current_part and self.current_question:
                    self.current_question['subparts'].append(self.current_part)
                
                # Extract marks, remove dots, and fix spacing
                marks, clean_text = self.extract_marks(remaining_text)
                clean_text = self.remove_answer_dots(clean_text)
                clean_text = self.fix_spacing(clean_text)
                
                # Start new part
                self.current_part = {
                    'number': marker_value,
                    'text': clean_text,
                    'marks': marks,
                    'subparts': []
                }
                
            elif marker_type == 'subpart':
                # Save previous subpart if exists
                if self.current_subpart and self.current_part:
                    self.current_part['subparts'].append(self.current_subpart)
                
                # Extract marks, remove dots, and fix spacing
                marks, clean_text = self.extract_marks(remaining_text)
                clean_text = self.remove_answer_dots(clean_text)
                clean_text = self.fix_spacing(clean_text)
                
                # Start new subpart
                self.current_subpart = {
                    'number': marker_value,
                    'text': clean_text,
                    'marks': marks,
                    'subparts': []
                }
                
            else:
                # Regular text line - add to current context
                # Check for marks in this line
                marks, clean_text = self.extract_marks(line.strip())
                
                if marks:
                    # Assign marks to current level
                    if self.current_subpart:
                        self.current_subpart['marks'] = marks
                    elif self.current_part:
                        self.current_part['marks'] = marks
                    elif self.current_question:
                        self.current_question['marks'] = marks
                
                # Add text
                self.add_text_to_current(clean_text)
    
    def parse(self):
        """Parse the entire PDF"""
        print(f"Opening PDF: {self.pdf_path}")
        
        with pdfplumber.open(self.pdf_path) as pdf:
            print(f"Total pages: {len(pdf.pages)}")
            
            for page_num, page in enumerate(pdf.pages, 1):
                print(f"   Processing page {page_num}...")
                self.parse_page(page)
        
        # Save final hierarchy
        self.save_current_hierarchy()
        
        print(f"Extracted {len(self.questions)} questions")
        return self.questions
    
    def to_json(self, output_path):
        """Convert to JSON format"""
        # Calculate total marks
        total_marks = 0
        for q in self.questions:
            if q['marks']:
                total_marks += q['marks']
            for part in q.get('subparts', []):
                if part['marks']:
                    total_marks += part['marks']
                for subpart in part.get('subparts', []):
                    if subpart['marks']:
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
            'questions': self.questions
        }
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(paper_data, f, indent=2, ensure_ascii=False)
        
        print(f"Saved to: {output_path}")
        print(f"Total marks: {total_marks}")
        
        return paper_data


def main():
    if len(sys.argv) < 2:
        print("Usage: python smart-hierarchy-parser.py <pdf_path> [output_path]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'parsed_output.json'
    
    parser = SmartParser(pdf_path)
    questions = parser.parse()
    
    # Show summary (skip detailed output to avoid Unicode errors)
    print("\n" + "="*60)
    print("PARSING SUMMARY")
    print("="*60)
    
    for q in questions:
        print(f"\nQ{q['number']}: {len(q.get('subparts', []))} parts")
        if q['marks']:
            print(f"  Marks: {q['marks']}")
    
    # Save to JSON
    parser.to_json(output_path)
    
    print("\nParsing complete!")


if __name__ == '__main__':
    main()

# Made with Bob
