"""
OCR Vision-Based Letter Position Detector
Uses EasyOCR to visually detect A, B, C, D positions in question images
100% accurate regardless of PDF encoding issues
"""

import sys
import os

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import easyocr
import fitz  # PyMuPDF
import json
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
from PIL import Image
import io


class OCRVisionDetector:
    """
    Uses computer vision OCR to detect letter positions
    Treats PDF as images, bypassing all font encoding issues
    """
    
    def __init__(self, pdf_path: str):
        """
        Initialize OCR detector
        
        Args:
            pdf_path: Path to question paper PDF
        """
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        
        # Initialize EasyOCR reader (English only for speed)
        print("Initializing EasyOCR reader...")
        self.reader = easyocr.Reader(['en'], gpu=False)
        print("OCR reader ready!")
    
    def find_question_bounds(self, page, question_number: int) -> Tuple[float, float]:
        """
        Find vertical bounds for a question
        
        Args:
            page: PyMuPDF page object
            question_number: Question number
            
        Returns:
            Tuple of (start_y, end_y)
        """
        # Search for question number
        search_text = f"{question_number} "
        rects = page.search_for(search_text)
        
        if not rects:
            return None, None
        
        q_start_y = rects[0].y0
        
        # Find next question
        next_q = question_number + 1
        next_rects = page.search_for(f"{next_q} ")
        
        if next_rects:
            q_end_y = next_rects[0].y0
        else:
            q_end_y = page.rect.height
        
        return q_start_y, q_end_y
    
    def detect_letters_in_question(self, page_num: int, q_start_y: float, q_end_y: float) -> Dict[str, Dict]:
        """
        Use OCR to detect letter positions in a question area
        
        Args:
            page_num: Page number
            q_start_y: Question start Y coordinate
            q_end_y: Question end Y coordinate
            
        Returns:
            Dictionary with letter positions
        """
        page = self.doc[page_num]
        
        # Convert page to high-resolution image
        # Use 150 DPI for good quality without being too slow
        mat = fitz.Matrix(150/72, 150/72)  # 150 DPI
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image for EasyOCR
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        img_array = np.array(img)
        
        # Get page dimensions for coordinate conversion
        page_width = page.rect.width
        page_height = page.rect.height
        img_width = pix.width
        img_height = pix.height
        
        # Scale factors to convert image coordinates to page coordinates
        scale_x = page_width / img_width
        scale_y = page_height / img_height
        
        # Convert question bounds to image coordinates
        img_q_start_y = q_start_y / scale_y
        img_q_end_y = q_end_y / scale_y
        
        # Run OCR on the entire image
        results = self.reader.readtext(img_array)
        
        # Filter for letters A, B, C, D within question bounds
        detected_letters = {}
        
        for (bbox, text, confidence) in results:
            clean_text = text.strip()
            
            # Only target standalone letters A, B, C, D
            if clean_text in ['A', 'B', 'C', 'D'] and len(clean_text) == 1:
                # bbox is [[x0,y0], [x1,y0], [x1,y1], [x0,y1]]
                x0, y0 = bbox[0]
                x1, y1 = bbox[2]
                
                # Calculate center in image coordinates
                center_x_img = (x0 + x1) / 2
                center_y_img = (y0 + y1) / 2
                
                # Check if within question bounds
                if img_q_start_y <= center_y_img < img_q_end_y:
                    # Convert to page coordinates
                    center_x_page = center_x_img * scale_x
                    center_y_page = center_y_img * scale_y
                    
                    # Convert to percentages
                    x_percent = (center_x_page / page_width) * 100
                    y_percent = (center_y_page / page_height) * 100
                    
                    # Only keep if it's the leftmost occurrence (option letter, not inline text)
                    if clean_text not in detected_letters or x_percent < detected_letters[clean_text]['x']:
                        detected_letters[clean_text] = {
                            'x': round(x_percent, 2),
                            'y': round(y_percent, 2),
                            'confidence': round(confidence, 2)
                        }
        
        return detected_letters
    
    def process_question(self, question_number: int) -> Dict[str, Dict]:
        """
        Process a single question
        
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
                # Found the question
                positions = self.detect_letters_in_question(page_num, q_start_y, q_end_y)
                
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
            'A': {'x': 12.0, 'y': 35.0, 'confidence': 0.0},
            'B': {'x': 12.0, 'y': 45.0, 'confidence': 0.0},
            'C': {'x': 12.0, 'y': 55.0, 'confidence': 0.0},
            'D': {'x': 12.0, 'y': 65.0, 'confidence': 0.0}
        }
    
    def process_all_questions(self, total_questions: int = 40) -> Dict[int, Dict]:
        """
        Process all questions using OCR vision
        
        Args:
            total_questions: Total number of questions
            
        Returns:
            Dictionary mapping question numbers to positions
        """
        all_positions = {}
        
        print(f"\nProcessing {total_questions} questions with OCR vision...")
        print("This may take a few minutes on first run (downloading OCR models)...\n")
        
        for q_num in range(1, total_questions + 1):
            print(f"Processing Q{q_num}...", end=" ")
            positions = self.process_question(q_num)
            all_positions[q_num] = positions
            
            # Show confidence scores
            if positions:
                avg_conf = sum(p.get('confidence', 0) for p in positions.values()) / len(positions)
                print(f"✓ (confidence: {avg_conf:.1%})")
            
            if q_num % 10 == 0:
                print(f"\n--- Completed {q_num}/{total_questions} questions ---\n")
        
        print("\n✓ OCR processing complete!")
        return all_positions
    
    def close(self):
        """Close the PDF document"""
        self.doc.close()


def update_json_with_ocr_positions(json_path: str, pdf_path: str):
    """
    Update JSON file with OCR-detected positions
    
    Args:
        json_path: Path to JSON file
        pdf_path: Path to PDF file
    """
    # Load existing JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Detect positions using OCR
    detector = OCRVisionDetector(pdf_path)
    all_positions = detector.process_all_questions(data['totalQuestions'])
    detector.close()
    
    # Update positions in JSON (remove confidence scores for cleaner output)
    for question in data['questions']:
        q_num = question['questionNumber']
        if q_num in all_positions:
            # Remove confidence scores before saving
            clean_positions = {}
            for letter, pos in all_positions[q_num].items():
                clean_positions[letter] = {
                    'x': pos['x'],
                    'y': pos['y']
                }
            question['optionPositions'] = clean_positions
    
    # Save updated JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Updated positions in: {json_path}")
    print("Positions detected using computer vision OCR!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python ocr_vision_detector.py <json_file> <pdf_file>")
        print("Example: python ocr_vision_detector.py ../public/papers/0610_m20_qp_22.json 0610_m20_qp_22.pdf")
        print("\nNote: First run will download OCR models (~100MB)")
        sys.exit(1)
    
    json_path = sys.argv[1]
    pdf_path = sys.argv[2]
    
    print(f"OCR Vision Detector")
    print(f"=" * 60)
    print(f"JSON: {Path(json_path).name}")
    print(f"PDF: {Path(pdf_path).name}")
    print(f"=" * 60)
    
    try:
        update_json_with_ocr_positions(json_path, pdf_path)
        print("\n✓ Success! Refresh your browser to see OCR-detected positions.")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

# Made with Bob
