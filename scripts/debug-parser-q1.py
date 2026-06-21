import fitz
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = r"C:\Users\HP\Downloads\ICT 0417 Paper 1\ICT 0417 Paper 1\May June 2020\0417_s20_qp_11.pdf"

def clean_text(text):
    text = re.sub(r'\.{3,}', '', text)
    text = re.sub(r'©\s*\d{4}', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def is_question_number(text):
    text = text.strip()
    if re.match(r'^\d{1,2}$', text):
        num = int(text)
        return 1 <= num <= 12
    if re.search(r'\n(\d{1,2})$', text):
        match = re.search(r'\n(\d{1,2})$', text)
        num = int(match.group(1))
        return 1 <= num <= 12
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

doc = fitz.open(pdf_path)
all_blocks = []

for page_num in range(len(doc)):
    if page_num == 0:
        continue
    page = doc[page_num]
    blocks = page.get_text("blocks")
    for b in blocks:
        x0, y0, x1, y1, text, _, _ = b
        text_clean = clean_text(text)
        if len(text_clean) < 2:
            if not (is_question_number(text_clean) or is_subpart_marker(text_clean)):
                continue
        all_blocks.append({"page": page_num + 1, "y": y0, "text": text_clean})

# Parse
questions = []
current_question = None
current_subpart = None

for i, block in enumerate(all_blocks):
    text = block["text"]
    
    if is_question_number(text):
        q_num = get_question_number(text)
        
        # Extract text
        if re.match(r'^\d{1,2}$', text):
            q_text = ""
        else:
            q_text = re.sub(r'\n\d{1,2}$', '', text).strip()
        
        print(f"\n{'='*60}")
        print(f"Block {i}: QUESTION {q_num} DETECTED")
        print(f"  Text: {repr(text[:80])}")
        print(f"  Extracted q_text: {repr(q_text[:80])}")
        
        if current_subpart:
            current_question["subparts"].append(current_subpart)
            print(f"  → Saved subpart {current_subpart['letter']}")
        if current_question:
            print(f"  → Saved previous question {current_question['number']} with {len(current_question['subparts'])} subparts")
            questions.append(current_question)
        
        current_question = {"number": q_num, "text": q_text, "subparts": []}
        current_subpart = None
        
        if q_num == 2:
            print("\n→ Stopping at Question 2")
            break
        continue
    
    if current_question and is_subpart_marker(text):
        sp_letter = get_subpart_letter(text)
        
        if re.match(r'^\([a-z]\)', text):
            text_without_marker = re.sub(r'^\([a-z]\)\s*', '', text).strip()
        elif re.search(r'\n\([a-z]\)$', text):
            text_without_marker = re.sub(r'\n\([a-z]\)$', '', text).strip()
        else:
            text_without_marker = text
        
        print(f"\nBlock {i}: SUBPART ({sp_letter}) DETECTED")
        print(f"  Text: {repr(text[:80])}")
        print(f"  Extracted text: {repr(text_without_marker[:80])}")
        
        if current_subpart:
            current_question["subparts"].append(current_subpart)
            print(f"  → Saved previous subpart {current_subpart['letter']}")
        
        current_subpart = {"letter": sp_letter, "text": text_without_marker, "blocks": [block]}
        continue

if current_subpart:
    current_question["subparts"].append(current_subpart)
if current_question:
    questions.append(current_question)

print(f"\n{'='*60}")
print("BEFORE DUPLICATE REMOVAL:")
for q in questions:
    print(f"  Question {q['number']}: text={repr(q['text'][:50])}, subparts={len(q['subparts'])}")

# Duplicate removal
seen = {}
for q in questions:
    q_num = q["number"]
    if 1 <= q_num <= 12:
        if q_num not in seen:
            seen[q_num] = q
        else:
            print(f"\n→ DUPLICATE Q{q_num} found!")
            print(f"  Existing: text={repr(seen[q_num]['text'][:50])}, subparts={len(seen[q_num]['subparts'])}")
            print(f"  New: text={repr(q['text'][:50])}, subparts={len(q['subparts'])}")
            if len(q.get("subparts", [])) > len(seen[q_num].get("subparts", [])):
                print(f"  → Keeping NEW (more subparts)")
                seen[q_num] = q
            else:
                print(f"  → Keeping EXISTING")

questions = list(seen.values())

print(f"\n{'='*60}")
print("AFTER DUPLICATE REMOVAL:")
for q in questions:
    print(f"  Question {q['number']}: text={repr(q['text'][:50])}, subparts={len(q['subparts'])}")
    for sp in q['subparts']:
        print(f"    ({sp['letter']}): {repr(sp['text'][:50])}")

doc.close()

# Made with Bob
