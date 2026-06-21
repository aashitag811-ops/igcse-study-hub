import re
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Simulate the blocks
blocks = [
    {"text": "A computer consists of both hardware and software.\n1", "y": 63.0},
    {"text": "Define the term software.\n(a)", "y": 89.3},
    {"text": "[2]", "y": 206.3},
    {"text": "There are two types of software.", "y": 242.6},
    {"text": "Identify the types.", "y": 268.9},
    {"text": "(b)", "y": 242.6},
]

def is_question_number(text):
    text = text.strip()
    if re.match(r'^\d{1,2}$', text):
        return True
    if re.search(r'\n(\d{1,2})$', text):
        return True
    return False

def get_question_number(text):
    text = text.strip()
    if re.match(r'^\d{1,2}$', text):
        return int(text)
    match = re.search(r'\n(\d{1,2})$', text)
    if match:
        return int(match.group(1))
    return None

def is_subpart_marker(text):
    text = text.strip()
    if re.match(r'^\([a-z]\)(\s|$)', text):
        return True
    if re.search(r'\n\([a-z]\)$', text):
        return True
    return False

def get_subpart_letter(text):
    text = text.strip()
    match = re.match(r'^\(([a-z])\)', text)
    if match:
        return match.group(1)
    match = re.search(r'\n\(([a-z])\)$', text)
    if match:
        return match.group(1)
    return None

# Simulate parsing
questions = []
current_question = None
current_subpart = None

for i, block in enumerate(blocks):
    text = block["text"]
    print(f"\n{'='*60}")
    print(f"Processing Block {i}: {repr(text[:50])}")
    
    if is_question_number(text):
        print("  → Detected as QUESTION NUMBER")
        q_num = get_question_number(text)
        print(f"  → Question number: {q_num}")
        
        # Extract text before question number
        if re.match(r'^\d{1,2}$', text):
            q_text = ""
        else:
            q_text = text.split('\n')[0] if '\n' in text else ""
        print(f"  → Question text: {repr(q_text)}")
        
        if current_subpart:
            print(f"  → Saving previous subpart: {current_subpart['letter']}")
            current_question["subparts"].append(current_subpart)
        if current_question:
            print(f"  → Saving previous question: {current_question['number']}")
            questions.append(current_question)
        
        current_question = {"number": q_num, "text": q_text, "subparts": []}
        current_subpart = None
        continue
    
    if current_question and is_subpart_marker(text):
        print("  → Detected as SUBPART MARKER")
        sp_letter = get_subpart_letter(text)
        print(f"  → Subpart letter: {sp_letter}")
        
        # Extract text
        if re.match(r'^\([a-z]\)', text):
            text_without_marker = re.sub(r'^\([a-z]\)\s*', '', text).strip()
        elif re.search(r'\n\([a-z]\)$', text):
            text_without_marker = re.sub(r'\n\([a-z]\)$', '', text).strip()
        else:
            text_without_marker = text
        print(f"  → Subpart text: {repr(text_without_marker)}")
        
        if current_subpart:
            print(f"  → Saving previous subpart: {current_subpart['letter']}")
            current_question["subparts"].append(current_subpart)
        
        current_subpart = {"letter": sp_letter, "text": text_without_marker}
        continue
    
    # Add to current subpart or question
    if current_subpart:
        print(f"  → Adding to subpart {current_subpart['letter']}")
        if current_subpart["text"]:
            current_subpart["text"] += " " + text
        else:
            current_subpart["text"] = text
    elif current_question:
        print(f"  → Adding to question {current_question['number']}")
        if current_question["text"]:
            current_question["text"] += " " + text
        else:
            current_question["text"] = text

# Save last
if current_subpart:
    current_question["subparts"].append(current_subpart)
if current_question:
    questions.append(current_question)

print(f"\n{'='*60}")
print("FINAL RESULT:")
print(f"{'='*60}")
for q in questions:
    print(f"\nQuestion {q['number']}: {repr(q['text'][:50])}")
    for sp in q['subparts']:
        print(f"  Subpart ({sp['letter']}): {repr(sp['text'][:50])}")

# Made with Bob
