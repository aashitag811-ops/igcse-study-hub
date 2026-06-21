import json
import re

# Load the JSON file
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def fix_spacing(text):
    """Fix all spacing issues in text"""
    if not text:
        return text
    
    # Dictionary of broken words and their fixes
    # Format: 'broken word' -> 'fixed word'
    fixes = {
        # Common broken words from the paper
        r'\bDescri be\b': 'Describe',
        r'\bstra in\b': 'strain',
        r'\bin jury\b': 'injury',
        r'\bexpla in\b': 'explain',
        r'\bin to\b': 'into',
        r'\bin clude\b': 'include',
        r'\bwith in\b': 'within',
        r'\bin ternal\b': 'internal',
        r'\bbe tween\b': 'between',
        r'\bthe re\b': 'there',
        r'\bthe m\b': 'them',
        r'\bfor matting\b': 'formatting',
        r'\bin terface\b': 'interface',
        r'\bbe en\b': 'been',
        r'\bfor ecast\b': 'forecast',
        r'\bthe se\b': 'these',
        r'\bfor mula\b': 'formula',
        r'\bfor mulais\b': 'formula is',
        r'\bfor mulas\b': 'formulas',
        r'\bma in\b': 'main',
        r'\bthe teacher\s*has\s*typed\s*a\s*formula\s*in\s*cell': 'The teacher has typed a formula in cell',
        
        # Fix merged words (no space between)
        r'Aftershowingthepresentationtotheparentstheheadteacherwishestousethepresentation': 'After showing the presentation to the parents the headteacher wishes to use the presentation',
        r'Describethestepstakentocreatethegraph': 'Describe the steps taken to create the graph',
        r'in cludeinyouranswerthreeimprovements': 'include in your answer three improvements',
        
        # Fix "the teacher has typed a formula in cell"
        r'the teacherhastypedaformulaincell': 'The teacher has typed a formula in cell',
    }
    
    # Apply all fixes
    for pattern, replacement in fixes.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Additional cleanup
    # Fix multiple spaces
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

# Count fixes
fix_count = 0

# Fix spacing in all questions
def fix_question(q):
    global fix_count
    original_text = q['text']
    q['text'] = fix_spacing(q['text'])
    if original_text != q['text']:
        fix_count += 1
    
    if 'subparts' in q:
        for subpart in q['subparts']:
            fix_question(subpart)

for question in data['questions']:
    fix_question(question)

# Save the fixed JSON
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"[OK] Fixed spacing in {fix_count} text fields")
print("[OK] Updated 0417_s20_qp_12.json")

# Made with Bob
