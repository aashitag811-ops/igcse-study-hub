#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced MCQ Parser V2
Handles all PDF format variations with intelligent text processing
"""

import pdfplumber
import re
import json
import sys
import io
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

class AdvancedMCQParser:
    def __init__(self):
        self.debug = False
    
    def clean_text(self, text):
        """Clean and normalize extracted text"""
        # Remove copyright symbols and special characters
        text = text.replace('©', '').replace('™', '').replace('®', '')
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove page numbers and footers
        text = re.sub(r'UCLES \d{4}.*?\n', '', text)
        return text.strip()
    
    def extract_questions_advanced(self, text):
        """
        Advanced question extraction with multiple strategies
        """
        questions = []
        
        # Strategy 1: Find question blocks using multiple patterns
        # Pattern matches: "1 What is..." or "1What is..." (no space)
        pattern1 = r'\n(\d+)\s*([A-Z][^\n]+?)(?=\n[A-D]\s+|\n\d+\s+[A-Z]|\Z)'
        matches1 = re.findall(pattern1, text, re.DOTALL)
        
        if self.debug:
            print(f"Strategy 1 found {len(matches1)} questions")
        
        for q_num, q_text in matches1:
            q_num = int(q_num)
            q_text = self.clean_text(q_text)
            
            # Skip if question text is too short or looks like a false positive
            if len(q_text) < 10 or q_text.lower().startswith(('page', 'turn over', 'blank')):
                continue
            
            # Extract options for this question
            options = self.extract_options_advanced(text, q_num)
            
            if len(options) == 4:  # Valid MCQ must have exactly 4 options
                questions.append({
                    'number': q_num,
                    'text': q_text,
                    'options': options
                })
        
        return questions
    
    def extract_options_advanced(self, text, question_num):
        """
        Extract options A-D for a specific question
        """
        options = []
        
        # Find the question block
        q_pattern = rf'\n{question_num}\s+.+?(?=\n{question_num + 1}\s+|\Z)'
        q_match = re.search(q_pattern, text, re.DOTALL)
        
        if not q_match:
            return options
        
        q_block = q_match.group(0)
        
        # Extract options A, B, C, D
        for letter in ['A', 'B', 'C', 'D']:
            # Pattern: "A some text" or "A\nsome text"
            opt_pattern = rf'\n{letter}\s+(.+?)(?=\n[A-D]\s+|\n\d+\s+|\Z)'
            opt_match = re.search(opt_pattern, q_block, re.DOTALL)
            
            if opt_match:
                opt_text = self.clean_text(opt_match.group(1))
                # Remove any trailing question numbers or letters
                opt_text = re.sub(r'\s+\d+\s*$', '', opt_text)
                opt_text = re.sub(r'\s+[A-D]\s*$', '', opt_text)
                
                if opt_text and len(opt_text) > 1:
                    options.append({
                        'letter': letter,
                        'text': opt_text
                    })
        
        return options
    
    def extract_answers(self, ms_text, num_questions):
        """Extract answers from marking scheme"""
        answers = {}
        
        # Common patterns in marking schemes
        patterns = [
            r'(\d+)\s+([A-D])',  # "1 A"
            r'(\d+)\s*\)\s*([A-D])',  # "1) A"
            r'Question\s+(\d+).*?([A-D])',  # "Question 1 ... A"
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, ms_text, re.IGNORECASE)
            for q_num, answer in matches:
                q_num = int(q_num)
                if 1 <= q_num <= num_questions:
                    answers[q_num] = answer.upper()
        
        return answers
    
    def parse_paper(self, qp_path, ms_path):
        """Parse a complete MCQ paper"""
        print(f"\n{'='*70}")
        print(f"Parsing: {Path(qp_path).name}")
        print(f"{'='*70}\n")
        
        # Extract text from question paper
        with pdfplumber.open(qp_path) as pdf:
            qp_text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
        
        # Extract text from marking scheme
        with pdfplumber.open(ms_path) as pdf:
            ms_text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
        
        # Parse questions
        questions = self.extract_questions_advanced(qp_text)
        print(f"[OK] Extracted {len(questions)} questions")
        
        # Extract answers
        answers = self.extract_answers(ms_text, len(questions))
        print(f"[OK] Extracted {len(answers)} answers")
        
        # Combine questions with answers
        result = []
        for q in questions:
            q_num = q['number']
            result.append({
                'questionNumber': q_num,
                'questionText': q['text'],
                'options': q['options'],
                'correctAnswer': answers.get(q_num, None),
                'examinerReportNote': None
            })
        
        return result

def main():
    parser = AdvancedMCQParser()
    parser.debug = True
    
    # Test on problematic papers
    test_papers = [
        ('scripts/0610_m20_qp_22.pdf', 'scripts/0610_m20_ms_22.pdf'),  # Working
        ('scripts/0455_m25_qp_12.pdf', 'scripts/0455_m25_ms_12.pdf'),  # Problematic
    ]
    
    for qp, ms in test_papers:
        try:
            questions = parser.parse_paper(qp, ms)
            print(f"\n[SUCCESS] Parsed {len(questions)} questions")
            
            # Show first question
            if questions:
                print("\nFirst question:")
                print(json.dumps(questions[0], indent=2))
        except Exception as e:
            print(f"\n[ERROR] {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()

# Made with Bob
