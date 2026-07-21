"""
Robust Cambridge IGCSE ICT Paper 1 PDF Parser
Downloads papers from PapaCambridge and converts to JSON format

Usage:
    python convert-paper-to-json.py 2025 m 2
    
This will download 0417_m25_qp_12.pdf and create 0417_m25_qp_12.json
"""

import sys
import requests
import re
import json
import pdfplumber
import fitz  # PyMuPDF
from pathlib import Path
from io import BytesIO


class ICTPaperParser:
    """Parses Cambridge IGCSE ICT Paper 1 PDFs with robust text extraction"""
    
    def __init__(self, pdf_content):
        self.pdf_content = pdf_content
        self.raw_text = ""
        self.questions = []
        
    def extract_text(self):
        """Extract text from PDF using pdfplumber with PyMuPDF fallback"""
        print("[*] Extracting text from PDF...")
        
        try:
            # Try pdfplumber first
            with pdfplumber.open(BytesIO(self.pdf_content)) as pdf:
                text_parts = []
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)
                        
            self.raw_text = "\n".join(text_parts)
            print(f"[+] Extracted {len(self.raw_text)} characters from {len(text_parts)} pages (pdfplumber)")
        except Exception as e:
            print(f"[!] pdfplumber failed, trying PyMuPDF: {e}")
            # Fallback to PyMuPDF
            doc = fitz.open(stream=self.pdf_content, filetype="pdf")
            text_parts = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                if text:
                    text_parts.append(text)
            doc.close()
            
            self.raw_text = "\n".join(text_parts)
            print(f"[+] Extracted {len(self.raw_text)} characters from {len(text_parts)} pages (PyMuPDF)")
        
        return self.raw_text
    
    def clean_text(self, text):
        """Remove noise and clean up extracted text"""
        # Remove common Cambridge exam boilerplate
        noise_patterns = [
            r'©\s*UCLES\s*\d{4}',
            r'\[Turn over\]?',
            r'DO NOT WRITE IN THIS MARGIN',
            r'\d{4}/\d{2}/[A-Z]/\d{2}',
            r'Permission to reproduce items.*?granted\.',
        ]
        
        for pattern in noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove excessive dots (answer lines)
        text = re.sub(r'\.{3,}', '', text)
        
        # Fix spacing issues
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    def extract_marks(self, text):
        """Extract marks from text like [2] or [4]"""
        match = re.search(r'\[(\d+)\]', text)
        if match:
            return int(match.group(1))
        return 1
    
    def remove_marks_from_text(self, text):
        """Remove marks notation from question text"""
        return re.sub(r'\s*\[\d+\]\s*', ' ', text).strip()
    
    def parse_questions(self):
        """Parse questions with proper hierarchy detection"""
        print("[*] Parsing questions...")
        
        if not self.raw_text:
            self.extract_text()
        
        # Split by main question numbers (1, 2, 3, etc.)
        # Look for pattern: newline or start, then digit(s), then whitespace
        question_blocks = re.split(r'(?:^|\n)(\d{1,2})\s+', self.raw_text)
        
        # Remove empty first element if exists
        if question_blocks and not question_blocks[0].strip():
            question_blocks = question_blocks[1:]
        
        questions = []
        
        # Process in pairs: (number, content)
        for i in range(0, len(question_blocks) - 1, 2):
            q_num = question_blocks[i].strip()
            q_content = question_blocks[i + 1]
            
            if not q_num.isdigit():
                continue
            
            question = self.parse_question_content(int(q_num), q_content)
            if question:
                questions.append(question)
        
        self.questions = questions
        print(f"[+] Found {len(questions)} questions")
        return questions
    
    def parse_question_content(self, q_num, content):
        """Parse a single question's content including subparts"""
        
        # Check if question has subparts (a), (b), (c)
        subpart_pattern = r'\(([a-z])\)'
        subparts_found = re.findall(subpart_pattern, content)
        
        if not subparts_found:
            # Simple question with no subparts
            clean_text = self.clean_text(content)
            marks = self.extract_marks(clean_text)
            clean_text = self.remove_marks_from_text(clean_text)
            
            return {
                "number": q_num,
                "text": clean_text,
                "marks": marks,
                "subparts": []
            }
        
        # Question has subparts
        # Extract intro text (before first subpart)
        intro_match = re.match(r'^(.*?)\([a-z]\)', content, re.DOTALL)
        intro_text = ""
        if intro_match:
            intro_text = self.clean_text(intro_match.group(1))
        
        # Split by subparts
        subpart_splits = re.split(r'\(([a-z])\)', content)
        
        subparts = []
        
        # Process subparts (skip intro text)
        for i in range(1, len(subpart_splits) - 1, 2):
            letter = subpart_splits[i]
            subpart_content = subpart_splits[i + 1]
            
            # Check for sub-subparts (i), (ii), (iii)
            roman_pattern = r'\(([ivx]+)\)'
            romans_found = re.findall(roman_pattern, subpart_content)
            
            if not romans_found:
                # Simple subpart
                clean_text = self.clean_text(subpart_content)
                marks = self.extract_marks(clean_text)
                clean_text = self.remove_marks_from_text(clean_text)
                
                subparts.append({
                    "number": letter,
                    "text": clean_text,
                    "marks": marks,
                    "type": self.detect_question_type(clean_text)
                })
            else:
                # Subpart has sub-subparts
                subpart_intro_match = re.match(r'^(.*?)\([ivx]+\)', subpart_content, re.DOTALL)
                subpart_intro = ""
                if subpart_intro_match:
                    subpart_intro = self.clean_text(subpart_intro_match.group(1))
                
                roman_splits = re.split(r'\(([ivx]+)\)', subpart_content)
                
                sub_subparts = []
                for j in range(1, len(roman_splits) - 1, 2):
                    roman = roman_splits[j]
                    sub_content = roman_splits[j + 1]
                    
                    clean_text = self.clean_text(sub_content)
                    marks = self.extract_marks(clean_text)
                    clean_text = self.remove_marks_from_text(clean_text)
                    
                    sub_subparts.append({
                        "number": roman,
                        "text": clean_text,
                        "marks": marks,
                        "type": self.detect_question_type(clean_text)
                    })
                
                subparts.append({
                    "number": letter,
                    "text": subpart_intro,
                    "marks": None,
                    "subparts": sub_subparts
                })
        
        return {
            "number": q_num,
            "text": intro_text,
            "marks": None,
            "subparts": subparts
        }
    
    def detect_question_type(self, text):
        """Detect question type based on text content"""
        text_lower = text.lower()
        
        # MCQ patterns
        if any(word in text_lower for word in ['circle', 'tick', 'select', 'choose']):
            if 'two' in text_lower or 'three' in text_lower:
                return "mcq"
        
        # List patterns
        if re.search(r'\b(name|state|identify|list)\s+(two|three|four)', text_lower):
            return "numbered_list"
        
        # Essay/description patterns
        if any(word in text_lower for word in ['describe', 'explain', 'discuss', 'compare']):
            return "essay"
        
        # Table patterns
        if 'table' in text_lower or 'complete' in text_lower:
            return "table"
        
        return "text"
    
    def calculate_total_marks(self):
        """Calculate total marks for the paper"""
        total = 0
        
        def count_marks(item):
            nonlocal total
            if isinstance(item.get('marks'), int):
                total += item['marks']
            if 'subparts' in item and item['subparts']:
                for subpart in item['subparts']:
                    count_marks(subpart)
        
        for question in self.questions:
            count_marks(question)
        
        return total
    
    def to_json(self, year, season, variant):
        """Convert parsed questions to JSON format"""
        if not self.questions:
            self.parse_questions()
        
        season_names = {
            'm': 'February March',
            's': 'May June',
            'w': 'October November'
        }
        
        total_marks = self.calculate_total_marks()
        
        return {
            "id": f"0417_{year}_{season}_{variant}",
            "subject": "ICT 0417",
            "year": year,
            "season": season_names.get(season, season),
            "variant": int(variant),
            "totalMarks": total_marks,
            "duration": 90,
            "questions": self.questions
        }


