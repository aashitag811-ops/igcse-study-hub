"""
Cambridge ICT Converter - Based on your proven working algorithm
Maintains strict hierarchy: Main (1) -> Part (a) -> Sub-part (i)
"""

import re
import json
import sys
from pathlib import Path
import pdfplumber

class CambridgeICTConverter:
    def __init__(self, raw_text):
        # The algorithm now operates on a single file's text at a time
        self.raw_text = raw_text
        self.clean_text = self.remove_boilerplate(raw_text)

    def remove_boilerplate(self, text):
        """Strips out recurring Cambridge exam noise that disrupts numbering."""
        noise_patterns = [
            r"DO NOT WRITE IN THIS MARGIN",
            r"\[Turn over\]",
            r"UCLES 20\d{2}",
            r"\\0000\\d+\\",           # Barcode sequence
            r"\d{2}0417\d{2}20\d{2}\d\.\d+", # Cambridge page sequence IDs
            r"--- PAGE \d+ ---",
            r"L\n",                   # Alignment markers
            r"©\s*Cambridge.*?(?=\n|$)",
            r"Permission to reproduce.*",
            r"Cambridge Assessment.*",
            r"University of Cambridge Local Examinations Syndicate.*",
            r"www\.cambridgeinternational\.org.*",
            r"www\.dynamicpapers\.com.*",
        ]
        for pattern in noise_patterns:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)
        return text

    def parse_paper(self):
        """
        Extracts questions while maintaining strict hierarchy: 
        Main (1) -> Part (a) -> Sub-part (i)
        """
        structured_data = []
        # Split by main question number at the start of a line
        main_blocks = re.split(r'\n(\d{1,2})\s+', "\n" + self.clean_text)
        
        for i in range(1, len(main_blocks), 2):
            q_num = main_blocks[i]
            content = main_blocks[i+1]
            
            # Context preservation: capture introductory text before sub-parts
            intro_text = content.split('(a)')[0].strip() if '(a)' in content else ""
            
            # Split into sub-parts (a), (b), (c)...
            sub_parts = re.split(r'\(([a-z])\)', content)
            
            if len(sub_parts) > 1:
                # Has sub-parts
                main_question = {
                    "number": q_num,
                    "text": intro_text,
                    "marks": None,
                    "subparts": []
                }
                
                for j in range(1, len(sub_parts), 2):
                    letter = sub_parts[j]
                    sub_content = sub_parts[j+1]
                    
                    # Split into sub-sub-parts (i), (ii), (iii)...
                    sub_sub = re.split(r'\(([ivx]+)\)', sub_content)
                    
                    if len(sub_sub) > 1:
                        # Case: 2(a) has (i), (ii)
                        sub_question = {
                            "number": letter,
                            "text": sub_sub[0].strip(),
                            "marks": None,
                            "subparts": []
                        }
                        
                        for k in range(1, len(sub_sub), 2):
                            roman = sub_sub[k]
                            final_text = sub_sub[k+1]
                            sub_sub_question = self.build_question(roman, final_text, intro_text)
                            sub_question["subparts"].append(sub_sub_question)
                        
                        main_question["subparts"].append(sub_question)
                    else:
                        # Case: 2(a) standalone
                        sub_question = self.build_question(letter, sub_content, intro_text)
                        main_question["subparts"].append(sub_question)
                
                structured_data.append(main_question)
            else:
                # Case: Question 1 (Standalone)
                question = self.build_question(q_num, content, "")
                structured_data.append(question)

        return structured_data

    def build_question(self, q_id, content, parent_context=""):
        """Formats the final object with inferred UI types."""
        # Extract marks from the specific [X] bracket
        marks_match = re.search(r'\[(\d+)\]', content)
        marks = int(marks_match.group(1)) if marks_match else None
        
        # Remove marks from prompt
        prompt = re.sub(r'\[\d+\]', '', content).strip()
        
        # Inference Logic for Frontend Mapping
        ui_type = "text"
        options = None
        
        if "Circle" in prompt or "Tick" in prompt:
            ui_type = "mcq"
            # Extract options from the text
            options = self.extract_options(content)
        elif any(word in prompt for word in ["Benefit", "Drawback", "Method", "Description", "Rule", "Feature"]):
            if re.search(r'(Method|Benefit|Rule|Feature)\s*1', prompt):
                ui_type = "paired_list"
        elif marks and marks >= 4 and any(word in prompt.lower() for word in ["explain", "discuss", "describe"]):
            ui_type = "essay"
        elif re.search(r'\n1\s*\n2', content):
            ui_type = "numbered_list"

        question = {
            "number": q_id,
            "text": prompt,
            "marks": marks,
            "type": ui_type
        }
        
        if options:
            question["options"] = options
            if marks:
                question["maxSelections"] = marks
        
        return question

    def extract_options(self, text):
        """Extract options from Circle/Tick questions."""
        options = []
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            # Skip question text and marks
            if '[' in line or 'Circle' in line or 'Tick' in line or not line:
                continue
            # Options are usually short, capitalized phrases
            if len(line) < 50 and line[0].isupper():
                options.append(line)
        return options if options else None


def extract_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber."""
    content_bbox = (65, 90, 530, 770)
    full_text = ""
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            # Skip first page (instructions)
            if page_num == 0:
                continue
            
            # Extract text from content area only
            text = page.within_bbox(content_bbox).extract_text(x_tolerance=3)
            if text:
                full_text += text + "\n"
    
    return full_text


def main():
    if len(sys.argv) < 2:
        print("Usage: python cambridge-ict-converter.py <pdf_file> [output_json]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not Path(pdf_path).exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print(f"Extracting text from {pdf_path}...")
    raw_text = extract_from_pdf(pdf_path)
    
    print("Parsing questions...")
    converter = CambridgeICTConverter(raw_text)
    questions = converter.parse_paper()
    
    # Extract metadata from filename
    filename = Path(pdf_path).stem
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
    
    result = {
        "id": filename,
        "subject": f"ICT {subject_code}",
        "year": year,
        "season": season,
        "variant": variant_num,
        "totalMarks": 80,
        "duration": 90,
        "questions": questions
    }
    
    # Generate output filename if not provided
    if not output_path:
        output_path = Path(pdf_path).stem + '.json'
    
    # Write JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Successfully created {output_path}")
    print(f"  Questions: {len(questions)}")
    print(f"  Total Marks: {result['totalMarks']}")


if __name__ == "__main__":
    main()

# Made with Bob
