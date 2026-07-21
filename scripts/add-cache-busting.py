"""
Add cache-busting version numbers to image URLs in JSON
"""

import json

# Read the JSON file
with open('public/papers/0610_m20_qp_22.json', 'r') as f:
    paper = json.load(f)

# Update all image URLs with cache-busting
for question in paper['questions']:
    # Remove old cache-busting if present
    image_url = question['imageUrl'].split('?')[0]
    # Add new cache-busting with timestamp
    question['imageUrl'] = f"{image_url}?v=20"

# Save updated JSON
with open('public/papers/0610_m20_qp_22.json', 'w') as f:
    json.dump(paper, f, indent=2)

print(f"Updated {len(paper['questions'])} questions with cache-busting v=20")
print("Browser will now reload all images with new versions")

# Made with Bob