def download_from_papacambridge(year, season_code, variant):
    """Download PDF from PapaCambridge"""
    subject_code = "0417"
    year_short = str(year)[-2:]
    filename = f"{subject_code}_{season_code}{year_short}_qp_1{variant}.pdf"
    
    base_url = "https://pastpapers.papacambridge.com"
    subject_path = "Cambridge%20IGCSE/Information%20and%20Communication%20Technology%20(0417)"
    url = f"{base_url}/{subject_path}/{year}/{filename}"
    
    print(f"[*] Downloading from: {url}")
    
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    
    print(f"[+] Downloaded {len(response.content)} bytes")
    return response.content, filename


def main():
    if len(sys.argv) != 4:
        print("Usage: python convert-paper-to-json.py <year> <season> <variant>")
        print("Example: python convert-paper-to-json.py 2025 m 2")
        print("\nSeason codes: m=Feb/Mar, s=May/Jun, w=Oct/Nov")
        sys.exit(1)
    
    year = int(sys.argv[1])
    season = sys.argv[2].lower()
    variant = sys.argv[3]
    
    if season not in ['m', 's', 'w']:
        print("❌ Season must be m, s, or w")
        sys.exit(1)
    
    try:
        # Download PDF
        pdf_content, filename = download_from_papacambridge(year, season, variant)
        
        # Parse paper
        parser = ICTPaperParser(pdf_content)
        parser.extract_text()
        parser.parse_questions()
        
        # Convert to JSON
        result = parser.to_json(year, season, variant)
        
        # Save to file
        output_dir = Path(__file__).parent.parent / "public" / "papers"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        json_filename = filename.replace('.pdf', '.json')
        output_path = output_dir / json_filename
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n[+] SUCCESS!")
        print(f"[+] Saved to: {output_path}")
        print(f"[+] Total questions: {len(result['questions'])}")
        print(f"[+] Total marks: {result['totalMarks']}")
        
    except requests.exceptions.RequestException as e:
        print(f"[-] Failed to download PDF: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[-] Failed to parse paper: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

# Made with Bob
