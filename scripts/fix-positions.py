import json

# Load the JSON file
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Define the correct positions for each problematic question
corrections = {
    1: {
        "A": {"x": 13.0, "y": 46.0},
        "B": {"x": 13.0, "y": 56.0},
        "C": {"x": 13.0, "y": 66.0},
        "D": {"x": 13.0, "y": 76.0}
    },
    3: {
        "A": {"x": 13.0, "y": 48.0},
        "B": {"x": 13.0, "y": 58.0},
        "C": {"x": 13.0, "y": 68.0},
        "D": {"x": 13.0, "y": 78.0}
    },
    9: {
        "A": {"x": 13.0, "y": 60.0},
        "B": {"x": 13.0, "y": 68.0},
        "C": {"x": 13.0, "y": 76.0},
        "D": {"x": 13.0, "y": 84.0}
    },
    13: {
        "A": {"x": 13.0, "y": 72.0},
        "B": {"x": 13.0, "y": 79.0},
        "C": {"x": 13.0, "y": 86.0},
        "D": {"x": 13.0, "y": 93.0}
    },
    16: {
        "A": {"x": 13.0, "y": 52.0},
        "B": {"x": 13.0, "y": 60.0},
        "C": {"x": 13.0, "y": 68.0},
        "D": {"x": 13.0, "y": 76.0}
    },
    30: {
        "A": {"x": 27.0, "y": 48.0},
        "B": {"x": 43.0, "y": 75.0},
        "C": {"x": 65.0, "y": 48.0},
        "D": {"x": 78.0, "y": 62.0}
    },
    32: {
        "A": {"x": 13.0, "y": 78.0},
        "B": {"x": 13.0, "y": 84.0},
        "C": {"x": 13.0, "y": 90.0},
        "D": {"x": 13.0, "y": 96.0}
    },
    35: {
        "A": {"x": 13.0, "y": 85.0},
        "B": {"x": 13.0, "y": 91.0},
        "C": {"x": 13.0, "y": 97.0},
        "D": {"x": 13.0, "y": 103.0}
    },
    40: {
        "A": {"x": 20.0, "y": 52.0},
        "B": {"x": 35.0, "y": 68.0},
        "C": {"x": 50.0, "y": 35.0},
        "D": {"x": 72.0, "y": 60.0}
    }
}

# Update the positions
for question in data['questions']:
    q_num = question['questionNumber']
    if q_num in corrections:
        question['optionPositions'] = corrections[q_num]
        print(f"[OK] Updated Q{q_num}")

# Save the updated JSON
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[SUCCESS] All positions updated successfully!")

# Made with Bob
