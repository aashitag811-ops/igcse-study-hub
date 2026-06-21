"""
Fix duplicate question numbers in parsed papers
"""

import json
import sys

def fix_duplicates(json_path):
    """Fix duplicate question numbers"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    questions = data['questions']
    seen_numbers = set()
    current_number = 1
    
    for i, q in enumerate(questions):
        # If we've seen this number before, increment
        if q['number'] in seen_numbers:
            current_number += 1
            q['number'] = str(current_number)
            print(f"Fixed duplicate: Question {i+1} renumbered to {current_number}")
        else:
            # Try to use the existing number if it's sequential
            try:
                num = int(q['number'])
                if num >= current_number:
                    current_number = num
                else:
                    current_number += 1
                    q['number'] = str(current_number)
                    print(f"Fixed out-of-order: Question {i+1} renumbered to {current_number}")
            except:
                current_number += 1
                q['number'] = str(current_number)
                print(f"Fixed invalid number: Question {i+1} renumbered to {current_number}")
        
        seen_numbers.add(q['number'])
    
    # Save fixed version
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nFixed! Saved to {json_path}")
    print(f"Total questions: {len(questions)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix-duplicate-questions.py <json_path>")
        print("Example: python fix-duplicate-questions.py public/papers/0417_s20_qp_12.json")
        sys.exit(1)
    
    fix_duplicates(sys.argv[1])

# Made with Bob
