"""
Simple Biology MCQ Parser
Uses pdfplumber to extract questions and answers from Biology PDFs
"""

import pdfplumber
import json
import re
import sys
from pathlib import Path

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber"""
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

def parse_biology_mcq(qp_text, ms_text):
    """Parse Biology MCQ questions and answers"""
    
    # Extract answers from marking scheme
    answers = {}
    ms_lines = ms_text.split('\n')
    
    for line in ms_lines:
        # Pattern: "1 B" or "1. B" or "1) B"
        match = re.match(r'^\s*(\d+)[\s\.\)]+([A-D])\s*$', line.strip())
        if match:
            q_num = int(match.group(1))
            answer = match.group(2)
            answers[q_num] = answer
    
    # Parse questions from question paper
    questions = []
    qp_lines = qp_text.split('\n')
    
    current_q = None
    current_text = []
    current_options = {}
    
    for line in qp_lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for question number (1-40)
        q_match = re.match(r'^(\d+)\s+(.+)', line)
        if q_match and 1 <= int(q_match.group(1)) <= 40:
            # Save previous question
            if current_q:
                questions.append({
                    'number': current_q,
                    'text': ' '.join(current_text),
                    'options': current_options
                })
            
            current_q = int(q_match.group(1))
            current_text = [q_match.group(2)]
            current_options = {}
        
        # Check for options (A, B, C, D)
        opt_match = re.match(r'^([A-D])\s+(.+)', line)
        if opt_match and current_q:
            letter = opt_match.group(1)
            text = opt_match.group(2).strip()
            current_options[letter] = text
        elif current_q and not opt_match:
            # Continue question text
            current_text.append(line)
    
    # Add last question
    if current_q:
        questions.append({
            'number': current_q,
            'text': ' '.join(current_text),
            'options': current_options
        })
    
    return questions, answers

def create_mcq_json(qp_path, ms_path, output_path, paper_info):
    """Create MCQ JSON file"""
    print(f"\n{'='*60}")
    print(f"Processing: {paper_info['paperName']}")
    print(f"{'='*60}\n")
    
    # Extract text
    print("📄 Extracting question paper text...")
    qp_text = extract_text_from_pdf(qp_path)
    
    print("📄 Extracting marking scheme text...")
    ms_text = extract_text_from_pdf(ms_path)
    
    # Parse
    print("🔍 Parsing questions and answers...")
    questions, answers = parse_biology_mcq(qp_text, ms_text)
    
    # Build JSON structure
    mcq_data = {
        "paperCode": paper_info['paperCode'],
        "paperName": paper_info['paperName'],
        "subject": paper_info['subject'],
        "totalQuestions": len(questions),
        "timeLimit": paper_info['timeLimit'],
        "questions": []
    }
    
    for q in questions:
        q_num = q['number']
        
        # Build options array
        options_array = []
        for letter in ['A', 'B', 'C', 'D']:
            options_array.append({
                "letter": letter,
                "text": q['options'].get(letter, f"Option {letter}")
            })
        
        question_data = {
            "questionNumber": q_num,
            "questionText": q['text'],
            "imageUrl": None,
            "options": options_array,
            "correctAnswer": answers.get(q_num, "A")
        }
        
        mcq_data["questions"].append(question_data)
    
    # Save JSON
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(mcq_data, f, indent=2, ensure_ascii=False)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"✅ SUCCESS!")
    print(f"{'='*60}")
    print(f"📁 Output: {output_path}")
    print(f"📊 Total Questions: {len(questions)}")
    print(f"✓ Answers Found: {len(answers)}")
    print(f"⏱️  Time Limit: {paper_info['timeLimit']} minutes")
    print(f"{'='*60}\n")
    
    return mcq_data

if __name__ == "__main__":
    # Paths
    project_root = Path(__file__).parent.parent
    qp_path = project_root / "public" / "pdfs" / "0610_m20_qp_22.pdf"
    ms_path = project_root / "public" / "pdfs" / "0610_m20_ms_22.pdf"
    output_path = project_root / "public" / "papers" / "0610_m20_qp_22.json"
    
    # Check files exist
    if not qp_path.exists():
        print(f"❌ Error: Question paper not found at {qp_path}")
        sys.exit(1)
    
    if not ms_path.exists():
        print(f"❌ Error: Marking scheme not found at {ms_path}")
        sys.exit(1)
    
    # Paper info
    paper_info = {
        'paperCode': '0610_m20_qp_22',
        'paperName': 'Biology Paper 2 - Feb/March 2020',
        'subject': 'Biology',
        'timeLimit': 45
    }
    
    # Create MCQ JSON
    create_mcq_json(str(qp_path), str(ms_path), str(output_path), paper_info)

# Made with Bob
