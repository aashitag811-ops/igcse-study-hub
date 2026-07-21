"""
Restore original circle positions
Sets X positions back to their original detected values
"""

import json

# Original positions from the parser before any modifications
ORIGINAL_POSITIONS = {
    1: {'A': {'x': 12.61, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.61, 'y': 70.0}},
    2: {'A': {'x': 14.33, 'y': 48.9}, 'B': {'x': 14.33, 'y': 60.5}, 'C': {'x': 14.33, 'y': 72.1}, 'D': {'x': 14.33, 'y': 83.7}},
    3: {'A': {'x': 12.61, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.61, 'y': 70.0}},
    4: {'A': {'x': 12.56, 'y': 13.08}, 'B': {'x': 12.56, 'y': 21.35}, 'C': {'x': 12.56, 'y': 29.81}, 'D': {'x': 12.56, 'y': 38.08}},
    5: {'A': {'x': 12.56, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.56, 'y': 70.0}},
    6: {'A': {'x': 12.56, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.56, 'y': 70.0}},
    7: {'A': {'x': 12.56, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.56, 'y': 70.0}},
    8: {'A': {'x': 12.56, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.56, 'y': 70.0}},
    9: {'A': {'x': 12.56, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.56, 'y': 70.0}},
    10: {'A': {'x': 12.56, 'y': 46.0}, 'B': {'x': 12.56, 'y': 54.0}, 'C': {'x': 12.56, 'y': 62.0}, 'D': {'x': 12.56, 'y': 70.0}},
    # For questions 11-40, use default 12.56%
}

def restore_positions(json_path: str):
    """Restore original X positions"""
    
    # Load JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Restore positions
    for question in data['questions']:
        q_num = question['questionNumber']
        
        if q_num in ORIGINAL_POSITIONS:
            # Use stored original positions
            question['optionPositions'] = ORIGINAL_POSITIONS[q_num]
        else:
            # Use default X position of 12.56% for other questions
            if 'optionPositions' in question:
                for letter in ['A', 'B', 'C', 'D']:
                    if letter in question['optionPositions']:
                        question['optionPositions'][letter]['x'] = 12.56
    
    # Save
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Restored original positions in: {json_path}")
    print("Positions restored to 12-14% range")

if __name__ == "__main__":
    json_path = "../public/papers/0610_m20_qp_22.json"
    restore_positions(json_path)
    print("\nSuccess! Refresh your browser.")

# Made with Bob
