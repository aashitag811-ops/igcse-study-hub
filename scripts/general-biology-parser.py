"""
General Biology Paper Parser
Based on perfect-sample-parser.py
Extracts questions as high-quality images (2x DPI) and matches with marking scheme answers
"""

import fitz  # PyMuPDF
import json
import re
import os
from pathlib import Path

def extract_answers_from_ms(ms_path):
    """Extract answers from marking scheme PDF"""
    answers = {}
    try:
        doc = fitz.open(ms_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        
        # Look for answer patterns like "1 B", "2 C", etc.
        # Try multiple patterns to catch different MS formats
        patterns = [
            r'^\s*(\d+)\s+([A-D])\s*$',  # "1 B" on its own line
            r'(\d+)\s+([A-D])(?:\s|$)',   # "1 B" with space or end
            r'Question\s+(\d+).*?([A-D])', # "Question 1 ... B"
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            for q_num, answer in matches:
                q_num = int(q_num)
                if 1 <= q_num <= 40:
                    answers[q_num] = answer
        
        print(f"  Extracted {len(answers)} answers from marking scheme")
        
        # If we didn't get all 40, warn
        if len(answers) < 40:
            print(f"  WARNING: Only found {len(answers)}/40 answers")
            
    except Exception as e:
        print(f"  Error extracting answers: {e}")
    
    return answers

def extract_question_images(qp_path, output_dir, paper_id):
    """Extract all 40 questions as high-quality PNG images"""
    
    # Create output directory
    questions_dir = os.path.join(output_dir, "questions")
    os.makedirs(questions_dir, exist_ok=True)
    
    try:
        doc = fitz.open(qp_path)
        
        # Standard extraction parameters
        mat = fitz.Matrix(2, 2)  # 2x zoom = 300 DPI
        
        # Question boundaries (adjust these based on paper format)
        y_start = 100  # Top margin
        y_end = 750    # Bottom margin (before next question)
        
        questions_extracted = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_height = page.rect.height
            
            # Estimate 2-3 questions per page
            # This is a simple approach - extract full page regions
            for q_offset in range(3):  # Try up to 3 questions per page
                question_num = (page_num * 3) + q_offset + 1
                
                if question_num > 40:
                    break
                
                # Calculate question region
                if q_offset == 0:
                    y0 = y_start
                    y1 = y_start + 250
                elif q_offset == 1:
                    y0 = y_start + 250
                    y1 = y_start + 500
                else:
                    y0 = y_start + 500
                    y1 = page_height - 50
                
                # Special handling for last question
                if question_num == 40:
                    y1 = page_height - 50
                
                # Create clip rectangle
                rect = fitz.Rect(0, y0, page.rect.width, y1)
                
                # Extract as image
                pix = page.get_pixmap(matrix=mat, clip=rect)
                
                # Save image
                img_filename = f"q{question_num}.png"
                img_path = os.path.join(questions_dir, img_filename)
                pix.save(img_path)
                
                questions_extracted += 1
                print(f"    Extracted Q{question_num}")
        
        doc.close()
        print(f"  Total questions extracted: {questions_extracted}")
        return questions_extracted
        
    except Exception as e:
        print(f"  Error extracting images: {e}")
        return 0

def create_paper_json(paper_id, title, answers, num_questions, output_dir):
    """Create JSON file with paper metadata and questions"""
    
    questions = []
    for q_num in range(1, num_questions + 1):
        question = {
            "questionNumber": q_num,
            "imageUrl": f"/images/biology/questions/q{q_num}.png",
            "correctAnswer": answers.get(q_num, "A"),  # Default to A if not found
            "marks": 1
        }
        questions.append(question)
    
    paper = {
        "paperId": paper_id,
        "paperName": title,
        "subject": "Biology",
        "syllabus": "0610",
        "variant": "22",
        "totalQuestions": num_questions,
        "timeLimit": 2700,  # 45 minutes in seconds
        "questions": questions
    }
    
    # Save JSON
    json_path = os.path.join(output_dir, f"{paper_id}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    print(f"  Saved JSON: {json_path}")
    return True

def process_paper(base_dir, folder, qp_file, ms_file, paper_id, output_dir, image_dir):
    """Process a single biology paper"""
    print(f"\n{'='*60}")
    print(f"Processing: {paper_id}")
    print(f"{'='*60}")
    
    qp_path = os.path.join(base_dir, folder, qp_file)
    ms_path = os.path.join(base_dir, folder, ms_file)
    
    # Check files exist
    if not os.path.exists(qp_path):
        print(f"  ERROR: Question paper not found: {qp_path}")
        return False
    
    if not os.path.exists(ms_path):
        print(f"  ERROR: Marking scheme not found: {ms_path}")
        return False
    
    # Extract answers from marking scheme
    print("Step 1: Extracting answers from marking scheme...")
    answers = extract_answers_from_ms(ms_path)
    
    # Extract question images
    print("Step 2: Extracting question images...")
    num_questions = extract_question_images(qp_path, image_dir, paper_id)
    
    if num_questions == 0:
        print("  ERROR: No questions extracted")
        return False
    
    # Create JSON file
    print("Step 3: Creating JSON file...")
    title = f"Biology Paper 2 - {folder}"
    success = create_paper_json(paper_id, title, answers, num_questions, output_dir)
    
    if success:
        print(f"  ✓ SUCCESS: {paper_id} processed successfully")
    
    return success

def main():
    # Configuration
    BASE_DIR = r"C:\Users\sahal\Downloads\Biology 0610 Paper 2\Biology 0610 Paper 2"
    OUTPUT_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"
    IMAGE_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology"
    
    # Papers to process
    PAPERS = [
        # Feb/March papers
        ("February March 2020", "0610_m20_qp_22.pdf", "0610_m20_ms_22.pdf", "0610_m20_qp_22"),
        ("February March 2021", "0610_m21_qp_22.pdf", "0610_m21_ms_22.pdf", "0610_m21_qp_22"),
        ("February March 2022", "0610_m22_qp_22.pdf", "0610_m22_ms_22.pdf", "0610_m22_qp_22"),
        ("February March 2023", "0610_m23_qp_22.pdf", "0610_m23_ms_22.pdf", "0610_m23_qp_22"),
        ("February March 2024", "0610_m24_qp_22.pdf", "0610_m24_ms_22.pdf", "0610_m24_qp_22"),
        # May/June papers
        ("May June 2020", "0610_s20_qp_22.pdf", "0610_s20_ms_22.pdf", "0610_s20_qp_22"),
        ("May June 2021", "0610_s21_qp_22.pdf", "0610_s21_ms_22.pdf", "0610_s21_qp_22"),
        ("May June 2022", "0610_s22_qp_22.pdf", "0610_s22_ms_22.pdf", "0610_s22_qp_22"),
        ("May June 2023", "0610_s23_qp_22.pdf", "0610_s23_ms_22.pdf", "0610_s23_qp_22"),
        ("May June 2024", "0610_s24_qp_22.pdf", "0610_s24_ms_22.pdf", "0610_s24_qp_22"),
        # Oct/Nov papers
        ("October November 2020", "0610_w20_qp_22.pdf", "0610_w20_ms_22.pdf", "0610_w20_qp_22"),
        ("October November 2021", "0610_w21_qp_22.pdf", "0610_w21_ms_22.pdf", "0610_w21_qp_22"),
        ("October November 2022", "0610_w22_qp_22.pdf", "0610_w22_ms_22.pdf", "0610_w22_qp_22"),
        ("October November 2023", "0610_w23_qp_22.pdf", "0610_w23_ms_22.pdf", "0610_w23_qp_22"),
        ("October November 2024", "0610_w24_qp_22.pdf", "0610_w24_ms_22.pdf", "0610_w24_qp_22"),
    ]
    
    # Ensure directories exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)
    
    print("\n" + "="*60)
    print("GENERAL BIOLOGY PAPER PARSER")
    print("="*60)
    print(f"Total papers to process: {len(PAPERS)}")
    
    success_count = 0
    fail_count = 0
    
    for folder, qp_file, ms_file, paper_id in PAPERS:
        try:
            if process_paper(BASE_DIR, folder, qp_file, ms_file, paper_id, OUTPUT_DIR, IMAGE_DIR):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            print(f"  FATAL ERROR: {e}")
            fail_count += 1
    
    print("\n" + "="*60)
    print("PROCESSING COMPLETE")
    print("="*60)
    print(f"Success: {success_count}/{len(PAPERS)}")
    print(f"Failed: {fail_count}/{len(PAPERS)}")
    print("="*60)

if __name__ == "__main__":
    main()

# Made with Bob