"""
Simple script to fix circle positions in MCQ JSON files
Sets all X positions to 8% (left of all content) to avoid overlapping
"""

import json
import sys
from pathlib import Path


def fix_positions(json_path: str, target_x: float = 8.0):
    """
    Fix circle positions by setting all X coordinates to a fixed value
    
    Args:
        json_path: Path to JSON file
        target_x: Target X position (percentage from left, default 8%)
    """
    # Load JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update all question positions
    updated_count = 0
    for question in data['questions']:
        if 'optionPositions' in question:
            for letter in ['A', 'B', 'C', 'D']:
                if letter in question['optionPositions']:
                    # Keep Y position, update X position
                    question['optionPositions'][letter]['x'] = target_x
                    updated_count += 1
    
    # Save updated JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Updated {updated_count} option positions")
    print(f"All circles now positioned at {target_x}% from left edge")
    print(f"Saved to: {json_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_circle_positions.py <json_file> [target_x]")
        print("Example: python fix_circle_positions.py ../public/papers/0610_m20_qp_22.json 8.0")
        sys.exit(1)
    
    json_path = sys.argv[1]
    target_x = float(sys.argv[2]) if len(sys.argv) > 2 else 8.0
    
    print(f"Fixing positions in: {Path(json_path).name}")
    print(f"Target X position: {target_x}%\n")
    
    try:
        fix_positions(json_path, target_x)
        print("\nSuccess! Refresh your browser to see the changes.")
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

# Made with Bob
