"""
Update JSON to use full question images instead of text
"""

import json
import os

json_path = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers\0610_m20_qp_22.json"

# Load current JSON
with open(json_path, 'r', encoding='utf-8') as f:
    paper = json.load(f)

# Update each question to use image-only format
for q in paper['questions']:
    qnum = q['questionNumber']
    
    # Set image URL to the full question image
    q['imageUrl'] = f"/images/biology/questions/q{qnum}.png"
    
    # Keep options as just letters (no text needed since it's in the image)
    q['options'] = [
        {"letter": "A", "text": ""},
        {"letter": "B", "text": ""},
        {"letter": "C", "text": ""},
        {"letter": "D", "text": ""}
    ]
    
    # Clear question text (it's in the image)
    q['questionText'] = ""
    
    # Clear additional images
    q['additionalImages'] = []

# Save updated JSON
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(paper, f, indent=2, ensure_ascii=False)

print(f"Updated {len(paper['questions'])} questions to use full images")
print("Each question now displays as a complete image with clickable A, B, C, D circles")

# Made with Bob
