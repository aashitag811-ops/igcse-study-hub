y"""
Precise Letter Position Detector
Uses character-level extraction from PyMuPDF to get exact bounding boxes
for individual letters A, B, C, D in MCQ questions
"""

import fitz  # PyMuPDF
import json
from pathlib import Path
from typing import Dict, List, Tuple


class PreciseLetterDetector:
    """
    Extracts precise character-level coordinates for option letters
    """
    
    def __init__(self, pdf_path: str):
        """
        Initialize detector
        
        Args:
            pdf_path: Path to question paper PDF
        """
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
    
    def find_question_bounds(self, page, question_number: int) -> Tuple[float, float]:
        """
        Find vertical bounds (Y coordinates) for a specific question
        
        Args:
            page: PyMuPDF page object
            question_number: Question number to find
            
        Returns:
            Tuple of (start_y, end_y) in page coordinates
        """
        # Search for question number
        search_text = f"{question_number} "
        rects = page.search_for(search_text)
        
        if not rects:
            return None, None
        
        # Get Y coordinate of question start
        q_start_y = rects[0].y0
        
        # Try to find next question
        next_q = question_number + 1
        next_rects = page.search_for(f"{next_q} ")
        
        if next_rects:
            q_end_y = next_rects[0].y0
        else:
            # Last question on page
            q_end_y = page.rect.height
        
        return q_start_y, q_end_y
    
    def extract_letter_positions(self, page, q_start_y: float, q_end_y: float) -> Dict[str, Dict]:
        """
        Extract precise positions for letters A, B, C, D using character-level data
        
        Args:
            page: PyMuPDF page object
            q_start_y: Question start Y coordinate
            q_end_y: Question end Y coordinate
            
        Returns:
            Dictionary with letter positions
        """
        letter_positions = {}
        
        # Get character-level data using rawdict
        page_data = page.get_text("rawdict")
        
        # Track all found letters with their X positions to filter out inline text
        found_letters = []
        
        for block in page_data["blocks"]:
            if "lines" not in block:
                continue
            
            for line in block["lines"]:
                for span in line["spans"]:
                    for char in span["chars"]:
                        char_text = char["c"].strip()
                        char_bbox = char["bbox"]
                        char_y = char_bbox[1]
                        char_x = char_bbox[0]
                        
                        # Check if character is within question bounds
                        if q_start_y <= char_y < q_end_y:
                            # Check if it's one of our target letters
                            if char_text in ['A', 'B', 'C', 'D']:
                                found_letters.append({
                                    'letter': char_text,
                                    'x': char_x,
                                    'y': char_y,
                                    'bbox': char_bbox,
                                    'span_text': ''.join([c["c"] for c in span["chars"]])
                                })
        
        # Filter to get only the option letters (leftmost occurrences)
        # Group by letter and take the leftmost X position for each
        for letter in ['A', 'B', 'C', 'D']:
            letter_instances = [l for l in found_letters if l['letter'] == letter]
            
            if letter_instances:
                # Find the leftmost instance (likely the option letter, not inline text)
                leftmost = min(letter_instances, key=lambda x: x['x'])
                
                # Additional filter: check if it's relatively isolated (not in middle of long text)
                # If the span contains many characters, it's likely inline text
                if len(leftmost['span_text'].strip()) <= 3:  # Isolated letter or short label
                    bbox = leftmost['bbox']
                    
                    # Calculate center point
                    center_x = (bbox[0] + bbox[2]) / 2
                    center_y = (bbox[1] + bbox[3]) / 2
                    
                    # Convert to percentages
                    page_width = page.rect.width
                    page_height = page.rect.height
                    
                    letter_positions[letter] = {
                        'x': round((center_x / page_width) * 100, 2),
                        'y': round((center_y / page_height) * 100, 2),
                        'bbox_abs': {
                            'x0': round(bbox[0], 2),
                            'y0': round(bbox[1], 2),
                            'x1': round(bbox[2], 2),
                            'y1': round(bbox[3], 2)
                        }
                    }
        
        return letter_positions
    
    def process_question(self, question_number: int) -> Dict[str, Dict]:
        """
        Process a single question and extract letter positions
        
        Args:
            question_number: Question number
            
        Returns:
            Dictionary with letter positions
        """
        # Find which page contains this question
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            q_start_y, q_end_y = self.find_question_bounds(page, question_number)
            
            if q_start_y is not None:
                # Found the question on this page
                positions = self.extract_letter_positions(page, q_start_y, q_end_y)
                
                if len(positions) == 4:
                    return positions
                else:
                    print(f"  Warning: Q{question_number} - Found {len(positions)}/4 letters")
                    return positions
        
        print(f"  Warning: Q{question_number} - Not found")
        return self._get_default_positions()
    
    def _get_default_positions(self) -> Dict[str, Dict]:
        """Get default positions if detection fails"""
        return {
            'A': {'x': 12.0, 'y': 35.0},
            'B': {'x': 12.0, 'y': 45.0},
            'C': {'x': 12.0, 'y': 55.0},
            'D': {'x': 12.0, 'y': 65.0}
        }
    
    def process_all_questions(self, total_questions: int = 40) -> Dict[int, Dict]:
        """
        Process all questions in the paper
        
        Args:
            total_questions: Total number of questions
            
        Returns:
            Dictionary mapping question numbers to positions
        """
        all_positions = {}
        
        print(f"Processing {total_questions} questions with character-level precision...")
        
        for q_num in range(1, total_questions + 1):
            positions = self.process_question(q_num)
            all_positions[q_num] = positions
            
            if q_num % 10 == 0:
                print(f"  Processed {q_num}/{total_questions} questions")
        
        print("Completed processing")
        return all_positions
    
    def close(self):
        """Close the PDF document"""
        self.doc.close()


def update_json_with_precise_positions(json_path: str, pdf_path: str):
    """
    Update JSON file with precisely detected positions
    
    Args:
        json_path: Path to JSON file
        pdf_path: Path to PDF file
    """
    # Load existing JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Detect positions
    detector = PreciseLetterDetector(pdf_path)
    all_positions = detector.process_all_questions(data['totalQuestions'])
    detector.close()
    
    # Update positions in JSON
    for question in data['questions']:
        q_num = question['questionNumber']
        if q_num in all_positions:
            question['optionPositions'] = all_positions[q_num]
    
    # Save updated JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nUpdated positions in: {json_path}")
    print("Positions now use character-level precision!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python precise_letter_detector.py <json_file> <pdf_file>")
        print("Example: python precise_letter_detector.py ../public/papers/0610_m20_qp_22.json 0610_m20_qp_22.pdf")
        sys.exit(1)
    
    json_path = sys.argv[1]
    pdf_path = sys.argv[2]
    
    print(f"Detecting precise letter positions for: {Path(json_path).name}")
    print(f"Using PDF: {Path(pdf_path).name}\n")
    
    try:
        update_json_with_precise_positions(json_path, pdf_path)
        print("\nSuccess! Refresh your browser to see pixel-perfect circles.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

# Made with Bob
