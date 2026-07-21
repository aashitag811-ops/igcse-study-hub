import json

# Load JSON
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Try x=18.5% for the broken questions
# This is a common position for letters in PDF layouts
fixes = {
    1: 18.5,
    3: 18.5,
    9: 18.5,
    13: 18.5,
    16: 18.5,
    32: 18.5,
    35: 18.5,
}

# Apply fixes
for question in data['questions']:
    q_num = question['questionNumber']
    if q_num in fixes:
        new_x = fixes[q_num]
        # Update x for all options, keep y the same
        for option in ['A', 'B', 'C', 'D']:
            if option in question['optionPositions']:
                question['optionPositions'][option]['x'] = new_x
        print(f"[FIXED] Q{q_num:2d} - Changed x to {new_x}%")

# Save
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Changed {len(fixes)} questions to x=18.5%")
print("Refresh browser and check if circles are now on the letters!")

# Made with Bob