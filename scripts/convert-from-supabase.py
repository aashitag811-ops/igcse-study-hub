"""
Script to convert papers from Supabase storage to JSON format.

This script:
1. Downloads PDFs from your Supabase "Past Papers" bucket
2. Converts them to JSON using the Cambridge ICT parser
3. Saves to public/papers/

Usage:
    python convert-from-supabase.py

It will list all papers in Supabase and let you choose which to convert.
"""

import os
import sys
import re
import io
import json
import PyPDF2
from pathlib import Path

# You'll need to install supabase client
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Supabase client not installed!")
    print("Run: pip install supabase")
    sys.exit(1)

# Get Supabase credentials from environment or prompt
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  Supabase credentials not found in environment")
    print("\nPlease enter your Supabase credentials:")
    SUPABASE_URL = input("Supabase URL: ").strip()
    SUPABASE_KEY = input("Supabase Anon Key: ").strip()

class CambridgeICTConverter:
    def __init__(self, raw_text):
        self.raw_text = raw_text
        self.clean_text = self.remove_boilerplate(raw_text)

    def remove_boilerplate(self, text):
        """Strips out recurring Cambridge exam noise"""
        noise_patterns = [
            r"DO NOT WRITE IN THIS MARGIN",
            r"\[Turn over\]",
            r"UCLES 2025",
            r"\d{2}0417\d{2}2025\d\.\d+",
            r"--- PAGE \d+ ---",
            r"L\n",
        ]
        for pattern in noise_patterns:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)
        return text

    def parse_paper(self):
        """Extracts questions with hierarchy"""
        structured_data = []
        main_blocks = re.split(r'\n(\d{1,2})\s+', "\n" + self.clean_text)
        
        for i in range(1, len(main_blocks), 2):
            if i + 1 >= len(main_blocks):
                break
                
            q_num = main_blocks[i]
            content = main_blocks[i+1]
            
            intro_text = content.split('(a)')[0].strip() if '(a)' in content else ""
            sub_parts = re.split(r'\(([a-z])\)', content)
            
            if len(sub_parts) > 1:
                for j in range(1, len(sub_parts), 2):
                    if j + 1 >= len(sub_parts):
                        break
                        
                    letter = sub_parts[j]
                    sub_content = sub_parts[j+1]
                    
                    sub_sub = re.split(r'\(([ivx]+)\)', sub_content)
                    
                    if len(sub_sub) > 1:
                        for k in range(1, len(sub_sub), 2):
                            if k + 1 >= len(sub_sub):
                                break
                                
                            roman = sub_sub[k]
                            final_text = sub_sub[k+1]
                            structured_data.append(self.build_json(
                                f"{q_num}{letter}{roman}", 
                                final_text, 
                                parent_context=intro_text,
                                parent_id=f"{q_num}{letter}",
                                level=2
                            ))
                    else:
                        structured_data.append(self.build_json(
                            f"{q_num}{letter}", 
                            sub_content, 
                            parent_context=intro_text,
                            parent_id=q_num,
                            level=1
                        ))
            else:
                structured_data.append(self.build_json(q_num, content, level=0))

        return structured_data

    def build_json(self, q_id, content, parent_context="", parent_id=None, level=0):
        """Formats the final object"""
        marks_match = re.search(r'\[(\d+)\]', content)
        marks = int(marks_match.group(1)) if marks_match else 1
        
        prompt = f"{parent_context} {content.split('[')[0]}".strip()
        prompt = re.sub(r'\s+', ' ', prompt).strip()
        
        return {
            "id": q_id,
            "text": prompt,
            "marks": marks,
            "level": level,
            "parentId": parent_id
        }


def extract_text_from_pdf(pdf_content):
    """Extract text from PDF bytes"""
    try:
        pdf_file = io.BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file, strict=False)
        
        text = ""
        for page in pdf_reader.pages:
            try:
                text += page.extract_text() + "\n"
            except Exception as e:
                print(f"⚠️  Warning: Could not extract text from a page: {e}")
                continue
        
        if not text.strip():
            raise Exception("No text could be extracted from PDF")
        
        return text
    except Exception as e:
        print(f"❌ Error extracting text: {e}")
        raise


