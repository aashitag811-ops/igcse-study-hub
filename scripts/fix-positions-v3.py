import json

# Load the JSON file
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# NEW positions based on actual visual placement in screenshots
# These are more accurate to where the letters actually appear
corrections = {
    1: {
        "A": {"x": 13.0, "y": 35.0},
        "B": {"x": 13.0, "y": 47.0},
        "C": {"x": 13.0, "y": 59.0},
        "D": {"x": 13.0, "y": 71.0}
    },
    3: {
        "A": {"x": 13.0, "y": 40.0},
        "B": {"x": 13.0, "y": 52.0},
        "C": {"x": 13.0, "y": 64.0},
        "D": {"x": 13.0, "y": 76.0}
    },
    9: {
        "A": {"x": 13.0, "y": 52.0},
        "B": {"x": 13.0, "y": 60.0},
        "C": {"x": 13.0, "y": 68.0},
        "D": {"x": 13.0, "y": 76.0}
    },
    13: {
        "A": {"x": 13.0, "y": 68.0},
        "B": {"x": 13.0, "y": 75.0},
        "C": {"x": 13.0, "y": 82.0},
        "D": {"x": 13.0, "y": 89.0}
    },
    16: {
        "A": {"x": 13.0, "y": 48.0},
        "B": {"x": 13.0, "y": 56.0},
        "C": {"x": 13.0, "y": 64.0},
        "D": {"x": 13.0, "y": 72.0}
    },
    30: {
        "A": {"x": 25.0, "y": 44.0},
        "B": {"x": 42.0, "y": 70.0},
        "C": {"x": 64.0, "y": 44.0},
        "D": {"x": 76.0, "y": 58.0}
    },
    32: {
        "A": {"x": 13.0, "y": 74.0},
        "B": {"x": 13.0, "y": 80.0},
        "C": {"x": 13.0, "y": 86.0},
        "D": {"x": 13.0, "y": 92.0}
    },
    35: {
        "A": {"x": 13.0, "y": 81.0},
        "B": {"x": 13.0, "y": 87.0},
        "C": {"x": 13.0, "y": 93.0},
        "D": {"x": 13.0, "y": 99.0}
    },
    40: {
        "A": {"x": 20.0, "y": 48.0},
        "B": {"x": 34.0, "y": 64.0},
        "C": {"x": 49.0, "y": 31.0},
        "D": {"x": 70.0, "y": 56.0}
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

print("\n[SUCCESS] All positions updated with adjusted coordinates!")

# Made with Bob
