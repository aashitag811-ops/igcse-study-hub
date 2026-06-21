"""
Fix question text by removing question numbers/letters
"""
import json
import re
from pathlib import Path

def fix_question_text(question):
    """Remove question number/letter from text and junk codes"""
    # Main question: remove leading number (e.g., "5 Part of..." -> "Part of...")
    if 'text' in question and question['text']:
        question['text'] = re.sub(r'^\d{1,2}\s*', '', question['text']).strip()
        # Remove junk code pattern (e.g., "06_0417_12_2020_1.15")
        question['text'] = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', question['text']).strip()
    
    # Subparts: remove leading letter (e.g., "(a) Describe..." -> "Describe...")
    if 'subparts' in question:
        for subpart in question['subparts']:
            if 'text' in subpart and subpart['text']:
                subpart['text'] = re.sub(r'^\([a-z]\)\s*', '', subpart['text']).strip()
                # Also remove nested labels (e.g., "(i) The teacher..." -> "The teacher...")
                subpart['text'] = re.sub(r'^\([ivx]+\)\s*', '', subpart['text']).strip()
                # Remove junk code pattern
                subpart['text'] = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+', '', subpart['text']).strip()
    
    return question

def fix_paper(input_path, output_path=None):
    """Fix all questions in a paper"""
    if output_path is None:
        output_path = input_path
    
    print(f"Fixing: {input_path}")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Fix each question
    if 'questions' in data:
        for question in data['questions']:
            fix_question_text(question)
    
    # Save
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Fixed and saved to: {output_path}")

if __name__ == '__main__':
    # Fix all three papers
    papers = [
        'public/papers/0417_s20_qp_11.json',
        'public/papers/0417_s20_qp_12.json',
        'public/papers/0417_s20_qp_13.json'
    ]
    
    for paper in papers:
        if Path(paper).exists():
            fix_paper(paper)
        else:
            print(f"Not found: {paper}")

# Made with Bob
