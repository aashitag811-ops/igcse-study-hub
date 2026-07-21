import json

# Load the JSON file
with open('../public/papers/0610_m20_qp_22.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Based on the screenshots, these are the corrected positions
# The y-coordinates are percentages of the image height where the letters appear
corrections = {
    1: {
        "A": {"x": 13.0, "y": 40.0},
        "B": {"x": 13.0, "y": 52.0},
        "C": {"x": 13.0, "y": 64.0},
        "D": {"x": 13.0, "y": 76.0}
    },
    3: {
        "A": {"x": 13.0, "y": 44.0},
        "B": {"x": 13.0, "y": 56.0},
        "C": {"x": 13.0, "y": 68.0},
        "D": {"x": 13.0, "y": 80.0}
    },
    9: {
        "A": {"x": 13.0, "y": 56.0},
        "B": {"x": 13.0, "y": 64.0},
        "C": {"x": 13.0, "y": 72.0},
        "D": {"x": 13.0, "y": 80.0}
    },
    13: {
        "A": {"x": 13.0, "y": 70.0},
        "B": {"x": 13.0, "y": 77.0},
        "C": {"x": 13.0, "y": 84.0},
        "D": {"x": 13.0, "y": 91.0}
    },
    16: {
        "A": {"x": 13.0, "y": 50.0},
        "B": {"x": 13.0, "y": 58.0},
        "C": {"x": 13.0, "y": 66.0},
        "D": {"x": 13.0, "y": 74.0}
    },
    30: {
        "A": {"x": 28.0, "y": 46.0},
        "B": {"x": 44.0, "y": 72.0},
        "C": {"x": 66.0, "y": 46.0},
        "D": {"x": 77.0, "y": 60.0}
    },
    32: {
        "A": {"x": 13.0, "y": 76.0},
        "B": {"x": 13.0, "y": 82.0},
        "C": {"x": 13.0, "y": 88.0},
        "D": {"x": 13.0, "y": 94.0}
    },
    35: {
        "A": {"x": 13.0, "y": 83.0},
        "B": {"x": 13.0, "y": 89.0},
        "C": {"x": 13.0, "y": 95.0},
        "D": {"x": 13.0, "y": 101.0}
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
        print(f"[OK] Updated Q{q_num}")

# Save the updated JSON
with open('../public/papers/0610_m20_qp_22.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n[SUCCESS] All positions updated successfully!")
print("Please hard refresh your browser (Ctrl+Shift+R) to see the changes.")

# Made with Bob
