import json

# Load JSON
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Simple rule: Change x=13.0 to x=14.33 for the broken questions
# This matches Q2 which is WORKING correctly
fixes = {
    1: 14.33,   # Currently 13.0, needs to be 14.33 like Q2
    3: 14.33,   # Currently 13.0, needs to be 14.33 like Q2
    9: 14.33,   # Currently 13.0, needs to be 14.33 like Q2
    13: 14.33,  # Currently 13.0, needs to be 14.33 like Q2
    16: 14.33,  # Needs adjustment
    32: 14.33,  # Currently 13.0, needs to be 14.33 like Q2
    35: 14.33,  # Currently 13.0, needs to be 14.33 like Q2
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
        print(f"[FIXED] Q{q_num:2d} - Changed x to {new_x} (matching Q2)")

# Save
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Fixed {len(fixes)} questions to match Q2's x-coordinate (14.33)")
print("These should now align properly with the letters!")

# Made with Bob