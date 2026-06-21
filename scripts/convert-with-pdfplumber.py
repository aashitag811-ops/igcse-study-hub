"""
Better PDF converter using pdfplumber for improved text extraction.
This preserves spacing and formatting much better than PyPDF2.

Installation:
    pip install pdfplumber requests

Usage:
    python convert-with-pdfplumber.py
"""

import os
import sys
import re
import io
import json
import pdfplumber
import requests
from pathlib import Path

print("=" * 60)
print("Convert Papers with PDFPlumber (Better Text Quality)")
print("=" * 60)

SUPABASE_URL = input("\nEnter your Supabase URL: ").strip()
SUPABASE_KEY = input("Enter your Supabase Anon Key: ").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Both URL and Key are required!")
    sys.exit(1)

SUPABASE_URL = SUPABASE_URL.rstrip('/')


class CambridgeICTParser:
    """Parses Cambridge ICT papers into nested hierarchy"""
    
    def __init__(self, raw_text):
        self.raw_text = self.clean_text(raw_text)
    
    def clean_text(self, text):
        """Remove Cambridge boilerplate"""
        noise = [
            r"DO NOT WRITE IN THIS MARGIN",
            r"\[Turn over\]",
            r"\[Turnover",
            r"UCLES \d{4}",
            r"©UCLES\d{4}",
            r"\d{2}_0417_\d{2}_\d{4}_\d\.\d+",
            r"Permission to reproduce items.*?granted\.",
        ]
        for pattern in noise:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove page numbers
        text = re.sub(r'\n\d+\n', '\n', text)
        
        return text
    
    def extract_marks(self, text):
        """Extract marks from text like [2] or [4]"""
        match = re.search(r'\[(\d+)\]', text)
        return int(match.group(1)) if match else None
    
    def clean_question_text(self, text):
        """Clean up question text"""
        # Remove marks notation
        text = re.sub(r'\[\d+\]', '', text)
        # Remove excessive dots (answer lines)
        text = re.sub(r'\.{3,}', '', text)
        # Remove excessive whitespace but keep single spaces
        text = re.sub(r'\s+', ' ', text)
        # Remove numbered answer lines like "1 " "2 " at start
        text = re.sub(r'^\d+\s+', '', text)
        return text.strip()
    
    def parse_paper(self):
        """Parse paper into nested structure"""
        questions = []
        
        # Split by main question numbers (1, 2, 3, etc.)
        # Look for pattern: newline + number + space
        main_parts = re.split(r'\n(\d{1,2})\s+', "\n" + self.raw_text)
        
        for i in range(1, len(main_parts), 2):
            if i + 1 >= len(main_parts):
                break
            
            q_num = main_parts[i]
            content = main_parts[i + 1]
            
            # Skip if content is too short (likely noise)
            if len(content.strip()) < 10:
                continue
            
            question = self.parse_main_question(q_num, content)
            if question:
                questions.append(question)
        
        return questions
    
    def parse_main_question(self, number, content):
        """Parse a main question (e.g., Question 1)"""
        # Check if it has letter subparts
        if re.search(r'\(a\)', content):
            # Extract intro text before (a)
            intro_match = re.split(r'\(a\)', content, maxsplit=1)
            intro_text = intro_match[0].strip() if intro_match else ""
            intro_text = self.clean_question_text(intro_text)
            
            # Parse letter subparts
            subparts = self.parse_letter_parts(content)
            
            # Only create question if we have subparts
            if subparts:
                return {
                    "number": number,
                    "text": intro_text if intro_text else f"Question {number}",
                    "marks": None,
                    "subparts": subparts
                }
            return None
        else:
            # No subparts - terminal question
            marks = self.extract_marks(content)
            text = self.clean_question_text(content)
            
            if text:
                return {
                    "number": number,
                    "text": text,
                    "marks": marks,
                    "type": "text"
                }
            return None
    
    def parse_letter_parts(self, content):
        """Parse letter subparts (a, b, c, etc.)"""
        subparts = []
        
        # Split by (a), (b), (c), etc.
        letter_parts = re.split(r'\(([a-z])\)', content)
        
        for i in range(1, len(letter_parts), 2):
            if i + 1 >= len(letter_parts):
                break
            
            letter = letter_parts[i]
            sub_content = letter_parts[i + 1]
            
            # Skip if too short
            if len(sub_content.strip()) < 5:
                continue
            
            subpart = self.parse_letter_part(letter, sub_content)
            if subpart:
                subparts.append(subpart)
        
        return subparts
    
    def parse_letter_part(self, letter, content):
        """Parse a single letter subpart"""
        # Check if it has roman numeral subparts
        if re.search(r'\(i\)', content) or re.search(r'\(ii\)', content):
            # Extract intro text before (i)
            intro_match = re.split(r'\([ivx]+\)', content, maxsplit=1)
            intro_text = intro_match[0].strip() if intro_match else ""
            intro_text = self.clean_question_text(intro_text)
            
            # Parse roman subparts
            roman_parts = self.parse_roman_parts(content)
            
            if roman_parts:
                return {
                    "number": letter,
                    "text": intro_text if intro_text else f"Part {letter}",
                    "marks": None,
                    "subparts": roman_parts
                }
            return None
        else:
            # Terminal question
            marks = self.extract_marks(content)
            text = self.clean_question_text(content)
            
            if text:
                return {
                    "number": letter,
                    "text": text,
                    "marks": marks,
                    "type": "text"
                }
            return None
    
    def parse_roman_parts(self, content):
        """Parse roman numeral subparts (i, ii, iii, etc.)"""
        subparts = []
        
        # Split by (i), (ii), (iii), etc.
        roman_parts = re.split(r'\(([ivx]+)\)', content)
        
        for i in range(1, len(roman_parts), 2):
            if i + 1 >= len(roman_parts):
                break
            
            roman = roman_parts[i]
            sub_content = roman_parts[i + 1]
            
            # Skip if too short
            if len(sub_content.strip()) < 5:
                continue
            
            marks = self.extract_marks(sub_content)
            text = self.clean_question_text(sub_content)
            
            if text:
                subparts.append({
                    "number": roman,
                    "text": text,
                    "marks": marks,
                    "type": "text"
                })
        
        return subparts


