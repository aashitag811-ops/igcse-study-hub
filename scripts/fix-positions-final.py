import json

# Load the JSON file
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# FINAL CORRECTED positions - x should be around 17-18% for the letters
corrections = {
    1: {
        "A": {"x": 17.5, "y": 46.0},
        "B": {"x": 17.5, "y": 54.0},
        "C": {"x": 17.5, "y": 62.0},
        "D": {"x": 17.5, "y": 70.0}
    },
    3: {
        "A": {"x": 17.5, "y": 48.0},
        "B": {"x": 17.5, "y": 56.0},
        "C": {"x": 17.5, "y": 64.0},
        "D": {"x": 17.5, "y": 72.0}
    },
    9: {
        "A": {"x": 17.5, "y": 56.0},
        "B": {"x": 17.5, "y": 63.0},
        "C": {"x": 17.5, "y": 70.0},
        "D": {"x": 17.5, "y": 77.0}
    },
    13: {
        "A": {"x": 17.5, "y": 70.0},
        "B": {"x": 17.5, "y": 76.0},
        "C": {"x": 17.5, "y": 82.0},
        "D": {"x": 17.5, "y": 88.0}
    },
    16: {
        "A": {"x": 17.5, "y": 50.0},
        "B": {"x": 17.5, "y": 57.0},
        "C": {"x": 17.5, "y": 64.0},
        "D": {"x": 17.5, "y": 71.0}
    },
    30: {
        "A": {"x": 28.0, "y": 46.0},
        "B": {"x": 45.0, "y": 72.0},
        "C": {"x": 67.0, "y": 46.0},
        "D": {"x": 78.0, "y": 60.0}
    },
    32: {
        "A": {"x": 17.5, "y": 76.0},
        "B": {"x": 17.5, "y": 82.0},
        "C": {"x": 17.5, "y": 88.0},
        "D": {"x": 17.5, "y": 94.0}
    },
    35: {
        "A": {"x": 17.5, "y": 83.0},
        "B": {"x": 17.5, "y": 89.0},
        "C": {"x": 17.5, "y": 95.0},
        "D": {"x": 17.5, "y": 101.0}
    },
    40: {
        "A": {"x": 22.0, "y": 50.0},
        "B": {"x": 36.0, "y": 66.0},
        "C": {"x": 51.0, "y": 33.0},
        "D": {"x": 71.0, "y": 58.0}
    }
}

# Update the positions
for question in data['questions']:
    q_num = question['questionNumber']
    if q_num in corrections:
        question['optionPositions'] = corrections[q_num]
        print(f"[OK] Updated Q{q_num} - moved x from 13% to 17.5%")

# Save the updated JSON
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[SUCCESS] Fixed x-position! Circles should now be ON the letters!")

# Made with Bob
