"""
Smart Position Detector for MCQ Circles
Intelligently places clickable circles to the left of options, handling both:
- Text-based options (A, B, C, D with text)
- Table-based options (A, B, C, D in table rows)
"""

import fitz  # PyMuPDF
import json
from pathlib import Path
from typing import Dict, List, Tuple
import re


class SmartPositionDetector:
    """
    Detects optimal positions for clickable circles in MCQ questions
    """
    
    def __init__(self, pdf_path: str):
        """
        Initialize detector with PDF path
        
        Args:
            pdf_path: Path to the question paper PDF
        """
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
    
    def detect_question_positions(self, question_number: int) -> Dict[str, Dict[str, float]]:
        """
        Detect positions for a specific question
        
        Args:
            question_number: Question number (1-40)
            
        Returns:
            Dictionary with positions for A, B, C, D
        """
        # Find the page containing this question
        page_num, question_rect = self._find_question_on_page(question_number)
        
        if page_num is None:
            print(f"Warning: Could not find question {question_number}")
            return self._get_default_positions()
        
        page = self.doc[page_num]
        page_height = page.rect.height
        page_width = page.rect.width
        
        # Search for option letters A, B, C, D
        option_positions = {}
        
        for letter in ['A', 'B', 'C', 'D']:
            # Search for the letter in the question area
            rects = page.search_for(letter, clip=question_rect)
            
            if rects:
                # Find the leftmost occurrence (this is likely the option letter)
                leftmost_rect = min(rects, key=lambda r: r.x0)
                
                # Calculate center position
                center_x = leftmost_rect.x0 + (leftmost_rect.x1 - leftmost_rect.x0) / 2
                center_y = leftmost_rect.y0 + (leftmost_rect.y1 - leftmost_rect.y0) / 2
                
                # Convert to percentages
                x_percent = (center_x / page_width) * 100
                y_percent = (center_y / page_height) * 100
                
                option_positions[letter] = {
                    'x': round(x_percent, 2),
                    'y': round(y_percent, 2)
                }
        
        # If we found all 4 options, apply smart positioning
        if len(option_positions) == 4:
            return self._apply_smart_positioning(option_positions, page_width)
        else:
            print(f"Warning: Only found {len(option_positions)} options for Q{question_number}")
            return self._get_default_positions()
    
    def _apply_smart_positioning(self, positions: Dict, page_width: float) -> Dict[str, Dict[str, float]]:
        """
        Apply smart positioning logic to avoid overlapping with letters
        
        Args:
            positions: Raw detected positions
            page_width: Page width in points
            
        Returns:
            Adjusted positions
        """
        # Find the leftmost X position among all options
        min_x = min(pos['x'] for pos in positions.values())
        
        # Calculate the target X position (to the left of the leftmost letter)
        # We want circles to be about 3-4% to the left of the letters
        target_x = max(8.0, min_x - 3.5)  # Minimum 8% from left edge
        
        # Apply the target X to all options
        adjusted_positions = {}
        for letter, pos in positions.items():
            adjusted_positions[letter] = {
                'x': round(target_x, 2),
                'y': pos['y']  # Keep Y position as detected
            }
        
        return adjusted_positions
    
    def _find_question_on_page(self, question_number: int) -> Tuple[int, fitz.Rect]:
        """
        Find which page contains a question and its bounding rectangle
        
        Args:
            question_number: Question number to find
            
        Returns:
            Tuple of (page_number, question_rect) or (None, None)
        """
        # Search for question number pattern (e.g., "1 ", "2 ", etc.)
        search_pattern = f"{question_number} "
        
        for page_num, page in enumerate(self.doc):
            # Search for the question number
            rects = page.search_for(search_pattern)
            
            if rects:
                # Found the question - estimate its bounding box
                # Assume question extends from this point to next question or end of page
                question_start = rects[0]
                
                # Try to find the next question number
                next_question = question_number + 1
                next_rects = page.search_for(f"{next_question} ")
                
                if next_rects:
                    # Question ends where next question starts
                    question_end_y = next_rects[0].y0
                else:
                    # Last question on page - extends to bottom
                    question_end_y = page.rect.height
                
                # Create bounding rectangle for this question
                question_rect = fitz.Rect(
                    0,  # Left edge
                    question_start.y0,  # Top of question
                    page.rect.width,  # Right edge
                    question_end_y  # Bottom of question
                )
                
                return page_num, question_rect
        
        return None, None
    
    def _get_default_positions(self) -> Dict[str, Dict[str, float]]:
        """
        Get default positions if detection fails
        
        Returns:
            Default position dictionary
        """
        return {
            'A': {'x': 8.0, 'y': 35.0},
            'B': {'x': 8.0, 'y': 45.0},
            'C': {'x': 8.0, 'y': 55.0},
            'D': {'x': 8.0, 'y': 65.0}
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
        
        print(f"Processing {total_questions} questions...")
        
        for q_num in range(1, total_questions + 1):
            positions = self.detect_question_positions(q_num)
            all_positions[q_num] = positions
            
            if q_num % 10 == 0:
                print(f"  Processed {q_num}/{total_questions} questions")
        
        print("Completed processing all questions")
        return all_positions
    
    def close(self):
        """Close the PDF document"""
        self.doc.close()


def update_json_with_positions(json_path: str, pdf_path: str):
    """
    Update an existing JSON file with corrected positions
    
    Args:
        json_path: Path to the JSON file to update
        pdf_path: Path to the PDF file
    """
    # Load existing JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Detect positions
    detector = SmartPositionDetector(pdf_path)
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


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python smart_position_detector.py <json_file> <pdf_file>")
        print("Example: python smart_position_detector.py ../public/papers/0610_m20_qp_22.json 0610_m20_qp_22.pdf")
        sys.exit(1)
    
    json_path = sys.argv[1]
    pdf_path = sys.argv[2]
    
    print(f"Updating positions for: {Path(json_path).name}")
    print(f"Using PDF: {Path(pdf_path).name}\n")
    
    try:
        update_json_with_positions(json_path, pdf_path)
        print("\nSuccess! Refresh your browser to see the updated positions.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

# Made with Bob
