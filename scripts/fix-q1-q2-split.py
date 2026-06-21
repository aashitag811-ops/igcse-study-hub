import json

# Load the JSON file
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find Q1
for i, question in enumerate(data['questions']):
    if question['number'] == '1':
        print(f"Found Q1 with {len(question['subparts'])} subparts")
        
        # Q1 should have 2 subparts: (a) and (b)
        # Q2 should have 2 subparts: (a) and (b)
        # Currently Q1 has 4 subparts
        
        if len(question['subparts']) == 4:
            # Split: first 2 stay in Q1, last 2 become Q2
            q1_parts = question['subparts'][:2]
            q2_parts = question['subparts'][2:]
            
            # Update Q1
            question['subparts'] = q1_parts
            
            # Create Q2
            q2 = {
                "number": "2",
                "text": "",  # Q2 has no main text, just parts
                "marks": None,
                "type": None,
                "subparts": q2_parts
            }
            
            # Insert Q2 after Q1
            data['questions'].insert(i + 1, q2)
            
            print(f"\n[OK] Split Q1 into:")
            print(f"  Q1: {len(q1_parts)} parts - (a) and (b)")
            print(f"  Q2: {len(q2_parts)} parts - (a) and (b)")
            
            break

# Save the fixed JSON
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[OK] Fixed Q1/Q2 split in 0417_s20_qp_12.json")

# Made with Bob
