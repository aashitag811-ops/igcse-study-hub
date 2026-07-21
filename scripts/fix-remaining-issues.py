import json

# Load the JSON file
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix the remaining misaligned questions
additional_fixes = {
    16: {
        "A": {"x": 18.5, "y": 33.81},
        "B": {"x": 18.5, "y": 49.28},
        "C": {"x": 18.5, "y": 64.75},
        "D": {"x": 18.5, "y": 80.22}
    },
    35: {
        "A": {"x": 18.5, "y": 88.0},
        "B": {"x": 18.5, "y": 94.0},
        "C": {"x": 18.5, "y": 100.0},
        "D": {"x": 18.5, "y": 106.0}
    },
    40: {
        "A": {"x": 37.0, "y": 62.0},
        "B": {"x": 52.0, "y": 80.0},
        "C": {"x": 62.0, "y": 45.0},
        "D": {"x": 82.0, "y": 70.0}
    }
}

# Update the positions
fixed_count = 0
for question in data['questions']:
    q_num = question['questionNumber']
    if q_num in additional_fixes:
        question['optionPositions'] = additional_fixes[q_num]
        fixed_count += 1
        print(f"[FIXED] Q{q_num:2d} - Adjusted circle positions")

# Save the updated JSON
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Fixed {fixed_count} questions: Q16, Q35, Q40")
print("\nNOTE: Q32 image is CUT OFF - the question image needs to be re-extracted from PDF")
print("The image is missing option D at the bottom.")

# Made with Bob