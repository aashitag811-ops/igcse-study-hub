yes """
Batch Re-parse All Biology MCQ Papers with Examiner Report Integration
Processes all Biology Paper 1 and Paper 2 variants with ER notes
"""

import pdfplumber
import json
import re
import os
from pathlib import Path

# Configuration
PASTPAPERS_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\scripts\pastpapers"
OUTPUT_DIR = r"C:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers"

# Exclusion zones
TOP_EXCLUSION = 50
BOTTOM_EXCLUSION = 80

# Noise patterns
NOISE_PATTERNS = [
    r'©\s*UCLES\s*\d{4}',
    r'\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}',
    r'\[Turn over',
    r'Turn over\]',
    r'Cambridge IGCSE',
    r'Cambridge International',
    r'Page \d+',
]

def is_noise(text):
    """Check if text is footer/header noise"""
    if not text or len(text.strip()) < 2:
        return True
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_er_notes(er_path):
    """Extract examiner report notes for each question"""
    er_notes = {}
    
    if not os.path.exists(er_path):
        return er_notes
    
    try:
        with pdfplumber.open(er_path) as pdf:
            full_text = ""
            
            for page in pdf.pages:
                bbox = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                text = cropped.extract_text() or ""
                
                lines = text.split('\n')
                clean_lines = [line for line in lines if not is_noise(line)]
                full_text += '\n'.join(clean_lines) + '\n'
            
            # Split by question markers
            question_sections = re.split(r'\n(?:Question\s+)?(\d{1,2})\s*\n', full_text)
            
            for i in range(1, len(question_sections), 2):
                if i + 1 < len(question_sections):
                    q_num = int(question_sections[i])
                    content = question_sections[i + 1].strip()
                    
                    if 1 <= q_num <= 40 and content:
                        paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
                        if paragraphs:
                            er_note = paragraphs[0]
                            if len(er_note) > 500:
                                er_note = er_note[:497] + "..."
                            er_notes[q_num] = er_note
            
    except Exception as e:
        print(f"      Error reading ER: {e}")
    
    return er_notes

def extract_answers_from_ms(ms_path):
    """Extract answers from marking scheme"""
    answers = {}
    
    try:
        with pdfplumber.open(ms_path) as pdf:
            full_text = ""
            
            for page in pdf.pages:
                bbox = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                text = cropped.extract_text() or ""
                
                lines = text.split('\n')
                clean_lines = [line for line in lines if not is_noise(line)]
                full_text += '\n'.join(clean_lines) + '\n'
            
            pattern = r'(\d+)\s+([A-D])'
            
            for line in full_text.split('\n'):
                line = line.strip()
                match = re.search(pattern, line)
                if match:
                    q_num = int(match.group(1))
                    answer = match.group(2)
                    if 1 <= q_num <= 40:
                        answers[q_num] = answer
            
    except Exception as e:
        print(f"      Error reading MS: {e}")
    
    return answers

def parse_mcq_paper(qp_path, ms_path, er_path):
    """Parse MCQ paper with ER notes integration"""
    questions = []
    
    try:
        with pdfplumber.open(qp_path) as pdf:
            page_texts = []
            for page_num, page in enumerate(pdf.pages):
                bbox = (0, TOP_EXCLUSION, page.width, page.height - BOTTOM_EXCLUSION)
                cropped = page.within_bbox(bbox)
                text = cropped.extract_text() or ""
                
                lines = text.split('\n')
                clean_lines = [line for line in lines if not is_noise(line)]
                clean_text = '\n'.join(clean_lines)
                
                page_texts.append({'page_num': page_num, 'text': clean_text})
            
            full_text = '\n'.join([pt['text'] for pt in page_texts])
            
            question_pattern = r'\n(\d{1,2})\s+([A-Z][^\n]{10,})'
            matches = list(re.finditer(question_pattern, full_text))
            
            processed_questions = set()
            
            for i, match in enumerate(matches):
                q_num = int(match.group(1))
                
                if not (1 <= q_num <= 40) or q_num in processed_questions:
                    continue
                
                processed_questions.add(q_num)
                
                start_pos = match.start()
                end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
                question_block = full_text[start_pos:end_pos].strip()
                
                lines = question_block.split('\n')
                question_text_lines = []
                options = {'A': '', 'B': '', 'C': '', 'D': ''}
                current_option = None
                found_options = False
                
                for line in lines[1:]:
                    line = line.strip()
                    if not line:
                        continue
                    
                    option_match = re.match(r'^([A-D])\s+(.+)', line)
                    if option_match:
                        found_options = True
                        current_option = option_match.group(1)
                        options[current_option] = option_match.group(2).strip()
                    elif current_option and found_options:
                        options[current_option] += ' ' + line
                    else:
                        question_text_lines.append(line)
                
                if all(options.values()):
                    questions.append({
                        'questionNumber': q_num,
                        'questionText': ' '.join(question_text_lines),
                        'options': [
                            {'letter': 'A', 'text': options['A']},
                            {'letter': 'B', 'text': options['B']},
                            {'letter': 'C', 'text': options['C']},
                            {'letter': 'D', 'text': options['D']}
                        ],
                        'imageUrl': None,
                        'additionalImages': []
                    })
            
    except Exception as e:
        print(f"      Error parsing QP: {e}")
    
    # Extract answers and ER notes
    answers = extract_answers_from_ms(ms_path)
    er_notes = extract_er_notes(er_path)
    
    # Map to questions
    for question in questions:
        q_num = question['questionNumber']
        question['correctAnswer'] = answers.get(q_num, 'A')
        question['examinerReportNote'] = er_notes.get(q_num, None)
    
    return questions, len(er_notes)

