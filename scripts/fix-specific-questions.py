import json

# Load the JSON file
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix ONLY the questions shown in screenshots
# Based on Q2, Q5, Q6 examples - circles should be at x≈18.5-19% for vertical layouts
targeted_fixes = {
    1: {
        "A": {"x": 18.5, "y": 46.0},
        "B": {"x": 18.5, "y": 54.0},
        "C": {"x": 18.5, "y": 62.0},
        "D": {"x": 18.5, "y": 70.0}
    },
    3: {
        "A": {"x": 18.5, "y": 46.0},
        "B": {"x": 18.5, "y": 54.0},
        "C": {"x": 18.5, "y": 62.0},
        "D": {"x": 18.5, "y": 70.0}
    },
    9: {
        "A": {"x": 18.5, "y": 60.0},
        "B": {"x": 18.5, "y": 68.0},
        "C": {"x": 18.5, "y": 76.0},
        "D": {"x": 18.5, "y": 84.0}
    },
    13: {
        "A": {"x": 18.5, "y": 72.0},
        "B": {"x": 18.5, "y": 79.0},
        "C": {"x": 18.5, "y": 86.0},
        "D": {"x": 18.5, "y": 93.0}
    },
    30: {
        "A": {"x": 35.0, "y": 47.0},
        "B": {"x": 51.0, "y": 74.0},
        "C": {"x": 73.0, "y": 46.0},
        "D": {"x": 84.0, "y": 62.0}
    },
    32: {
        "A": {"x": 18.5, "y": 72.0},
        "B": {"x": 18.5, "y": 78.0},
        "C": {"x": 18.5, "y": 85.0},
        "D": {"x": 18.5, "y": 92.0}
    },
    35: {
        "A": {"x": 18.5, "y": 88.0},
        "B": {"x": 18.5, "y": 94.0},
        "C": {"x": 18.5, "y": 100.0},
        "D": {"x": 18.5, "y": 106.0}
    },
    40: {
        "A": {"x": 35.0, "y": 62.0},
        "B": {"x": 50.0, "y": 80.0},
        "C": {"x": 60.0, "y": 45.0},
        "D": {"x": 80.0, "y": 70.0}
    }
}

# Update ONLY the specified questions
fixed_count = 0
for question in data['questions']:
    q_num = question['questionNumber']
    if q_num in targeted_fixes:
        question['optionPositions'] = targeted_fixes[q_num]
        fixed_count += 1
        print(f"[FIXED] Q{q_num:2d} - Moved circles RIGHT to align with letters")

# Save the updated JSON
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Fixed {fixed_count} questions: Q1, Q3, Q9, Q13, Q30, Q32, Q35, Q40")
print("All other questions remain unchanged!")

# Made with Bob
