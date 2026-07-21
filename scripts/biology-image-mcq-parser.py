#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Biology Image-Based MCQ Parser
Converts PDF questions to images and detects option positions
Generates JSON files compatible with the MCQ exam interface
"""

import fitz  # PyMuPDF
import cv2
import numpy as np
import json
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

class BiologyImageMCQParser:
    """
    Image-based MCQ parser for Biology (0610) papers
    Creates question images and detects option click positions
    """
    
    def __init__(self, output_dir="public/images/biology/questions"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.dpi = 150  # Image resolution
    
    def log(self, msg):
        print(f"[INFO] {msg}")
    
    def pdf_page_to_image(self, pdf_path: str, page_num: int) -> np.ndarray:
        """Convert a PDF page to an image array"""
        doc = fitz.open(pdf_path)
        page = doc[page_num]
        
        # Render page to pixmap
        mat = fitz.Matrix(self.dpi / 72, self.dpi / 72)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to numpy array
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        
        # Convert RGBA to RGB if needed
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
        
        doc.close()
        return img
    
    def extract_text_with_positions(self, pdf_path: str) -> List[Dict]:
        """
        Extract text from PDF with position information
        Returns list of {text, page, bbox} dictionaries
        """
        doc = fitz.open(pdf_path)
        text_blocks = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("dict")["blocks"]
            
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text_blocks.append({
                                'text': span['text'],
                                'page': page_num,
                                'bbox': span['bbox'],  # (x0, y0, x1, y1)
                                'size': span['size']
                            })
        
        doc.close()
        return text_blocks
    
    def find_question_pages(self, pdf_path: str) -> Dict[int, int]:
        """
        Find which page each question is on
        Returns: {question_number: page_number}
        """
        text_blocks = self.extract_text_with_positions(pdf_path)
        question_pages = {}
        
        for block in text_blocks:
            text = block['text'].strip()
            # Match question numbers (1-40) at start of line
            match = re.match(r'^(\d+)\s+[A-Z]', text)
            if match:
                q_num = int(match.group(1))
                if 1 <= q_num <= 40:
                    question_pages[q_num] = block['page']
        
        self.log(f"Found {len(question_pages)} questions across pages")
        return question_pages
    
    def find_option_positions(self, text_blocks: List[Dict], page_num: int) -> Dict[str, Tuple[float, float]]:
        """
        Find positions of options A, B, C, D on a page
        Returns: {letter: (x_percent, y_percent)}
        """
        options = {}
        page_blocks = [b for b in text_blocks if b['page'] == page_num]
        
        if not page_blocks:
            return options
        
        # Get page dimensions from first block
        page_height = max(b['bbox'][3] for b in page_blocks)
        page_width = max(b['bbox'][2] for b in page_blocks)
        
        for block in page_blocks:
            text = block['text'].strip()
            # Match single letter A, B, C, or D
            if re.match(r'^[A-D]$', text):
                letter = text
                bbox = block['bbox']
                
                # Calculate center position as percentage
                x_center = (bbox[0] + bbox[2]) / 2
                y_center = (bbox[1] + bbox[3]) / 2
                
                x_percent = round((x_center / page_width) * 100, 2)
                y_percent = round((y_center / page_height) * 100, 2)
                
                options[letter] = (x_percent, y_percent)
        
        return options
    
    def crop_question_from_page(self, img: np.ndarray, text_blocks: List[Dict], 
                                 q_num: int, page_num: int) -> Optional[np.ndarray]:
        """
        Crop a specific question from a page image
        """
        page_blocks = [b for b in text_blocks if b['page'] == page_num]
        
        # Find question start
        q_start = None
        for block in page_blocks:
            if re.match(rf'^{q_num}\s+', block['text']):
                q_start = block['bbox']
                break
        
        if not q_start:
            return None
        
        # Find next question or end of page
        next_q = q_num + 1
        q_end = None
        for block in page_blocks:
            if re.match(rf'^{next_q}\s+', block['text']):
                q_end = block['bbox']
                break
        
        # Define crop region
        y_start = int(q_start[1] * (self.dpi / 72))
        if q_end:
            y_end = int(q_end[1] * (self.dpi / 72))
        else:
            y_end = img.shape[0]
        
        # Crop with some padding
        padding = 20
        y_start = max(0, y_start - padding)
        y_end = min(img.shape[0], y_end + padding)
        
        cropped = img[y_start:y_end, :]
        return cropped
    
    def extract_answers_from_ms(self, ms_path: str) -> Dict[int, str]:
        """Extract answers from marking scheme"""
        doc = fitz.open(ms_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        
        answers = {}
        patterns = [
            r'(\d+)\s+([A-D])\b',
            r'(\d+)\s*\)\s*([A-D])',
            r'(\d+)\s*[:.]\s*([A-D])',
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                q_num = int(match.group(1))
                answer = match.group(2).upper()
                if 1 <= q_num <= 40:
                    answers[q_num] = answer
        
        self.log(f"Extracted {len(answers)} answers from marking scheme")
        return answers
    
    def parse_paper(self, qp_path: str, ms_path: str, paper_id: str) -> Dict:
        """
        Parse a Biology MCQ paper and generate image-based JSON
        """
        self.log(f"\n{'='*70}")
        self.log(f"Processing: {Path(qp_path).name}")
        self.log(f"{'='*70}")
        
        # Extract text with positions
        text_blocks = self.extract_text_with_positions(qp_path)
        
        # Find question pages
        question_pages = self.find_question_pages(qp_path)
        
        if len(question_pages) != 40:
            self.log(f"WARNING: Found {len(question_pages)} questions, expected 40")
        
        # Extract answers
        answers = self.extract_answers_from_ms(ms_path)
        
        # Process each question
        questions = []
        
        for q_num in range(1, 41):
            if q_num not in question_pages:
                self.log(f"WARNING: Question {q_num} not found")
                continue
            
            page_num = question_pages[q_num]
            
            # Convert page to image
            page_img = self.pdf_page_to_image(qp_path, page_num)
            
            # Crop question
            q_img = self.crop_question_from_page(page_img, text_blocks, q_num, page_num)
            
            if q_img is None:
                self.log(f"WARNING: Could not crop question {q_num}")
                continue
            
            # Save question image
            img_filename = f"q{q_num}.png"
            img_path = self.output_dir / img_filename
            cv2.imwrite(str(img_path), cv2.cvtColor(q_img, cv2.COLOR_RGB2BGR))
            
            # Find option positions
            options = self.find_option_positions(text_blocks, page_num)
            
            # Create question data
            question_data = {
                'questionNumber': q_num,
                'imageUrl': f"/images/biology/questions/{img_filename}?v=24",
                'correctAnswer': answers.get(q_num, None),
                'marks': 1,
                'optionPositions': {
                    letter: {'x': pos[0], 'y': pos[1]}
                    for letter, pos in options.items()
                }
            }
            
            questions.append(question_data)
            
            if q_num % 10 == 0:
                self.log(f"Processed {q_num}/40 questions...")
        
        # Create paper data
        parts = paper_id.split('_')
        paper_data = {
            'paperId': paper_id,
            'paperName': f"Biology Paper {parts[2]} - {parts[1].upper()}",
            'subject': "Biology",
            'syllabus': "0610",
            'year': 2000 + int(parts[1][1:]),
            'session': parts[1][0],
            'paper': parts[2],
            'totalQuestions': len(questions),
            'timeLimit': 2700,
            'questions': questions
        }
        
        self.log(f"\n[SUCCESS] Processed {len(questions)}/40 questions")
        return paper_data


def main():
    """Test the parser"""
    parser = BiologyImageMCQParser()
    
    # Test on one paper
    result = parser.parse_paper(
        'scripts/0610_m20_qp_22.pdf',
        'scripts/0610_m20_ms_22.pdf',
        '0610_m20_22'
    )
    
    # Save JSON
    output_path = 'public/papers/0610_m20_22_image.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SAVED] {output_path}")
    print(f"Total questions: {result['totalQuestions']}")


if __name__ == "__main__":
    main()

# Made with Bob