def list_papers_in_supabase(supabase: Client):
    """List all papers in Supabase storage"""
    try:
        # List all files in Past Papers bucket
        files = supabase.storage.from_('Past Papers').list()
        
        papers = []
        for folder in files:
            if folder['name']:
                # List files in each subject folder
                subject_files = supabase.storage.from_('Past Papers').list(folder['name'])
                for season_folder in subject_files:
                    if season_folder['name']:
                        # List PDFs in season folder
                        pdfs = supabase.storage.from_('Past Papers').list(f"{folder['name']}/{season_folder['name']}")
                        for pdf in pdfs:
                            if pdf['name'].endswith('.pdf') and '_qp_' in pdf['name']:
                                papers.append({
                                    'path': f"{folder['name']}/{season_folder['name']}/{pdf['name']}",
                                    'name': pdf['name']
                                })
        
        return papers
    except Exception as e:
        print(f"❌ Error listing papers: {e}")
        return []


def download_from_supabase(supabase: Client, file_path: str):
    """Download a PDF from Supabase"""
    try:
        print(f"📥 Downloading: {file_path}")
        response = supabase.storage.from_('Past Papers').download(file_path)
        print(f"✅ Downloaded {len(response)} bytes")
        return response
    except Exception as e:
        print(f"❌ Error downloading: {e}")
        raise


def parse_filename(filename: str):
    """Extract year, season, variant from filename"""
    match = re.match(r'(\d{4})_([msw])(\d{2})_qp_1(\d)\.pdf', filename)
    if match:
        subject = match.group(1)
        season = match.group(2)
        year = '20' + match.group(3)
        variant = match.group(4)
        return subject, int(year), season, variant
    return None, None, None, None


def main():
    print("=" * 60)
    print("Convert Papers from Supabase to JSON")
    print("=" * 60)
    
    # Create Supabase client
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # List all papers
    print("\n📋 Listing papers in Supabase...")
    papers = list_papers_in_supabase(supabase)
    
    if not papers:
        print("❌ No papers found in Supabase!")
        print("Make sure papers are in the 'Past Papers' bucket")
        sys.exit(1)
    
    print(f"\n✅ Found {len(papers)} papers:")
    for i, paper in enumerate(papers, 1):
        print(f"  {i}. {paper['name']}")
    
    # Ask which to convert
    print("\nOptions:")
    print("  'all' - Convert all papers")
    print("  '1,2,3' - Convert specific papers")
    print("  'q' - Quit")
    
    choice = input("\nYour choice: ").strip().lower()
    
    if choice == 'q':
        print("Cancelled.")
        sys.exit(0)
    
    # Determine which papers to convert
    if choice == 'all':
        papers_to_convert = papers
    else:
        try:
            indices = [int(x.strip()) - 1 for x in choice.split(',')]
            papers_to_convert = [papers[i] for i in indices if 0 <= i < len(papers)]
        except:
            print("❌ Invalid choice")
            sys.exit(1)
    
    # Convert each paper
    output_dir = Path(__file__).parent.parent / "public" / "papers"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    for paper in papers_to_convert:
        print(f"\n{'='*60}")
        print(f"Converting: {paper['name']}")
        print('='*60)
        
        try:
            # Download PDF
            pdf_content = download_from_supabase(supabase, paper['path'])
            
            # Extract text
            print("📄 Extracting text from PDF...")
            text = extract_text_from_pdf(pdf_content)
            
            # Parse
            print("🔍 Parsing questions...")
            converter = CambridgeICTConverter(text)
            questions_data = converter.parse_paper()
            
            # Parse filename
            subject, year, season, variant = parse_filename(paper['name'])
            if not all([subject, year, season, variant]):
                print(f"⚠️  Could not parse filename: {paper['name']}")
                continue
            
            # Group questions
            questions_by_num = {}
            for item in questions_data:
                match = re.match(r'(\d+)', item['id'])
                if match:
                    q_num = int(match.group(1))
                    if q_num not in questions_by_num:
                        questions_by_num[q_num] = []
                    questions_by_num[q_num].append(item)
            
            # Format output
            questions = []
            for q_num in sorted(questions_by_num.keys()):
                parts = questions_by_num[q_num]
                total_marks = sum(p['marks'] for p in parts)
                questions.append({
                    "number": q_num,
                    "parts": parts,
                    "totalMarks": total_marks
                })
            
            total_marks = sum(q['totalMarks'] for q in questions)
            
            season_names = {
                'm': 'February March',
                's': 'May June',
                'w': 'October November'
            }
            
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
            print(f"📊 Total questions: {len(questions)}")
            print(f"📝 Total marks: {total_marks}")
            
            success_count += 1
            
        except Exception as e:
            print(f"❌ Failed: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\n{'='*60}")
    print(f"✅ Successfully converted {success_count}/{len(papers_to_convert)} papers")
    print(f"📁 Saved to: {output_dir}")
    print("="*60)


if __name__ == '__main__':
    main()

# Made with Bob
