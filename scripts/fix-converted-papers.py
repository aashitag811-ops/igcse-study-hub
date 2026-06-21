"""
Fix already converted JSON papers:
1. Clean garbled text and special characters
2. Fix hierarchy issues
3. Remove backwards "DO NOT WRITE" text

Usage:
    python fix-converted-papers.py
"""

import json
import re
from pathlib import Path

def clean_text(text):
    """Clean garbled text and special characters"""
    if not text:
        return text
    
    # Remove [Turn over and variations
    text = re.sub(r'\[Turn\s*over\]?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[Turnover\]?', '', text, flags=re.IGNORECASE)
    
    # Remove CID characters like (cid:300)
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    # Remove backwards "DO NOT WRITE IN THIS MARGIN"
    text = re.sub(r'NIGRAM SIHT NI ETIRW TON OD', '', text, flags=re.IGNORECASE)
    
    # Remove "BLANK PAGE" text
    text = re.sub(r'BLANK\s*PAGE', '', text, flags=re.IGNORECASE)
    
    # Remove copyright text
    text = re.sub(r'Permission to reproduce items.*?granted\.', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'©UCLES\d{4}', '', text)
    text = re.sub(r'UCLES\s*\d{4}', '', text)
    
    # Remove other common noise
    noise_patterns = [
        r'\*\d+\*',  # *0000800000003*
        r'\(cid:[^\)]+\)',  # Any cid references
        r'[^\x00-\x7F]+',  # Non-ASCII characters
        r'DO NOT WRITE IN THIS MARGIN',  # Forward version
    ]
    
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Add spaces between merged words (basic heuristic)
    # Look for lowercase followed by uppercase
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    return text


def fix_hierarchy(question):
    """Fix incorrectly nested questions"""
    if not question.get('subparts'):
        return question
    
    # Check if we have incorrectly nested roman numerals
    fixed_subparts = []
    
    for subpart in question['subparts']:
        # If this is a letter part (a, b, c) with roman numeral subparts
        if subpart.get('number') and len(subpart['number']) == 1 and subpart['number'].isalpha():
            if subpart.get('subparts'):
                # Check if subparts are roman numerals that should be siblings
                roman_subparts = subpart['subparts']
                
                # If the first subpart is 'i' or 'ii', these should be siblings of the parent
                if roman_subparts and roman_subparts[0].get('number') in ['i', 'ii', 'iii', 'iv', 'v']:
                    # This is wrong - flatten it
                    # Keep the parent as-is but without subparts
                    parent_copy = {
                        'number': subpart['number'],
                        'text': subpart.get('text', ''),
                        'marks': subpart.get('marks'),
                        'type': subpart.get('type', 'text')
                    }
                    fixed_subparts.append(parent_copy)
                    
                    # Add roman numerals as siblings
                    for roman in roman_subparts:
                        fixed_subparts.append(roman)
                else:
                    # Recursively fix nested subparts
                    subpart['subparts'] = [fix_hierarchy(sp) for sp in subpart['subparts']]
                    fixed_subparts.append(subpart)
            else:
                fixed_subparts.append(subpart)
        else:
            # Recursively fix if it has subparts
            if subpart.get('subparts'):
                subpart['subparts'] = [fix_hierarchy(sp) for sp in subpart['subparts']]
            fixed_subparts.append(subpart)
    
    question['subparts'] = fixed_subparts
    return question


def clean_question_recursive(question):
    """Recursively clean all text in a question"""
    if question.get('text'):
        question['text'] = clean_text(question['text'])
    
    if question.get('subparts'):
        question['subparts'] = [clean_question_recursive(sq) for sq in question['subparts']]
    
    return question


def fix_paper(paper_data):
    """Fix a single paper"""
    # Clean and fix each question
    if paper_data.get('questions'):
        fixed_questions = []
        for question in paper_data['questions']:
            # Clean text
            question = clean_question_recursive(question)
            # Fix hierarchy
            question = fix_hierarchy(question)
            fixed_questions.append(question)
        
        paper_data['questions'] = fixed_questions
    
    return paper_data


def main():
    papers_dir = Path(__file__).parent.parent / "public" / "papers"
    
    if not papers_dir.exists():
        print("❌ Papers directory not found!")
        return
    
    # Get all JSON files except sample
    json_files = [f for f in papers_dir.glob("0417_*.json")]
    
    if not json_files:
        print("❌ No papers found to fix!")
        return
    
    print(f"Found {len(json_files)} papers to fix\n")
    
    fixed_count = 0
    for json_file in json_files:
        print(f"Fixing: {json_file.name}")
        
        try:
            # Load
            with open(json_file, 'r', encoding='utf-8') as f:
                paper_data = json.load(f)
            
            # Fix
            paper_data = fix_paper(paper_data)
            
            # Save
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(paper_data, f, indent=2, ensure_ascii=False)
            
            print(f"  ✅ Fixed!")
            fixed_count += 1
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            continue
    
    print(f"\n{'='*60}")
    print(f"✅ Fixed {fixed_count}/{len(json_files)} papers")
    print(f"📁 Location: {papers_dir}")
    print("="*60)


if __name__ == '__main__':
    main()

# Made with Bob