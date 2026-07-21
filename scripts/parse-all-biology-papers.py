import pdfplumber
import json
import re
import os
from pathlib import Path

# Base directory for Biology papers
BASE_DIR = r"C:\Users\sahal\Downloads\Biology 0610 Paper 2\Biology 0610 Paper 2"
OUTPUT_DIR = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"

# Paper configurations
PAPERS = [
    # Feb/March papers
    ("February March 2020", "0610_m20_qp_22.pdf", "0610_m20_ms_22.pdf", "0610_m20_qp_22"),
    ("February March 2021", "0610_m21_qp_22.pdf", "0610_m21_ms_22.pdf", "0610_m21_qp_22"),
    ("February March 2022", "0610_m22_qp_22.pdf", "0610_m22_ms_22.pdf", "0610_m22_qp_22"),
    ("February March 2023", "0610_m23_qp_22.pdf", "0610_m23_ms_22.pdf", "0610_m23_qp_22"),
    ("February March 2024", "0610_m24_qp_22.pdf", "0610_m24_ms_22.pdf", "0610_m24_qp_22"),
    ("February March 2025", "0610_m25_qp_22.pdf", "0610_m25_ms_22.pdf", "0610_m25_qp_22"),
    # May/June papers
    ("May June 2020", "0610_s20_qp_22.pdf", "0610_s20_ms_22.pdf", "0610_s20_qp_22"),
    ("May June 2021", "0610_s21_qp_22.pdf", "0610_s21_ms_22.pdf", "0610_s21_qp_22"),
    ("May June 2022", "0610_s22_qp_22.pdf", "0610_s22_ms_22.pdf", "0610_s22_qp_22"),
    ("May June 2023", "0610_s23_qp_22.pdf", "0610_s23_ms_22.pdf", "0610_s23_qp_22"),
    ("May June 2024", "0610_s24_qp_22.pdf", "0610_s24_ms_22.pdf", "0610_s24_qp_22"),
    ("May June 2025", "0610_s25_qp_22.pdf", "0610_s25_ms_22.pdf", "0610_s25_qp_22"),
    # Oct/Nov papers
    ("October November 2020", "0610_w20_qp_22.pdf", "0610_w20_ms_22.pdf", "0610_w20_qp_22"),
    ("October November 2021", "0610_w21_qp_22.pdf", "0610_w21_ms_22.pdf", "0610_w21_qp_22"),
    ("October November 2022", "0610_w22_qp_22.pdf", "0610_w22_ms_22.pdf", "0610_w22_qp_22"),
    ("October November 2023", "0610_w23_qp_22.pdf", "0610_w23_ms_22.pdf", "0610_w23_qp_22"),
    ("October November 2024", "0610_w24_qp_22.pdf", "0610_w24_ms_22.pdf", "0610_w24_qp_22"),
    ("October November 2025", "0610_w25_qp_22.pdf", "0610_w25_ms_22.pdf", "0610_w25_qp_22"),
]

def extract_answers_from_ms(ms_path):
    """Extract answers from marking scheme"""
    answers = {}
    try:
        with pdfplumber.open(ms_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
            
            # Look for answer patterns like "1 B", "2 C", etc.
            pattern = r'(\d+)\s+([A-D])'
            matches = re.findall(pattern, text)
            
            for q_num, answer in matches:
                q_num = int(q_num)
                if 1 <= q_num <= 40:
                    answers[q_num] = answer
            
            print(f"  Extracted {len(answers)} answers from marking scheme")
    except Exception as e:
        print(f"  Error extracting answers: {e}")
    
    return answers

def extract_questions_from_qp(qp_path):
    """Extract questions from question paper"""
    questions = []
    
    try:
        with pdfplumber.open(qp_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
            
            # Split by question numbers
            question_blocks = re.split(r'\n(\d+)\s+', text)
            
            for i in range(1, len(question_blocks), 2):
                if i + 1 < len(question_blocks):
                    q_num = int(question_blocks[i])
                    q_text = question_blocks[i + 1]
                    
                    if 1 <= q_num <= 40:
                        # Extract question text (before options)
                        lines = q_text.split('\n')
                        question_text = []
                        options = {'A': '', 'B': '', 'C': '', 'D': ''}
                        
                        current_option = None
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                            
                            # Check if line starts with option letter
                            option_match = re.match(r'^([A-D])\s+(.+)', line)
                            if option_match:
                                current_option = option_match.group(1)
                                options[current_option] = option_match.group(2).strip()
                            elif current_option:
                                # Continue previous option
                                options[current_option] += ' ' + line
                            else:
                                # Part of question text
                                question_text.append(line)
                        
                        # Only add if we have all 4 options
                        if all(options.values()):
                            questions.append({
                                'questionNumber': q_num,
                                'questionText': ' '.join(question_text),
                                'options': [
                                    {'letter': 'A', 'text': options['A']},
                                    {'letter': 'B', 'text': options['B']},
                                    {'letter': 'C', 'text': options['C']},
                                    {'letter': 'D', 'text': options['D']}
                                ],
                                'imageUrl': None
                            })
            
            print(f"  Extracted {len(questions)} questions")
    except Exception as e:
        print(f"  Error extracting questions: {e}")
    
    return questions

def process_paper(folder, qp_file, ms_file, output_name):
    """Process a single paper"""
    print(f"\nProcessing {output_name}...")
    
    qp_path = os.path.join(BASE_DIR, folder, qp_file)
    ms_path = os.path.join(BASE_DIR, folder, ms_file)
    
    if not os.path.exists(qp_path):
        print(f"  ERROR: Question paper not found: {qp_path}")
        return False
    
    if not os.path.exists(ms_path):
        print(f"  ERROR: Marking scheme not found: {ms_path}")
        return False
    
    # Extract data
    answers = extract_answers_from_ms(ms_path)
    questions = extract_questions_from_qp(qp_path)
    
    # Match answers to questions
    for question in questions:
        q_num = question['questionNumber']
        if q_num in answers:
            question['correctAnswer'] = answers[q_num]
        else:
            question['correctAnswer'] = 'A'  # Default fallback
            print(f"  WARNING: No answer found for Q{q_num}")
    
    # Create paper object
    paper = {
        'paperId': output_name,
        'title': f"Biology Paper 2 - {folder}",
        'subject': 'Biology',
        'code': '0610',
        'variant': '22',
        'totalQuestions': len(questions),
        'timeLimit': 2700,  # 45 minutes
        'questions': sorted(questions, key=lambda x: x['questionNumber'])
    }
    
    # Save to JSON
    output_path = os.path.join(OUTPUT_DIR, f"{output_name}.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(paper, f, indent=2, ensure_ascii=False)
    
    print(f"  SUCCESS: Saved to {output_path}")
    return True

def main():
    print("=" * 60)
    print("Biology Paper Parser - Batch Processing")
    print("=" * 60)
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    success_count = 0
    fail_count = 0
    
    for folder, qp_file, ms_file, output_name in PAPERS:
        try:
            if process_paper(folder, qp_file, ms_file, output_name):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            print(f"  FATAL ERROR: {e}")
            fail_count += 1
    
    print("\n" + "=" * 60)
    print(f"Processing Complete!")
    print(f"Success: {success_count}/{len(PAPERS)}")
    print(f"Failed: {fail_count}/{len(PAPERS)}")
    print("=" * 60)

if __name__ == "__main__":
    main()

# Made with Bob
