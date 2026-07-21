"""
Biology MCQ Parser
Extracts questions, images, and answers from Biology PDF papers and marking schemes
"""

import PyPDF2
import json
import re
import sys
from pathlib import Path
from pdf2image import convert_from_path
from PIL import Image
import io
import base64

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_images_from_pdf(pdf_path, output_dir):
    """Extract images from PDF and save them"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    images = []
    try:
        # Convert PDF pages to images
        pages = convert_from_path(pdf_path, dpi=300)
        
        for i, page in enumerate(pages):
            image_path = output_dir / f"page_{i+1}.png"
            page.save(str(image_path), 'PNG')
            images.append(str(image_path))
            print(f"Extracted page {i+1} as image")
    except Exception as e:
        print(f"Error extracting images: {e}")
    
    return images

def parse_mcq_questions(text):
    """Parse MCQ questions from text"""
    questions = []
    
    # Pattern to match question numbers (1-40 typically)
    question_pattern = r'(\d+)\s+(.*?)(?=\d+\s+[A-Z]|$)'
    
    # Split text into potential questions
    lines = text.split('\n')
    current_question = None
    current_text = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if line starts with a number (potential question)
        match = re.match(r'^(\d+)\s+(.+)', line)
        if match:
            # Save previous question
            if current_question:
                questions.append({
                    'number': current_question,
                    'text': ' '.join(current_text).strip()
                })
            
            current_question = int(match.group(1))
            current_text = [match.group(2)]
        elif current_question:
            current_text.append(line)
    
    # Add last question
    if current_question:
        questions.append({
            'number': current_question,
            'text': ' '.join(current_text).strip()
        })
    
    return questions

def parse_mcq_options(text):
    """Parse MCQ options (A, B, C, D) from text"""
    options_dict = {}
    
    # Pattern to match options
    option_pattern = r'([A-D])\s+([^\n]+)'
    
    lines = text.split('\n')
    current_question = None
    
    for line in lines:
        line = line.strip()
        
        # Check for question number
        q_match = re.match(r'^(\d+)', line)
        if q_match:
            current_question = int(q_match.group(1))
            options_dict[current_question] = []
        
        # Check for options
        opt_match = re.match(option_pattern, line)
        if opt_match and current_question:
            letter = opt_match.group(1)
            text = opt_match.group(2).strip()
            options_dict[current_question].append({
                'letter': letter,
                'text': text
            })
    
    return options_dict

def parse_marking_scheme(ms_text):
    """Parse marking scheme to extract correct answers"""
    answers = {}
    
    # Common patterns in marking schemes
    # Pattern 1: "1 B"
    pattern1 = r'(\d+)\s+([A-D])'
    
    # Pattern 2: "Question 1: B"
    pattern2 = r'Question\s+(\d+):\s+([A-D])'
    
    for match in re.finditer(pattern1, ms_text):
        q_num = int(match.group(1))
        answer = match.group(2)
        answers[q_num] = answer
    
    for match in re.finditer(pattern2, ms_text):
        q_num = int(match.group(1))
        answer = match.group(2)
        answers[q_num] = answer
    
    return answers

def create_mcq_json(qp_path, ms_path, output_path, paper_name):
    """Create JSON file with MCQ data"""
    print(f"Processing {paper_name}...")
    
    # Extract text from question paper
    print("Extracting question paper text...")
    qp_text = extract_text_from_pdf(qp_path)
    
    # Extract text from marking scheme
    print("Extracting marking scheme text...")
    ms_text = extract_text_from_pdf(ms_path)
    
    # Parse questions
    print("Parsing questions...")
    questions = parse_mcq_questions(qp_text)
    
    # Parse options
    print("Parsing options...")
    options = parse_mcq_options(qp_text)
    
    # Parse answers
    print("Parsing answers from marking scheme...")
    answers = parse_marking_scheme(ms_text)
    
    # Extract images
    print("Extracting images...")
    image_dir = Path(output_path).parent / "images" / Path(output_path).stem
    images = extract_images_from_pdf(qp_path, image_dir)
    
    # Combine data
    mcq_data = {
        "paperCode": Path(qp_path).stem,
        "paperName": paper_name,
        "subject": "Biology",
        "totalQuestions": len(questions),
        "timeLimit": 45,
        "questions": []
    }
    
    for q in questions:
        q_num = q['number']
        question_data = {
            "questionNumber": q_num,
            "questionText": q['text'],
            "imageUrl": None,  # Will be set if image exists
            "options": [],
            "correctAnswer": answers.get(q_num, "A")  # Default to A if not found
        }
        
        # Add options
        if q_num in options:
            for opt in options[q_num]:
                question_data["options"].append({
                    "letter": opt['letter'],
                    "text": opt['text']
                })
        else:
            # Default options if not found
            for letter in ['A', 'B', 'C', 'D']:
                question_data["options"].append({
                    "letter": letter,
                    "text": f"Option {letter}"
                })
        
        mcq_data["questions"].append(question_data)
    
    # Save JSON
    print(f"Saving to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(mcq_data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Successfully created {output_path}")
    print(f"  - Total questions: {len(questions)}")
    print(f"  - Answers found: {len(answers)}")
    print(f"  - Images extracted: {len(images)}")
    
    return mcq_data

if __name__ == "__main__":
    # Paths
    project_root = Path(__file__).parent.parent
    qp_path = project_root / "public" / "pdfs" / "0610_m20_qp_22.pdf"
    ms_path = project_root / "public" / "pdfs" / "0610_m20_ms_22.pdf"
    output_path = project_root / "public" / "papers" / "0610_m20_qp_22.json"
    
    if not qp_path.exists():
        print(f"Error: Question paper not found at {qp_path}")
        sys.exit(1)
    
    if not ms_path.exists():
        print(f"Error: Marking scheme not found at {ms_path}")
        sys.exit(1)
    
    # Create MCQ JSON
    create_mcq_json(
        str(qp_path),
        str(ms_path),
        str(output_path),
        "Biology Paper 2 - Feb/March 2020"
    )

# Made with Bob
