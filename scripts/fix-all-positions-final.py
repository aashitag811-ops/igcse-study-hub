import json

# Load the JSON file
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# FINAL CORRECTED positions based on screenshots
# The letters appear at approximately x=13-14% for most questions
corrections = {
    1: {
        "A": {"x": 13.0, "y": 46.0},
        "B": {"x": 13.0, "y": 54.0},
        "C": {"x": 13.0, "y": 62.0},
        "D": {"x": 13.0, "y": 70.0}
    },
    3: {
        "A": {"x": 13.0, "y": 46.0},
        "B": {"x": 13.0, "y": 54.0},
        "C": {"x": 13.0, "y": 62.0},
        "D": {"x": 13.0, "y": 70.0}
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
    30: {
        "A": {"x": 27.0, "y": 47.0},
        "B": {"x": 43.0, "y": 74.0},
        "C": {"x": 65.0, "y": 46.0},
        "D": {"x": 76.0, "y": 62.0}
    },
    32: {
        "A": {"x": 13.0, "y": 72.0},
        "B": {"x": 13.0, "y": 78.0},
        "C": {"x": 13.0, "y": 85.0},
        "D": {"x": 13.0, "y": 92.0}
    },
    35: {
        "A": {"x": 13.0, "y": 88.0},
        "B": {"x": 13.0, "y": 94.0},
        "C": {"x": 13.0, "y": 100.0},
        "D": {"x": 13.0, "y": 106.0}
    },
    40: {
        "A": {"x": 27.0, "y": 62.0},
        "B": {"x": 42.0, "y": 80.0},
        "C": {"x": 52.0, "y": 45.0},
        "D": {"x": 72.0, "y": 70.0}
    }
}

# Update the positions
for question in data['questions']:
    q_num = question['questionNumber']
    if q_num in corrections:
        question['optionPositions'] = corrections[q_num]
        print(f"[OK] Fixed Q{q_num}")

# Save the updated JSON
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[SUCCESS] All positions fixed based on screenshots!")

# Made with Bob
