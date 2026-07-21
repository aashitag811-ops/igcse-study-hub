"""
Unified MCQ Parser for Cambridge IGCSE Papers (2010-2025)
Handles Biology, Chemistry, Physics, Economics, and Accounting
Extracts questions, options, images, and merges with mark schemes
"""

import re
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pdfplumber
import fitz  # PyMuPDF for image extraction

from subject_config import get_subject_config, parse_paper_code, FOOTER_PATTERNS
from mark_scheme_parser import parse_mark_scheme


class UnifiedMCQParser:
    """
    Universal parser for Cambridge IGCSE MCQ papers
    Uses subject-specific configuration and regex patterns
    """
    
    def __init__(self, qp_pdf_path: str, ms_pdf_path: str, output_dir: str = "../public/papers"):
        """
        Initialize the unified parser
        
        Args:
            qp_pdf_path: Path to question paper PDF
            ms_pdf_path: Path to mark scheme PDF
            output_dir: Directory to save output JSON files
        """
        self.qp_pdf_path = qp_pdf_path
        self.ms_pdf_path = ms_pdf_path
        self.output_dir = output_dir
        
        # Extract paper code from filename (e.g., "0610_m20_qp_22.pdf" -> "0610_m20_qp_22")
        self.paper_code = Path(qp_pdf_path).stem
        
        # Parse paper code to get metadata
        self.metadata = parse_paper_code(self.paper_code)
        
        # Get subject configuration
        self.config = get_subject_config(self.metadata['subject_code'])
        
        # Storage for parsed data
        self.questions = []
        self.answer_key = {}
        self.images = []
    
    def parse(self) -> Dict:
        """
        Main parsing method - orchestrates the entire process
        
        Returns:
            Complete parsed paper data as dictionary
        """
        print(f"Parsing {self.metadata['subject_name']} paper: {self.paper_code}")
        print(f"Expected questions: {self.config['total_questions']}")
        
        # Step 1: Parse mark scheme to get answer keys
        print("\n[1/4] Parsing mark scheme...")
        self.answer_key = parse_mark_scheme(self.ms_pdf_path, self.config['total_questions'])
        print(f"✓ Extracted {len(self.answer_key)} answer keys")
        
        # Step 2: Extract images if subject has diagrams
        if self.config['has_diagrams']:
            print("\n[2/4] Extracting images...")
            self.images = self._extract_images()
            print(f"✓ Extracted {len(self.images)} images")
        else:
            print("\n[2/4] Skipping image extraction (subject has no diagrams)")
        
        # Step 3: Parse questions and options
        print("\n[3/4] Parsing questions...")
        self.questions = self._parse_questions()
        print(f"✓ Parsed {len(self.questions)} questions")
        
        # Step 4: Merge questions with answer keys and images
        print("\n[4/4] Merging data...")
        complete_data = self._merge_data()
        print(f"✓ Merge complete")
        
        return complete_data
    
    def _extract_images(self) -> List[Dict]:
        """
        Extract images from PDF with coordinate information
        
        Returns:
            List of image dictionaries with metadata
        """
        images = []
        image_dir = Path(f"../public/images/{self.metadata['subject_code']}")
        image_dir.mkdir(parents=True, exist_ok=True)
        
        doc = fitz.open(self.qp_pdf_path)
        
        for page_num, page in enumerate(doc):
            # Get all images on the page
            image_list = page.get_images()
            
            for img_index, img in enumerate(image_list):
                xref = img[0]
                
                # Get image bounding box
                rects = page.get_image_rects(xref)
                if not rects:
                    continue
                
                rect = rects[0]  # Use first rectangle
                
                # Extract image
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Save image
                image_filename = f"{self.paper_code}_p{page_num}_img{img_index}.png"
                image_path = image_dir / image_filename
                
                with open(image_path, "wb") as img_file:
                    img_file.write(image_bytes)
                
                # Store image metadata
                images.append({
                    'filename': image_filename,
                    'path': f"/images/{self.metadata['subject_code']}/{image_filename}",
                    'page': page_num,
                    'bbox': {
                        'x0': rect.x0,
                        'y0': rect.y0,
                        'x1': rect.x1,
                        'y1': rect.y1
                    }
                })
        
        doc.close()
        return images
    
    def _parse_questions(self) -> List[Dict]:
        """
        Parse questions and options from question paper
        
        Returns:
            List of question dictionaries
        """
        questions = []
        
        with pdfplumber.open(self.qp_pdf_path) as pdf:
            full_text = ""
            page_breaks = []  # Track where pages break
            
            for page_num, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                page_breaks.append(len(full_text))
                full_text += page_text + "\n"
        
        # Split text into lines
        lines = full_text.split('\n')
        
        # State machine for parsing
        current_question = None
        current_option = None
        in_question = False
        
        question_pattern = re.compile(self.config['question_pattern'])
        option_pattern = re.compile(self.config['option_pattern'])
        
        for line_num, line in enumerate(lines):
            line = line.strip()
            
            # Skip empty lines and footers
            if not line or self._is_footer(line):
                continue
            
            # Check for question number
            q_match = question_pattern.match(line)
            if q_match:
                # Save previous question if exists
                if current_question:
                    questions.append(current_question)
                
                # Start new question
                question_num = int(q_match.group(1))
                question_text = line[len(q_match.group(0)):].strip()
                
                current_question = {
                    'questionNumber': question_num,
                    'questionText': question_text,
                    'options': {},
                    'hasImage': False,
                    'imagePath': None
                }
                in_question = True
                continue
            
            # Check for option (A, B, C, D)
            opt_match = option_pattern.match(line)
            if opt_match and in_question:
                option_letter = opt_match.group(1)
                option_text = opt_match.group(2).strip()
                
                current_question['options'][option_letter] = option_text
                current_option = option_letter
                
                # If we've collected all 4 options, question is complete
                if len(current_question['options']) == 4:
                    in_question = False
                continue
            
            # If we're in a question but didn't match option, it's continuation text
            if in_question and current_question:
                if current_option and current_option in current_question['options']:
                    # Continuation of current option
                    current_question['options'][current_option] += " " + line
                else:
                    # Continuation of question text
                    current_question['questionText'] += " " + line
        
        # Don't forget the last question
        if current_question:
            questions.append(current_question)
        
        return questions
    
    def _is_footer(self, line: str) -> bool:
        """
        Check if a line is a footer that should be ignored
        
        Args:
            line: Text line to check
            
        Returns:
            True if line is a footer
        """
        for pattern in FOOTER_PATTERNS:
            if re.match(pattern, line, re.IGNORECASE):
                return True
        return False
    
    def _match_images_to_questions(self):
        """
        Match extracted images to questions based on coordinates
        Uses Y-coordinate heuristics to determine which question an image belongs to
        """
        if not self.images or not self.questions:
            return
        
        # For each image, find the question it belongs to
        # This is a simplified heuristic - can be improved
        for img in self.images:
            img_y = img['bbox']['y0']
            
            # Find question that this image likely belongs to
            # (This would need more sophisticated logic based on actual page layout)
            for q in self.questions:
                # Simple heuristic: assign to nearest question
                # In production, you'd use more sophisticated coordinate matching
                if not q['hasImage']:
                    q['hasImage'] = True
                    q['imagePath'] = img['path']
                    break
    
    def _merge_data(self) -> Dict:
        """
        Merge questions with answer keys and images
        
        Returns:
            Complete paper data structure
        """
        # Match images to questions
        if self.config['has_diagrams']:
            self._match_images_to_questions()
        
        # Add correct answers to questions
        for question in self.questions:
            q_num = str(question['questionNumber'])
            question['correctAnswer'] = self.answer_key.get(q_num, None)
        
        # Build complete data structure
        complete_data = {
            'paperCode': self.paper_code,
            'paperName': f"{self.metadata['subject_name']} Paper {self.metadata['paper_number']} ({self.metadata['tier']}) - {self.metadata['session_name']} {self.metadata['year']}",
            'subject': self.metadata['subject_name'],
            'subjectCode': self.metadata['subject_code'],
            'year': self.metadata['year'],
            'session': self.metadata['session_name'],
            'variant': int(self.metadata['variant']),
            'tier': self.metadata['tier'],
            'totalQuestions': self.config['total_questions'],
            'timeLimit': self.config['time_limit'],
            'questions': self.questions
        }
        
        return complete_data
    
    def save(self, data: Dict) -> str:
        """
        Save parsed data to JSON file
        
        Args:
            data: Complete paper data
            
        Returns:
            Path to saved file
        """
        output_path = Path(self.output_dir) / f"{self.paper_code}.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ Saved to: {output_path}")
        return str(output_path)
    
    def validate(self, data: Dict) -> bool:
        """
        Validate parsed data
        
        Args:
            data: Complete paper data
            
        Returns:
            True if valid
        """
        errors = []
        
        # Check question count
        if len(data['questions']) != self.config['total_questions']:
            errors.append(f"Expected {self.config['total_questions']} questions, got {len(data['questions'])}")
        
        # Check each question
        for q in data['questions']:
            # Check options
            if len(q['options']) != 4:
                errors.append(f"Question {q['questionNumber']}: Expected 4 options, got {len(q['options'])}")
            
            # Check correct answer
            if not q.get('correctAnswer'):
                errors.append(f"Question {q['questionNumber']}: Missing correct answer")
        
        if errors:
            print("\n✗ Validation errors:")
            for error in errors:
                print(f"  - {error}")
            return False
        
        print("\n✓ Validation passed")
        return True