def extract_text_from_pdf(pdf_content):
    """Extract text from PDF using pdfplumber (better quality)"""
    try:
        pdf_file = io.BytesIO(pdf_content)
        
        text = ""
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                except Exception as e:
                    print(f"⚠️  Warning: Could not extract text from a page: {e}")
                    continue
        
        if not text.strip():
            raise Exception("No text extracted from PDF")
        
        return text
    except Exception as e:
        raise Exception(f"PDF extraction failed: {e}")


def list_papers_in_bucket():
    """List all papers in Supabase"""
    try:
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
        }
        
        papers = []
        subject_folder = "ICT 0417 Paper 1"
        
        # List season folders
        season_url = f"{SUPABASE_URL}/storage/v1/object/list/Past Papers"
        season_response = requests.post(
            season_url,
            headers=headers,
            json={"prefix": f"{subject_folder}/", "limit": 100}
        )
        season_response.raise_for_status()
        season_folders = season_response.json()
        
        print(f"Found {len(season_folders)} items in {subject_folder}")
        
        for season in season_folders:
            season_name = season.get('name', '')
            if not season_name or season_name == subject_folder:
                continue
            
            folder_name = season_name.replace(f"{subject_folder}/", "")
            print(f"  Checking: {folder_name}")
            
            # List PDFs
            pdf_url = f"{SUPABASE_URL}/storage/v1/object/list/Past Papers"
            pdf_response = requests.post(
                pdf_url,
                headers=headers,
                json={"prefix": f"{subject_folder}/{folder_name}/", "limit": 100}
            )
            
            if pdf_response.status_code == 200:
                pdfs = pdf_response.json()
                
                for pdf in pdfs:
                    pdf_name = pdf.get('name', '')
                    if pdf_name.endswith('.pdf') and '_qp_' in pdf_name:
                        filename = pdf_name.split('/')[-1]
                        papers.append({
                            'path': f"{subject_folder}/{folder_name}/{filename}",
                            'name': filename
                        })
                        print(f"    Found: {filename}")
        
        return papers
    except Exception as e:
        print(f"❌ Error listing papers: {e}")
        return []