def process_biology_papers():
    """Process all Biology MCQ papers (Paper 1 and 2)"""
    
    subject_code = "0610"
    subject_name = "Biology"
    biology_dir = os.path.join(PASTPAPERS_DIR, f"{subject_code}-{subject_name}")
    
    if not os.path.exists(biology_dir):
        print(f"Biology directory not found: {biology_dir}")
        return
    
    years = [d for d in os.listdir(biology_dir) if os.path.isdir(os.path.join(biology_dir, d)) and d.isdigit()]
    years.sort()
    
    total_processed = 0
    total_with_er = 0
    
    for year in years:
        year_dir = os.path.join(biology_dir, year)
        sessions = [d for d in os.listdir(year_dir) if os.path.isdir(os.path.join(year_dir, d))]
        
        for session in sessions:
            session_dir = os.path.join(year_dir, session)
            
            # Determine session code
            session_code = session[0].lower()  # m, s, w
            
            # Process Paper 1 and Paper 2 (MCQ papers)
            for paper in ['1', '2']:
                for variant in ['1', '2', '3']:
                    qp_file = f"{subject_code}_{session_code}{year[2:]}_qp_{paper}{variant}.pdf"
                    ms_file = f"{subject_code}_{session_code}{year[2:]}_ms_{paper}{variant}.pdf"
                    er_file = f"{subject_code}_{session_code}{year[2:]}_er.pdf"
                    
                    qp_path = os.path.join(session_dir, qp_file)
                    ms_path = os.path.join(session_dir, ms_file)
                    er_path = os.path.join(session_dir, er_file)
                    
                    if not os.path.exists(qp_path) or not os.path.exists(ms_path):
                        continue
                    
                    paper_id = f"{subject_code}_{session_code}{year[2:]}_qp_{paper}{variant}"
                    
                    print(f"\n  Processing: {paper_id}")
                    
                    questions, er_count = parse_mcq_paper(qp_path, ms_path, er_path)
                    
                    if not questions:
                        print(f"    SKIP: No questions extracted")
                        continue
                    
                    # Create paper object
                    paper = {
                        'paperId': paper_id,
                        'title': f'{subject_name} Paper {paper} - {session} {year}',
                        'subject': subject_name,
                        'code': subject_code,
                        'variant': f'{paper}{variant}',
                        'totalQuestions': len(questions),
                        'timeLimit': 2700,
                        'questions': sorted(questions, key=lambda x: x['questionNumber'])
                    }
                    
                    # Save to JSON
                    output_path = os.path.join(OUTPUT_DIR, f'{paper_id}.json')
                    with open(output_path, 'w', encoding='utf-8') as f:
                        json.dump(paper, f, indent=2, ensure_ascii=False)
                    
                    total_processed += 1
                    if er_count > 0:
                        total_with_er += 1
                    
                    print(f"    OK: {len(questions)} questions, {er_count} with ER notes")
    
    return total_processed, total_with_er

def main():
    print("="*70)
    print("BATCH RE-PARSE: BIOLOGY MCQ PAPERS WITH EXAMINER REPORTS")
    print("="*70)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    total, with_er = process_biology_papers()
    
    print("\n" + "="*70)
    print(f"COMPLETE: Processed {total} Biology MCQ papers")
    print(f"Papers with ER notes: {with_er}")
    print("="*70)

if __name__ == "__main__":
    main()

# Made with Bob
