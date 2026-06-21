import json
import re

# Load the JSON file
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find Q12
for question in data['questions']:
    if question['number'] == '12':
        print(f"Found Q12")
        print(f"Main text: {question['text'][:100]}...")
        print(f"Marks: {question['marks']}")
        print(f"Subparts: {len(question['subparts'])}")
        
        # Check if main text contains "(a)"
        main_text = question['text']
        match = re.match(r'\(a\)\s+(.+)', main_text.strip())
        
        if match:
            part_a_text = match.group(1).strip()
            part_a_marks = question['marks']  # Use the marks from the question itself
            
            print(f"\nFound (a) in main text:")
            print(f"  Text: {part_a_text[:80]}...")
            print(f"  Marks: {part_a_marks}")
            
            # Create new subpart (a)
            new_part_a = {
                "number": "a",
                "text": part_a_text,
                "marks": part_a_marks,
                "subparts": []
            }
            
            # Insert at beginning of subparts
            question['subparts'].insert(0, new_part_a)
            
            # Clear main text
            question['text'] = ""
            question['marks'] = None
            
            print(f"\nFixed Q12 structure:")
            print(f"  Main text: (empty)")
            print(f"  Subparts: {len(question['subparts'])}")
            print(f"    (a): {new_part_a['marks']} marks")
            if len(question['subparts']) > 1:
                print(f"    (b): {question['subparts'][1]['marks']} marks")
        else:
            print("\nNo (a) pattern found in main text")
        
        break

# Save the fixed JSON
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[OK] Fixed Q12 structure in 0417_s20_qp_12.json")

# Made with Bob