def download_from_supabase(file_path):
    """Download PDF from Supabase"""
    url = f"{SUPABASE_URL}/storage/v1/object/Past Papers/{file_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY
    }
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.content


def parse_filename(filename):
    """Extract metadata from filename"""
    match = re.match(r'(\d{4})_([msw])(\d{2})_qp_1(\d)\.pdf', filename)
    if match:
        subject = match.group(1)
        season = match.group(2)
        year = '20' + match.group(3)
        variant = match.group(4)
        return subject, int(year), season, variant
    return None, None, None, None


def calculate_total_marks(questions):
    """Recursively calculate total marks"""
    total = 0
    for q in questions:
        if q.get('marks'):
            total += q['marks']
        if q.get('subparts'):
            total += calculate_total_marks(q['subparts'])
    return total


def main():
    print("\n📋 Listing papers...")
    papers = list_papers_in_bucket()
    
    if not papers:
        print("❌ No papers found!")
        sys.exit(1)
    
    print(f"\n✅ Found {len(papers)} papers:")
    for i, paper in enumerate(papers, 1):
        print(f"  {i}. {paper['name']}")
    
    print("\nOptions: 'all', '1,2,3', or 'q' to quit")
    choice = input("Your choice: ").strip().lower()
    
    if choice == 'q':
        sys.exit(0)
    
    if choice == 'all':
        papers_to_convert = papers
    else:
        try:
            indices = [int(x.strip()) - 1 for x in choice.split(',')]
            papers_to_convert = [papers[i] for i in indices if 0 <= i < len(papers)]
        except:
            print("❌ Invalid choice")
            sys.exit(1)
    
    output_dir = Path(__file__).parent.parent / "public" / "papers"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    for paper in papers_to_convert:
        print(f"\n{'='*60}")
        print(f"Converting: {paper['name']}")
        print('='*60)
        
        try:
            # Download
            print("📥 Downloading...")
            pdf_content = download_from_supabase(paper['path'])
            print(f"✅ Downloaded {len(pdf_content)} bytes")
            
            # Extract with pdfplumber
            print("📄 Extracting text with pdfplumber...")
            text = extract_text_from_pdf(pdf_content)
            print(f"✅ Extracted {len(text)} characters")
            
            # Parse
            print("🔍 Parsing questions...")
            parser = CambridgeICTParser(text)
            questions = parser.parse_paper()
            print(f"✅ Found {len(questions)} main questions")
            
            # Get metadata
            subject, year, season, variant = parse_filename(paper['name'])
            if not all([subject, year, season, variant]):
                print(f"⚠️  Could not parse filename")
                continue
            
            season_names = {
                'm': 'February March',
                's': 'May June',
                'w': 'October November'
            }
            
            total_marks = calculate_total_marks(questions)
            
            result = {
                "id": f"{subject}_{year}_{season}_{variant}",
                "subject": f"ICT {subject}",
                "year": year,
                "season": season_names.get(season, season),
                "variant": int(variant),
                "totalMarks": total_marks,
                "duration": 90,
                "questions": questions
            }
            
            # Save
            output_path = output_dir / paper['name'].replace('.pdf', '.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print(f"\n✅ SUCCESS!")
            print(f"📁 Saved to: {output_path}")
            print(f"📊 Questions: {len(questions)}")
            print(f"📝 Total marks: {total_marks}")
            
            success_count += 1
            
        except Exception as e:
            print(f"❌ Failed: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\n{'='*60}")
    print(f"✅ Converted {success_count}/{len(papers_to_convert)} papers")
    print(f"📁 Output: {output_dir}")
    print("\n💡 Next: Test at http://localhost:3000/practice")
    print("="*60)


if __name__ == '__main__':
    main()

# Made with Bob