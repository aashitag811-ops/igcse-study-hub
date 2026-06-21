import json

# Load the JSON file
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find Q4
for question in data['questions']:
    if question['number'] == '4':
        print(f"Found Q4 with {len(question['subparts'])} subparts")
        
        # Current structure: (a), (b), (i), (c)
        # Should be: (a), (b) with (i) and (ii) inside, (c)
        
        subparts = question['subparts']
        
        # Find indices
        a_idx = next((i for i, s in enumerate(subparts) if s['number'] == 'a'), None)
        b_idx = next((i for i, s in enumerate(subparts) if s['number'] == 'b'), None)
        i_idx = next((i for i, s in enumerate(subparts) if s['number'] == 'i'), None)
        c_idx = next((i for i, s in enumerate(subparts) if s['number'] == 'c'), None)
        
        if a_idx is not None and b_idx is not None and i_idx is not None and c_idx is not None:
            print(f"Found: (a) at {a_idx}, (b) at {b_idx}, (i) at {i_idx}, (c) at {c_idx}")
            
            # Get the (i) part
            part_i = subparts[i_idx]
            
            # Get (ii) from inside (i)
            if part_i['subparts'] and len(part_i['subparts']) > 0:
                part_ii = part_i['subparts'][0]
                print(f"Found (ii) nested under (i)")
                
                # Move (ii) to same level as (i)
                part_i['subparts'] = []
                
                # Move both (i) and (ii) under (b)
                subparts[b_idx]['subparts'] = [part_i, part_ii]
                
                # Remove (i) from top level
                subparts.pop(i_idx)
                
                print(f"\nFixed Q4 structure:")
                print(f"  (a): {subparts[a_idx]['marks']} marks")
                print(f"  (b): {len(subparts[b_idx]['subparts'])} subparts")
                print(f"    (i): {subparts[b_idx]['subparts'][0]['marks']} marks")
                print(f"    (ii): {subparts[b_idx]['subparts'][1]['marks']} marks")
                print(f"  (c): {subparts[c_idx-1]['marks']} marks")  # c_idx shifted after pop
        
        break

# Save the fixed JSON
with open('igcse-study-hub/public/papers/0417_s20_qp_12.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[OK] Fixed Q4 structure in 0417_s20_qp_12.json")

# Made with Bob