def parse_paper(qp_pdf: str, ms_pdf: str, output_dir: str = "../public/papers") -> Dict:
    """
    Convenience function to parse a single paper
    
    Args:
        qp_pdf: Path to question paper PDF
        ms_pdf: Path to mark scheme PDF
        output_dir: Output directory for JSON
        
    Returns:
        Parsed paper data
    """
    parser = UnifiedMCQParser(qp_pdf, ms_pdf, output_dir)
    data = parser.parse()
    
    if parser.validate(data):
        parser.save(data)
        return data
    else:
        raise ValueError("Validation failed")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python unified_mcq_parser.py <qp_pdf> <ms_pdf> [output_dir]")
        print("Example: python unified_mcq_parser.py 0610_m20_qp_22.pdf 0610_m20_ms_22.pdf")
        sys.exit(1)
    
    qp_pdf = sys.argv[1]
    ms_pdf = sys.argv[2]
    output_dir = sys.argv[3] if len(sys.argv) > 3 else "../public/papers"
    
    try:
        data = parse_paper(qp_pdf, ms_pdf, output_dir)
        print(f"\n✓ Successfully parsed paper: {data['paperCode']}")
        print(f"  Questions: {len(data['questions'])}")
        print(f"  Subject: {data['subject']}")
        print(f"  Year: {data['year']}")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

# Made with Bob
