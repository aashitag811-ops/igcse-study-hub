import json

# Load the JSON
with open('../public/papers/0610_m20_qp_22.json', 'r') as f:
    data = json.load(f)

# For questions where OCR only detected some letters,
# we'll use the detected x-coordinate for all letters in that question
fixes = {
    1: 12.56,  # OCR detected A, B, C at ~12.56, apply to D too
    3: 12.56,  # OCR detected C, apply to A, B, D
    9: 12.56,  # OCR detected A at wrong position, use standard
    13: 12.56, # OCR detected A, D, apply to B, C
    16: 12.56, # OCR detected A, C, apply to B, D
    32: 12.56, # OCR detected nothing, use standard
}

print("Completing missing letter positions...")
print("=" * 60)

for question in data['questions']:
    q_num = question['questionNumber']
    
    if q_num in fixes:
        target_x = fixes[q_num]
        
        # Apply to all letters
        for letter in ['A', 'B', 'C', 'D']:
            if letter in question['optionPositions']:
                old_x = question['optionPositions'][letter]['x']
                question['optionPositions'][letter]['x'] = target_x
                if old_x != target_x:
                    print(f"Q{q_num:2d} {letter}: Set x to {target_x}")

# Save
with open('../public/papers/0610_m20_qp_22.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 60)
print("SUCCESS! All letters now have consistent x-coordinates")
print("Refresh browser to see the final result!")

# Made with Bob