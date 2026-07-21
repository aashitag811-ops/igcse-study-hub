#!/usr/bin/env python3
"""
Master Image-Based MCQ Parser
Converts PDF MCQ papers to JSON format with question images and option positions
Designed for 100% accuracy on Biology (0610) and expandable to other subjects
"""

import fitz  # PyMuPDF
import json
import os
import re
from pathlib import Path
from PIL import Image
import io

class ImageMCQParser:
    def __init__(self, subject_code, output_dir="public", expected_questions=40):
        self.subject_code = subject_code
        self.output_dir = Path(output_dir)
        self.papers_dir = self.output_dir / "papers"
        self.current_paper_id = None  # Will be set when parsing each paper
        self.expected_questions = expected_questions  # Default 40, but Economics uses 30
        
        # Create papers directory
        self.papers_dir.mkdir(parents=True, exist_ok=True)
    
    def get_subject_name(self):
        """Map subject codes to names"""
        subjects = {
            "0610": "biology",
            "0455": "economics",
            "0620": "chemistry",
            "0625": "physics"
        }
        return subjects.get(self.subject_code, "unknown")
    
    def parse_paper_id(self, filename):
        """Extract paper metadata from filename"""
        # Format: 0610_m20_qp_22.pdf
        match = re.match(r'(\d{4})_([smw])(\d{2})_(qp|ms)_(\d{2})', filename)
        if match:
            syllabus, session, year, paper_type, paper_num = match.groups()
            return {
                "syllabus": syllabus,
                "session": session,
                "year": 2000 + int(year),
                "paper_type": paper_type,
                "paper_num": paper_num,
                "paper_id": f"{syllabus}_{session}{year}_{paper_type}_{paper_num}"
            }
        return None
    
    def extract_answers_from_ms(self, ms_pdf_path):
        """Extract correct answers from marking scheme PDF"""
        answers = {}
        try:
            doc = fitz.open(ms_pdf_path)
            full_text = ""
            for page in doc:
                page_text = page.get_text()
                if isinstance(page_text, str):
                    full_text += page_text + "\n"
            
            # The marking scheme table has each cell on a separate line
            # Format: "1" (newline) "B" (newline) "1" (newline) "2" (newline) "B" ...
            lines = [l.strip() for l in full_text.split('\n') if l.strip()]
            
            # Find the start of the answer table (after "Marks" header)
            start_idx = -1
            for i, line in enumerate(lines):
                if line == "Marks" or line == "Answer":
                    start_idx = i + 1
                    break
            
            if start_idx > 0:
                # Process lines in groups of 3: question_num, answer, marks
                i = start_idx
                while i < len(lines) - 2:
                    q_line = lines[i]
                    a_line = lines[i + 1]
                    m_line = lines[i + 2]
                    
                    # Check if this looks like a valid entry
                    if q_line.isdigit() and re.match(r'^[A-D]$', a_line) and m_line.isdigit():
                        q_num = int(q_line)
                        if 1 <= q_num <= 40:
                            answers[q_num] = a_line
                            i += 3  # Move to next question
                            continue
                    
                    i += 1  # Move forward if pattern doesn't match
            
            doc.close()
            
            # Debug: print sample
            if answers:
                sample = dict(list(answers.items())[:5])
                print(f"Sample answers: {sample}")
            else:
                print("Warning: No answers extracted from table format")
                
        except Exception as e:
            print(f"Error extracting answers: {e}")
        
        return answers
    
    def detect_question_boundaries(self, page, page_num):
        """Detect question boundaries on a page using text analysis"""
        text_dict = page.get_text("dict")
        questions = []
        
        # Extract all text blocks with positions
        blocks = []
        for block in text_dict["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        bbox = span["bbox"]
                        # Only consider text at the left margin (question numbers)
                        if bbox[0] < 100:  # Left margin threshold
                            blocks.append({
                                "text": text,
                                "bbox": bbox,
                                "y": bbox[1],
                                "x": bbox[0]
                            })
        
        # Sort by vertical position
        blocks.sort(key=lambda x: x["y"])
        
        # Find question numbers (standalone numbers at start of line)
        question_starts = []
        seen_questions = set()
        
        for i, block in enumerate(blocks):
            # Match question numbers: "1 ", "2 ", etc. (with space after)
            # Must be at left margin and standalone
            if block["x"] < 50 and re.match(r'^\d+\s*$', block["text"]):
                match = re.search(r'\d+', block["text"])
                if match:
                    q_num = int(match.group())
                    # Valid MCQ question range and not already seen
                    if 1 <= q_num <= self.expected_questions and q_num not in seen_questions:
                        question_starts.append({
                            "number": q_num,
                            "y": block["y"],
                            "index": i
                        })
                        seen_questions.add(q_num)
        
        return question_starts
    
    def detect_footer_position(self, page):
        """Detect the Y position of page footer (copyright/paper code)"""
        text_dict = page.get_text("dict")
        page_height = page.rect.height
        footer_y = page_height  # Default to page bottom
        
        # Look for footer text in bottom 15% of page
        footer_zone_start = page_height * 0.85
        
        for block in text_dict["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        bbox = span["bbox"]
                        
                        # Check if text is in footer zone and matches footer patterns
                        if bbox[1] > footer_zone_start:
                            # Look for UCLES, copyright, or paper codes
                            if any(pattern in text.upper() for pattern in ["UCLES", "©", "0610/", "0455/", "0620/", "0625/"]):
                                footer_y = min(footer_y, bbox[1] - 20)  # 20px margin above footer
        
        return footer_y
    
    def extract_question_image(self, pdf_path, question_num, start_y, end_y, page_num, paper_id):
        """Extract a specific question as an image"""
        try:
            doc = fitz.open(pdf_path)
            page = doc[page_num]
            
            # Get page dimensions
            page_rect = page.rect
            
            # Detect footer position to exclude it
            footer_y = self.detect_footer_position(page)
            
            # Adjust end_y to not include footer
            end_y = min(end_y, footer_y)
            
            # Define crop area (with some padding)
            padding = 10
            crop_rect = fitz.Rect(
                0,  # Left edge
                max(0, start_y - padding),  # Top
                page_rect.width,  # Right edge
                min(page_rect.height, end_y + padding)  # Bottom
            )
            
            # Render the cropped area at high resolution
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
            pix = page.get_pixmap(matrix=mat, clip=crop_rect)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Create paper-specific image directory
            paper_images_dir = self.output_dir / "images" / self.get_subject_name() / paper_id
            paper_images_dir.mkdir(parents=True, exist_ok=True)
            
            # Save image
            img_filename = f"q{question_num}.png"
            img_path = paper_images_dir / img_filename
            img.save(img_path, "PNG", optimize=True)
            
            doc.close()
            
            return f"/images/{self.get_subject_name()}/{paper_id}/{img_filename}?v=24"
        
        except Exception as e:
            print(f"Error extracting question {question_num}: {e}")
            return None
    
    def detect_option_positions(self, page, start_y, end_y):
        """Detect A, B, C, D option positions within a question area"""
        text_dict = page.get_text("dict")
        options = {}
        
        # Get page dimensions for percentage calculation
        page_rect = page.rect
        page_width = page_rect.width
        page_height = page_rect.height
        
        # Avoid division by zero
        height_diff = end_y - start_y
        if height_diff <= 0:
            height_diff = 100  # Default height
        
        # Look for option letters within the question area
        for block in text_dict["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        bbox = span["bbox"]
                        y_pos = bbox[1]
                        
                        # Check if within question area
                        if start_y <= y_pos <= end_y:
                            # Match single letters A, B, C, or D (not already found)
                            if re.match(r'^[A-D]$', text) and text not in options:
                                # Calculate percentage positions
                                x_percent = (bbox[0] / page_width) * 100
                                y_percent = ((y_pos - start_y) / height_diff) * 100
                                
                                options[text] = {
                                    "x": round(x_percent, 2),
                                    "y": round(y_percent, 2)
                                }
        
        return options
    
    def parse_question_paper(self, qp_pdf_path, ms_pdf_path=None):
        """Parse a complete question paper PDF"""
        # Extract metadata
        filename = os.path.basename(qp_pdf_path)
        metadata = self.parse_paper_id(filename)
        
        if not metadata:
            print(f"Could not parse filename: {filename}")
            return None
        
        # Extract answers from marking scheme
        answers = {}
        if ms_pdf_path and os.path.exists(ms_pdf_path):
            answers = self.extract_answers_from_ms(ms_pdf_path)
            print(f"Extracted {len(answers)} answers from marking scheme")
        
        # Open PDF
        doc = fitz.open(qp_pdf_path)
        
        # Collect all questions across all pages
        all_questions = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            question_starts = self.detect_question_boundaries(page, page_num)
            
            for i, q_info in enumerate(question_starts):
                q_num = q_info["number"]
                start_y = q_info["y"]
                
                # Determine end position (next question or end of page)
                if i + 1 < len(question_starts):
                    # Stop BEFORE the next question number (subtract margin)
                    end_y = question_starts[i + 1]["y"] - 15  # 15px margin before next question
                else:
                    end_y = page.rect.height
                
                # Extract question image
                image_url = self.extract_question_image(
                    qp_pdf_path, q_num, start_y, end_y, page_num, metadata["paper_id"]
                )
                
                # Detect option positions
                option_positions = self.detect_option_positions(page, start_y, end_y)
                
                # Build question object
                question = {
                    "questionNumber": q_num,
                    "imageUrl": image_url,
                    "correctAnswer": answers.get(q_num, ""),
                    "marks": 1,
                    "optionPositions": option_positions
                }
                
                all_questions.append(question)
                print(f"Extracted Q{q_num}: {len(option_positions)} options detected")
        
        doc.close()
        
        # Sort questions by number
        all_questions.sort(key=lambda x: x["questionNumber"])
        
        # Build final JSON structure
        paper_data = {
            "paperId": metadata["paper_id"],
            "paperName": f"{self.get_subject_name().title()} Paper {metadata['paper_num'][-1]} - {self.format_session(metadata['session'])} {metadata['year']}",
            "subject": self.get_subject_name().title(),
            "syllabus": metadata["syllabus"],
            "year": metadata["year"],
            "session": metadata["session"],
            "paper": metadata["paper_num"],
            "totalQuestions": len(all_questions),
            "timeLimit": 2700,  # 45 minutes default
            "questions": all_questions
        }
        
        # Save JSON
        json_filename = f"{metadata['paper_id']}.json"
        json_path = self.papers_dir / json_filename
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(paper_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n[OK] Saved: {json_path}")
        print(f"[OK] Total questions: {len(all_questions)}")
        
        return paper_data
    
    def format_session(self, session_code):
        """Format session code to readable name"""
        sessions = {
            "m": "Feb/March",
            "s": "May/June",
            "w": "Oct/Nov"
        }
        return sessions.get(session_code, session_code)


def main():
    """Main execution function"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python master-image-mcq-parser.py <paper_id> [--questions N]")
        print("Example: python master-image-mcq-parser.py 0610_m20_qp_22")
        print("Example: python master-image-mcq-parser.py 0455_m23_qp_12 --questions 30")
        sys.exit(1)
    
    paper_id = sys.argv[1]
    
    # Parse optional --questions parameter
    expected_questions = 40  # Default
    if '--questions' in sys.argv:
        idx = sys.argv.index('--questions')
        if idx + 1 < len(sys.argv):
            expected_questions = int(sys.argv[idx + 1])
    
    # Build file paths
    qp_path = f"scripts/{paper_id}.pdf"
    ms_path = f"scripts/{paper_id.replace('_qp_', '_ms_')}.pdf"
    
    # Check if files exist
    if not os.path.exists(qp_path):
        print(f"[ERROR] Question paper not found: {qp_path}")
        sys.exit(1)
    
    if not os.path.exists(ms_path):
        print(f"[WARNING] Marking scheme not found: {ms_path}")
        ms_path = None
    
    # Extract subject code from filename
    subject_code = paper_id[:4]
    
    # Create parser
    parser = ImageMCQParser(subject_code, expected_questions=expected_questions)
    
    # Parse paper
    print(f"Parsing: {paper_id}")
    print(f"Expected questions: {expected_questions}")
    print("=" * 60)
    result = parser.parse_question_paper(qp_path, ms_path)
    
    if result:
        print("\n" + "=" * 60)
        print("[SUCCESS] PARSING COMPLETE")
        print(f"[OK] Questions extracted: {result['totalQuestions']}")
        print(f"[OK] JSON saved to: public/papers/{result['paperId']}.json")
        print(f"[OK] Images saved to: public/images/{parser.get_subject_name()}/questions/")
    else:
        print("\n[ERROR] PARSING FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()

# Made with Bob
