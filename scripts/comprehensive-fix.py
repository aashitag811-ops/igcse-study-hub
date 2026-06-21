"""
Comprehensive fix for converted papers:
1. Convert "Circle/Tick" questions to MCQ format
2. Ensure all questions with marks have proper structure
3. Remove duplicate question numbers
4. Clean text thoroughly
5. Fix hierarchy issues

Usage:
    python comprehensive-fix.py
"""

import json
import re
from pathlib import Path
from collections import defaultdict

def clean_text(text):
    """Aggressively clean text"""
    if not text:
        return text
    
    # Remove all the noise
    noise_patterns = [
        r'\[Turn\s*over\]?',
        r'\[Turnover\]?',
        r'BLANK\s*PAGE',
        r'Permission to reproduce.*?granted\.',
        r'©UCLES\d{4}',
        r'UCLES\s*\d{4}',
        r'DO NOT WRITE IN THIS MARGIN',
        r'NIGRAM SIHT NI ETIRW TON OD',
        r'\(cid:\d+\)',
        r'\*\d+\*',
        r'[^\x00-\x7F]+',
    ]
    
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
    
    # Add spaces between merged words
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_options_from_text(text):
    """Extract options from 'Circle X items' text"""
    # Common patterns: "Circle two items... Option1 Option2 Option3"
    # or "Tick()... Option1 () Option2 () Option3"
    
    # Remove the instruction part
    text_lower = text.lower()
    if 'circle' in text_lower or 'tick' in text_lower:
        # Split by common delimiters
        parts = re.split(r'\s{2,}|\n', text)
        
        # Filter out instruction text and empty parts
        options = []
        for part in parts:
            part = part.strip()
            # Skip if it's the instruction
            if any(word in part.lower() for word in ['circle', 'tick', 'which', 'select', 'choose']):
                continue
            # Skip if too short or has parentheses only
            if len(part) < 2 or part == '()':
                continue
            # Clean up
            part = re.sub(r'^\(\)\s*', '', part)  # Remove leading ()
            part = re.sub(r'\s*\(\)$', '', part)  # Remove trailing ()
            if part:
                options.append(part)
        
        return options if len(options) >= 2 else None
    
    return None


def should_be_mcq(question):
    """Determine if a question should be MCQ based on text"""
    if not question.get('text'):
        return False
    
    text_lower = question['text'].lower()
    mcq_keywords = ['circle', 'tick', 'select', 'choose']
    
    return any(keyword in text_lower for keyword in mcq_keywords)


def convert_to_mcq(question):
    """Convert a text question to MCQ format"""
    options = extract_options_from_text(question['text'])
    
    if options:
        # Extract the instruction part
        text = question['text']
        for opt in options:
            text = text.replace(opt, '')
        text = clean_text(text)
        
        # Determine max selections from marks (usually 1 mark per selection)
        marks = question.get('marks', 2)
        max_selections = marks if marks else 2
        
        question['type'] = 'mcq'
        question['options'] = options
        question['maxSelections'] = max_selections
        question['text'] = text
    
    return question


def ensure_answer_input(question):
    """Ensure questions with marks have proper answer input"""
    # If has marks but no type, set type to text
    if question.get('marks') and not question.get('type'):
        question['type'] = 'text'
    
    # If has marks and subparts, it's a parent - remove marks
    if question.get('marks') and question.get('subparts'):
        question['marks'] = None
    
    return question


def remove_duplicate_numbers(questions):
    """Remove questions with duplicate numbers"""
    seen_numbers = set()
    unique_questions = []
    
    for q in questions:
        num = q.get('number')
        if num not in seen_numbers:
            seen_numbers.add(num)
            unique_questions.append(q)
        else:
            print(f"  ⚠️  Removed duplicate question {num}")
    
    return unique_questions


def is_junk_question(question):
    """Identify junk questions (table data, etc.)"""
    text = question.get('text', '')
    
    # Very short text with no marks
    if len(text) < 10 and not question.get('marks'):
        return True
    
    # Just numbers or single words
    if re.match(r'^\d+$', text.strip()):
        return True
    
    # Table-like data (multiple numbers separated by spaces)
    if re.match(r'^[\d\s\.]+$', text.strip()):
        return True
    
    return False


def fix_question_recursive(question):
    """Recursively fix a question and its subparts"""
    # Clean text
    if question.get('text'):
        question['text'] = clean_text(question['text'])
    
    # Convert to MCQ if needed
    if should_be_mcq(question):
        question = convert_to_mcq(question)
    
    # Ensure proper answer input
    question = ensure_answer_input(question)
    
    # Fix subparts recursively
    if question.get('subparts'):
        question['subparts'] = [
            fix_question_recursive(sq) 
            for sq in question['subparts']
            if not is_junk_question(sq)
        ]
    
    return question


def fix_paper(paper_data):
    """Fix entire paper"""
    if not paper_data.get('questions'):
        return paper_data
    
    # Remove junk questions
    questions = [q for q in paper_data['questions'] if not is_junk_question(q)]
    
    # Remove duplicates
    questions = remove_duplicate_numbers(questions)
    
    # Fix each question
    questions = [fix_question_recursive(q) for q in questions]
    
    paper_data['questions'] = questions
    
    # Recalculate total marks
    def count_marks(qs):
        total = 0
        for q in qs:
            if q.get('marks'):
                total += q['marks']
            if q.get('subparts'):
                total += count_marks(q['subparts'])
        return total
    
    paper_data['totalMarks'] = count_marks(questions)
    
    return paper_data


def main():
    papers_dir = Path(__file__).parent.parent / "public" / "papers"
    
    if not papers_dir.exists():
        print("❌ Papers directory not found!")
        return
    
    json_files = [f for f in papers_dir.glob("0417_*.json")]
    
    if not json_files:
        print("❌ No papers found!")
        return
    
    print(f"Found {len(json_files)} papers to fix\n")
    
    fixed_count = 0
    for json_file in json_files:
        print(f"Fixing: {json_file.name}")
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                paper_data = json.load(f)
            
            original_q_count = len(paper_data.get('questions', []))
            
            paper_data = fix_paper(paper_data)
            
            new_q_count = len(paper_data.get('questions', []))
            
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(paper_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✅ Fixed! ({original_q_count} → {new_q_count} questions, {paper_data['totalMarks']} marks)")
            fixed_count += 1
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\n{'='*60}")
    print(f"✅ Fixed {fixed_count}/{len(json_files)} papers")
    print("="*60)


if __name__ == '__main__':
    main()

# Made with Bob