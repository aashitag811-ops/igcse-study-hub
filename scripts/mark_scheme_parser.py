"""
Mark Scheme Parser for Cambridge IGCSE MCQ Papers
Handles both Layout Type A (Matrix Grid) and Layout Type B (Single Column List)
Supports papers from 2010 to 2025
"""

import re
from typing import Dict, Optional
import pdfplumber

class MarkSchemeParser:
    """
    Parser for Cambridge IGCSE Mark Schemes
    Extracts answer keys from both old (matrix) and new (list) formats
    """
    
    def __init__(self, pdf_path: str):
        """
        Initialize the mark scheme parser
        
        Args:
            pdf_path: Path to the mark scheme PDF file
        """
        self.pdf_path = pdf_path
        self.answer_key = {}
    
    def parse(self) -> Dict[str, str]:
        """
        Parse the mark scheme and extract answer keys
        
        Returns:
            Dictionary mapping question numbers to correct answers
            Example: {"1": "A", "2": "B", "3": "D", ...}
        """
        with pdfplumber.open(self.pdf_path) as pdf:
            # Extract text from all pages
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() + "\n"
        
        # Try Layout Type B first (modern format - easier to parse)
        answer_key = self._parse_layout_b(full_text)
        
        # If Layout B fails, try Layout A (matrix format)
        if not answer_key or len(answer_key) < 10:
            answer_key = self._parse_layout_a(full_text)
        
        self.answer_key = answer_key
        return answer_key
    
    def _parse_layout_b(self, text: str) -> Dict[str, str]:
        """
        Parse Layout Type B: Single Column List (2018-2025)
        
        Format:
        Question Number    Key
              1             A
              2             C
              3             D
        
        Args:
            text: Full text extracted from PDF
            
        Returns:
            Dictionary of question number to answer
        """
        answer_key = {}
        
        # Pattern to match question number and answer
        # Matches lines like: "1    A" or "  1    A" or "1             A"
        pattern = r'^\s*(\d{1,2})\s+([A-D])\s*$'
        
        lines = text.split('\n')
        for line in lines:
            match = re.match(pattern, line.strip())
            if match:
                question_num = match.group(1)
                answer = match.group(2)
                answer_key[question_num] = answer
        
        return answer_key
    
    def _parse_layout_a(self, text: str) -> Dict[str, str]:
        """
        Parse Layout Type A: Matrix Grid (2010-2017)
        
        Format:
        1  A      11  C      21  D      31  B
        2  B      12  A      22  A      32  C
        3  D      13  B      23  C      33  A
        
        Args:
            text: Full text extracted from PDF
            
        Returns:
            Dictionary of question number to answer
        """
        answer_key = {}
        
        # Pattern to match multiple question-answer pairs on a single line
        # Matches patterns like: "1  A" or "11  C" or "21  D"
        pattern = r'(\d{1,2})\s+([A-D])'
        
        lines = text.split('\n')
        for line in lines:
            # Find all question-answer pairs in the line
            matches = re.findall(pattern, line)
            for match in matches:
                question_num = match[0]
                answer = match[1]
                answer_key[question_num] = answer
        
        return answer_key
    
    def _parse_hybrid_format(self, text: str) -> Dict[str, str]:
        """
        Parse hybrid or irregular formats
        Some mark schemes have mixed layouts or special formatting
        
        Args:
            text: Full text extracted from PDF
            
        Returns:
            Dictionary of question number to answer
        """
        answer_key = {}
        
        # More flexible pattern that catches various formats
        # Looks for any digit(s) followed by whitespace and a letter A-D
        pattern = r'(?:^|\s)(\d{1,2})\s+([A-D])(?:\s|$)'
        
        matches = re.findall(pattern, text, re.MULTILINE)
        for match in matches:
            question_num = match[0]
            answer = match[1]
            answer_key[question_num] = answer
        
        return answer_key
    
    def validate_answer_key(self, expected_questions: int) -> bool:
        """
        Validate that the answer key has the expected number of questions
        
        Args:
            expected_questions: Expected number of questions (e.g., 40 for sciences)
            
        Returns:
            True if answer key is valid, False otherwise
        """
        if not self.answer_key:
            return False
        
        # Check if we have the right number of questions
        if len(self.answer_key) != expected_questions:
            print(f"Warning: Expected {expected_questions} questions, found {len(self.answer_key)}")
            return False
        
        # Check if all question numbers are present (1 to expected_questions)
        expected_nums = set(str(i) for i in range(1, expected_questions + 1))
        actual_nums = set(self.answer_key.keys())
        
        missing = expected_nums - actual_nums
        if missing:
            print(f"Warning: Missing question numbers: {sorted(missing, key=int)}")
            return False
        
        # Check if all answers are valid (A, B, C, or D)
        valid_answers = {'A', 'B', 'C', 'D'}
        invalid = [q for q, a in self.answer_key.items() if a not in valid_answers]
        if invalid:
            print(f"Warning: Invalid answers for questions: {invalid}")
            return False
        
        return True
    
    def get_answer(self, question_number: int) -> Optional[str]:
        """
        Get the correct answer for a specific question
        
        Args:
            question_number: Question number (1-based)
            
        Returns:
            Correct answer letter (A, B, C, or D) or None if not found
        """
        return self.answer_key.get(str(question_number))
    
    def export_json(self) -> Dict[str, str]:
        """
        Export answer key as JSON-compatible dictionary
        
        Returns:
            Dictionary with string keys and values
        """
        return self.answer_key


def parse_mark_scheme(pdf_path: str, expected_questions: int = 40) -> Dict[str, str]:
    """
    Convenience function to parse a mark scheme PDF
    
    Args:
        pdf_path: Path to the mark scheme PDF
        expected_questions: Expected number of questions
        
    Returns:
        Dictionary mapping question numbers to answers
        
    Raises:
        ValueError: If parsing fails or validation fails
    """
    parser = MarkSchemeParser(pdf_path)
    answer_key = parser.parse()
    
    if not answer_key:
        raise ValueError(f"Failed to parse mark scheme: {pdf_path}")
    
    if not parser.validate_answer_key(expected_questions):
        raise ValueError(f"Invalid answer key in mark scheme: {pdf_path}")
    
    return answer_key


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python mark_scheme_parser.py <path_to_ms.pdf> [expected_questions]")
        print("Example: python mark_scheme_parser.py 0610_m20_ms_22.pdf 40")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    expected_questions = int(sys.argv[2]) if len(sys.argv) > 2 else 40
    
    print(f"Parsing mark scheme: {pdf_path}")
    print(f"Expected questions: {expected_questions}\n")
    
    try:
        parser = MarkSchemeParser(pdf_path)
        answer_key = parser.parse()
        
        print(f"✓ Successfully parsed {len(answer_key)} answers\n")
        
        # Display answer key in a formatted way
        print("Answer Key:")
        print("-" * 40)
        
        # Display in columns (10 per row)
        for i in range(1, expected_questions + 1):
            answer = answer_key.get(str(i), "?")
            print(f"Q{i:2d}: {answer}", end="  ")
            if i % 10 == 0:
                print()  # New line every 10 questions
        
        print("\n" + "-" * 40)
        
        # Validate
        is_valid = parser.validate_answer_key(expected_questions)
        if is_valid:
            print("✓ Answer key is valid!")
        else:
            print("✗ Answer key validation failed!")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

# Made with Bob
