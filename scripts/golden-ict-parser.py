"""
Golden ICT Parser - Simple, Clean PDF Extraction
Based on the reference code that produces clean, working JSON files.
Focuses on: text, mcq, paired_list, numbered_list, essay question types.
"""

import pdfplumber
import re
import json
import sys
from pathlib import Path

class GoldenICTParser:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        # CONTENT ZONE: Strictly excludes margins where "UCLES" and "Do not write" live
        self.content_bbox = (65, 90, 530, 770)
        
    def clean_text(self, text):
        """Removes administrative noise and fixes word-joining/kerning."""
        if not text:
            return text
            
        # 1. Scrub Copyright and Page Codes
        noise_patterns = [
            r"UCLES 20\d{2}",
            r"\[Turn over\]",
            r"DO NOT WRITE IN THIS MARGIN",
            r"\d{2}0417\d{2}\d{4}\d\.\d+",
            r"--- PAGE \d+ ---",
            r"©\s*Cambridge.*?(?=\n|$)",
            r"Permission to reproduce.*",
            r"Cambridge Assessment.*",
            r"University of Cambridge Local Examinations Syndicate.*",
            r"www\.cambridgeinternational\.org.*",
            r"www\.dynamicpapers\.com.*",
            r"Question \d+ (?:starts|is) on page \d+",
            r"\*\s*\d{7,}\s*\*",
        ]
        for p in noise_patterns:
            text = re.sub(p, "", text, flags=re.IGNORECASE)
        
        # 2. Fix Joined Words (e.g., 'devicesRAM' -> 'devices RAM')
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        
        # 3. Fix Number-Word joins (e.g., '1Method' -> '1 Method')
        text = re.sub(r'(\d)([A-Za-z])', r'\1 \2', text)
        
        # 4. Fix common OCR errors
        text = text.replace('process in g', 'processing')
        text = text.replace('word process in g', 'word processing')
        text = text.replace('format t in g', 'formatting')
        text = text.replace('in ternal', 'internal')
        text = text.replace('orig in al', 'original')
        text = text.replace('im age', 'image')
        text = text.replace('Blue to oth', 'Bluetooth')
        text = text.replace('Wi Fi', 'WiFi')
        
        # 5. Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\s+([.,;:!?\)])', r'\1', text)
        
        return text.strip()

    def detect_type(self, text, marks):
        """Determines the UI component to render."""
        text_lower = text.lower()
        
        # 1. Selection (Circle questions)
        if "circle" in text_lower:
            return "mcq"
        
        # 2. Paired List (Method + Description / Rule + Example)
        if any(word in text for word in ["Method", "Benefit", "Drawback", "Rule", "Feature"]):
            if re.search(r'(Method|Benefit|Rule|Feature)\s*1', text):
                return "paired_list"
        
        # 3. Numbered Lists (1, 2, 3...)
        if re.search(r'\n1\s*\n2', text) or re.search(r'\n1\.\s*\n2\.', text):
            return "numbered_list"
        
        # 4. Essay (High marks + Command words)
        if marks and marks >= 4 and any(word in text_lower for word in ["explain", "describe", "discuss"]):
            return "essay"
        
        # Default: simple text answer
        return "text"

    def extract_options(self, text):
        """Extract options from Circle/Tick questions."""
        options = []
        # Look for lines that are likely options (capitalized words/phrases)
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            # Skip question text and marks
            if '[' in line or 'Circle' in line or 'Tick' in line:
                continue
            # Options are usually short, capitalized phrases
            if line and len(line) < 50 and line[0].isupper():
                options.append(line)
        return options

    def parse_question_block(self, block, question_num):
        """Parse a single question block into structured format."""
        clean_content = self.clean_text(block)
        
        # Extract marks
        marks_match = re.search(r'\[(\d+)\]', block)
        marks = int(marks_match.group(1)) if marks_match else None
        
        # Check for sub-parts (a), (b), (c)
        sub_parts = re.split(r'\n\s*\(([a-z])\)', block)
        
        if len(sub_parts) > 1:
            # Has sub-parts
            main_text = self.clean_text(sub_parts[0])
            subparts = []
            
            for i in range(1, len(sub_parts), 2):
                letter = sub_parts[i]
                content = sub_parts[i + 1] if i + 1 < len(sub_parts) else ""
                
                # Extract marks for this sub-part
                sub_marks_match = re.search(r'\[(\d+)\]', content)
                sub_marks = int(sub_marks_match.group(1)) if sub_marks_match else None
                
                # Remove marks from text
                sub_text = re.sub(r'\[\d+\]', '', content).strip()
                sub_text = self.clean_text(sub_text)
                
                # Detect type
                q_type = self.detect_type(content, sub_marks)
                
                sub_question = {
                    "number": letter,
                    "text": sub_text,
                    "marks": sub_marks,
                    "type": q_type
                }
                
                # Extract options if MCQ
                if q_type == "mcq":
                    options = self.extract_options(content)
                    if options:
                        sub_question["options"] = options
                        # Estimate max selections (usually marks = selections)
                        if sub_marks:
                            sub_question["maxSelections"] = sub_marks
                
                # Check for nested sub-parts (i), (ii)
                nested_parts = re.split(r'\n\s*\(([ivx]+)\)', content)
                if len(nested_parts) > 1:
                    nested_subparts = []
                    for j in range(1, len(nested_parts), 2):
                        roman = nested_parts[j]
                        nested_content = nested_parts[j + 1] if j + 1 < len(nested_parts) else ""
                        
                        nested_marks_match = re.search(r'\[(\d+)\]', nested_content)
                        nested_marks = int(nested_marks_match.group(1)) if nested_marks_match else None
                        
                        nested_text = re.sub(r'\[\d+\]', '', nested_content).strip()
                        nested_text = self.clean_text(nested_text)
                        
                        nested_question = {
                            "number": roman,
                            "text": nested_text,
                            "marks": nested_marks,
                            "type": self.detect_type(nested_content, nested_marks)
                        }
                        nested_subparts.append(nested_question)
                    
                    sub_question["subparts"] = nested_subparts
                    sub_question["marks"] = None  # Parent has no marks
                
                subparts.append(sub_question)
            
            return {
                "number": str(question_num),
                "text": main_text,
                "marks": None,  # Parent question has no marks
                "subparts": subparts
            }
        else:
            # No sub-parts, standalone question
            text = re.sub(r'\[\d+\]', '', clean_content).strip()
            q_type = self.detect_type(block, marks)
            
            question = {
                "number": str(question_num),
                "text": text,
                "marks": marks,
                "type": q_type
            }
            
            # Extract options if MCQ
            if q_type == "mcq":
                options = self.extract_options(block)
                if options:
                    question["options"] = options
                    if marks:
                        question["maxSelections"] = marks
            
            return question

    def parse(self):
        """Parse the entire PDF into structured JSON."""
        questions = []
        current_question_num = 0
        
        with pdfplumber.open(self.pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Skip first page (instructions)
                if page_num == 0:
                    continue
                
                # Extract text from content area only
                content = page.within_bbox(self.content_bbox).extract_text(x_tolerance=3)
                if not content:
                    continue
                
                # Split by question numbers (e.g., "1 ", "12 ")
                blocks = re.split(r'\n(?=\d{1,2}\s+)', content)
                
                for block in blocks:
                    # Check if this is a new question
                    q_match = re.match(r'^(\d{1,2})\s+', block.strip())
                    if q_match:
                        current_question_num = int(q_match.group(1))
                        question = self.parse_question_block(block, current_question_num)
                        if question:
                            questions.append(question)
        
        # Extract metadata from filename
        filename = Path(self.pdf_path).stem
        parts = filename.split('_')
        
        # Try to parse filename like: 0417_s21_qp_12
        subject_code = parts[0] if len(parts) > 0 else "0417"
        season_year = parts[1] if len(parts) > 1 else "s21"
        variant = parts[3] if len(parts) > 3 else "12"
        
        # Parse season and year
        season_map = {'s': 'Summer', 'm': 'March', 'w': 'Winter'}
        season_code = season_year[0] if season_year else 's'
        year_code = season_year[1:] if len(season_year) > 1 else '21'
        
        season = season_map.get(season_code, 'Summer')
        year = 2000 + int(year_code) if year_code.isdigit() else 2021
        variant_num = int(variant) if variant.isdigit() else 12
        
        return {
            "id": filename,
            "subject": f"ICT {subject_code}",
            "year": year,
            "season": season,
            "variant": variant_num,
            "totalMarks": 80,  # Standard for Paper 1
            "duration": 90,    # 1.5 hours
            "questions": questions
        }


def main():
    if len(sys.argv) < 2:
        print("Usage: python golden-ict-parser.py <pdf_file> [output_json]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not Path(pdf_path).exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print(f"Parsing {pdf_path}...")
    parser = GoldenICTParser(pdf_path)
    result = parser.parse()
    
    # Generate output filename if not provided
    if not output_path:
        output_path = Path(pdf_path).stem + '.json'
    
    # Write JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Successfully created {output_path}")
    print(f"  Questions: {len(result['questions'])}")
    print(f"  Total Marks: {result['totalMarks']}")


if __name__ == "__main__":
    main()

# Made with Bob
