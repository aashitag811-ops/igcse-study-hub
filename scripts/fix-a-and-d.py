import json

# Load JSON
with open('../public/papers/0610_m20_qp_22.json', 'r') as f:
    data = json.load(f)

# B and C are correct at x=12.61 (from OCR)
# A and D need to match them
target_x = 12.61

questions_to_fix = [1, 3, 9, 13, 16, 32]

print("Fixing A and D to match B and C position...")
print("=" * 60)

for question in data['questions']:
    q_num = question['questionNumber']
    
    if q_num in questions_to_fix:
        for letter in ['A', 'D']:
            if letter in question['optionPositions']:
                old_x = question['optionPositions'][letter]['x']
                question['optionPositions'][letter]['x'] = target_x
                print(f"Q{q_num:2d} {letter}: Changed x from {old_x} to {target_x}")

# Save
with open('../public/papers/0610_m20_qp_22.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 60)
print(f"SUCCESS! A and D now at x={target_x} (matching B and C)")
print("All four letters should now be aligned!")

# Made with Bob