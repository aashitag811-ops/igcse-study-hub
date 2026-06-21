import json

# Load the JSON file
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find Q3
for question in data['questions']:
    if question['number'] == '3':
        print(f"Found Q3 with {len(question['subparts'])} subparts")
        print(f"Q3 text: {question['text']}")
        print(f"Q3 marks: {question['marks']}")
        
        # Q3 should have 4 subparts (4 marks total)
        if len(question['subparts']) == 2 and question['marks'] == 4:
            print("\nQ3 is missing 2 blanks. Adding placeholders...")
            
            # Add two more subparts (c) and (d)
            question['subparts'].append({
                "number": "c",
                "text": "[Missing blank - needs manual review]",
                "marks": 1,
                "subparts": []
            })
            
            question['subparts'].append({
                "number": "d",
                "text": "[Missing blank - needs manual review]",
                "marks": 1,
                "subparts": []
            })
            
            print(f"Added subparts (c) and (d)")
            print(f"Q3 now has {len(question['subparts'])} subparts")
        
        break

# Save the fixed JSON
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[OK] Fixed Q3 blanks in 0417_s20_qp_12.json")
print("[NOTE] Subparts (c) and (d) have placeholder text - need to check PDF for actual text")

# Made with Bob
