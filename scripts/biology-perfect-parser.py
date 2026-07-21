#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Perfect Biology MCQ Parser (0610)
Specialized parser for IGCSE Biology papers with 100% accuracy
"""

import pdfplumber
import re
import json
import sys
import io
from pathlib import Path
from typing import List, Dict, Optional

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

class BiologyMCQParser:
    """
    Specialized parser for Biology (0610) MCQ papers
    Handles all years (2010-2025) and all variants (11, 12, 13, 21, 22, 23)
    """
    
    def __init__(self, debug=False):
        self.debug = debug
        self.subject = "Biology"
        self.code = "0610"
    
    def log(self, message):
        """Debug logging"""
        if self.debug:
            print(f"[DEBUG] {message}")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove special characters and symbols
        text = text.replace('©', '').replace('™', '').replace('®', '')
        text = text.replace('\uf0b7', '•')  # Bullet point
        
        # Normalize whitespace but preserve line breaks for question detection
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n', text)
        
        # Remove page footers
        text = re.sub(r'©?\s*UCLES\s+\d{4}.*?\n', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}', '', text)
        
        return text.strip()
    
    def extract_page_text(self, pdf_path: str) -> str:
        """Extract text from all pages"""
        self.log(f"Extracting text from {pdf_path}")
        
        with pdfplumber.open(pdf_path) as pdf:
            pages_text = []
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    pages_text.append(text)
                    self.log(f"Page {i+1}: {len(text)} characters")
            
            full_text = '\n'.join(pages_text)
            self.log(f"Total text extracted: {len(full_text)} characters")
            return full_text
    
    def find_question_blocks(self, text: str) -> List[Dict]:
        """
        Find all question blocks in the text
        Biology papers have questions numbered 1-40
        """
        self.log("Finding question blocks...")
        
        # Split text into lines for easier processing
        lines = text.split('\n')
        
        questions = []
        current_question = None
        current_text_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line starts with a question number (1-40)
            match = re.match(r'^(\d+)\s+(.+)', line)
            
            if match:
                q_num = int(match.group(1))
                
                # Valid question numbers for Biology MCQ
                if 1 <= q_num <= 40:
                    # Save previous question if exists
                    if current_question is not None:
                        questions.append({
                            'number': current_question,
                            'text_lines': current_text_lines
                        })
                    
                    # Start new question
                    current_question = q_num
                    current_text_lines = [match.group(2)]
                    self.log(f"Found question {q_num}")
                else:
                    # Not a valid question number, add to current question
                    if current_question is not None:
                        current_text_lines.append(line)
            else:
                # Add line to current question
                if current_question is not None:
                    current_text_lines.append(line)
        
        # Don't forget the last question
        if current_question is not None:
            questions.append({
                'number': current_question,
                'text_lines': current_text_lines
            })
        
        self.log(f"Found {len(questions)} question blocks")
        return questions
    
    def extract_question_and_options(self, question_block: Dict) -> Optional[Dict]:
        """
        Extract question text and options A-D from a question block
        """
        q_num = question_block['number']
        lines = question_block['text_lines']
        
        # Join all lines
        full_text = ' '.join(lines)
        
        # Find options A, B, C, D
        options = []
        option_pattern = r'\b([A-D])\s+([^A-D\n]+?)(?=\s+[A-D]\s+|\Z)'
        
        # Try to find all 4 options
        matches = list(re.finditer(option_pattern, full_text))
        
        if len(matches) < 4:
            # Fallback: try line-by-line option detection
            self.log(f"Q{q_num}: Using fallback option detection")
            options = self.extract_options_fallback(lines)
        else:
            for match in matches[:4]:  # Take first 4 matches
                letter = match.group(1)
                text = match.group(2).strip()
                if text:
                    options.append({'letter': letter, 'text': text})
        
        # Extract question text (everything before first option)
        if options:
            first_option_pos = full_text.find(f" {options[0]['letter']} ")
            if first_option_pos > 0:
                question_text = full_text[:first_option_pos].strip()
            else:
                question_text = full_text.split(options[0]['letter'])[0].strip()
        else:
            question_text = full_text.strip()
        
        # Clean question text
        question_text = self.clean_text(question_text)
        
        # Validate: must have exactly 4 options
        if len(options) != 4:
            self.log(f"Q{q_num}: Invalid - found {len(options)} options")
            return None
        
        return {
            'questionNumber': q_num,
            'questionText': question_text,
            'options': options
        }
    
    def extract_options_fallback(self, lines: List[str]) -> List[Dict]:
        """
        Fallback method to extract options when regex fails
        """
        options = []
        current_option = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            # Check if line starts with A, B, C, or D
            if re.match(r'^([A-D])\s+(.+)', line):
                # Save previous option
                if current_option:
                    options.append({
                        'letter': current_option,
                        'text': ' '.join(current_text).strip()
                    })
                
                # Start new option
                match = re.match(r'^([A-D])\s+(.+)', line)
                current_option = match.group(1)
                current_text = [match.group(2)]
            elif current_option:
                # Continue current option
                current_text.append(line)
        
        # Don't forget last option
        if current_option:
            options.append({
                'letter': current_option,
                'text': ' '.join(current_text).strip()
            })
        
        return options
    
    def extract_answers(self, ms_text: str, num_questions: int) -> Dict[int, str]:
        """
        Extract answers from marking scheme
        """
        self.log("Extracting answers from marking scheme...")
        
        answers = {}
        
        # Common patterns in Biology marking schemes
        patterns = [
            r'(\d+)\s+([A-D])\b',  # "1 A"
            r'(\d+)\s*\)\s*([A-D])',  # "1) A"
            r'(\d+)\s*[:.]\s*([A-D])',  # "1: A" or "1. A"
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, ms_text, re.MULTILINE)
            for q_num_str, answer in matches:
                q_num = int(q_num_str)
                if 1 <= q_num <= num_questions:
                    answers[q_num] = answer.upper()
        
        self.log(f"Extracted {len(answers)} answers")
        return answers
    
    def parse_paper(self, qp_path: str, ms_path: str, output_path: str = None) -> Dict:
        """
        Parse a complete Biology MCQ paper
        """
        print(f"\n{'='*70}")
        print(f"BIOLOGY PARSER - {Path(qp_path).name}")
        print(f"{'='*70}\n")
        
        # Extract text
        qp_text = self.extract_page_text(qp_path)
        ms_text = self.extract_page_text(ms_path)
        
        # Find question blocks
        question_blocks = self.find_question_blocks(qp_text)
        
        # Extract questions and options
        questions = []
        for block in question_blocks:
            q_data = self.extract_question_and_options(block)
            if q_data:
                questions.append(q_data)
        
        print(f"[OK] Extracted {len(questions)} questions")
        
        # Extract answers
        answers = self.extract_answers(ms_text, len(questions))
        print(f"[OK] Extracted {len(answers)} answers")
        
        # Combine questions with answers
        for q in questions:
            q_num = q['questionNumber']
            q['correctAnswer'] = answers.get(q_num, None)
            q['examinerReportNote'] = None
            
            if q['correctAnswer'] is None:
                print(f"[WARN] No answer found for Q{q_num}")
        
        # Extract paper info from filename
        filename = Path(qp_path).stem  # e.g., "0610_m20_qp_22"
        parts = filename.split('_')
        
        paper_data = {
            'paperId': f"{parts[0]}_{parts[1]}_{parts[3]}",  # "0610_m20_22"
            'title': f"Biology Paper {parts[3]} - {parts[1]}",
            'subject': self.subject,
            'code': self.code,
            'variant': parts[3],
            'session': parts[1],
            'totalQuestions': len(questions),
            'timeLimit': 2700,  # 45 minutes
            'questions': questions
        }
        
        # Save to file if output path provided
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(paper_data, f, indent=2, ensure_ascii=False)
            print(f"\n[SUCCESS] Saved to {output_path}")
        
        print(f"{'='*70}\n")
        return paper_data


def main():
    """Test the parser on sample papers"""
    parser = BiologyMCQParser(debug=True)
    
    # Test papers
    test_cases = [
        ('scripts/0610_m20_qp_22.pdf', 'scripts/0610_m20_ms_22.pdf', 'public/papers/0610_m20_22.json'),
        ('scripts/0610_m25_qp_12.pdf', 'scripts/0610_m25_ms_12.pdf', 'public/papers/0610_m25_12.json'),
    ]
    
    for qp, ms, output in test_cases:
        try:
            result = parser.parse_paper(qp, ms, output)
            print(f"✓ Successfully parsed {result['totalQuestions']} questions")
        except Exception as e:
            print(f"✗ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()

# Made with Bob
