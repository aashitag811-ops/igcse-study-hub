"""
Fix Duplicate Questions - Keep only unique question numbers
"""

import json

# Load current JSON
json_path = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers\0610_m20_qp_22.json"

with open(json_path, 'r', encoding='utf-8') as f:
    paper = json.load(f)

print(f"Total questions before: {len(paper['questions'])}")

# Remove duplicates - keep first occurrence of each question number
seen = set()
unique_questions = []

for q in paper['questions']:
    qnum = q['questionNumber']
    if qnum not in seen:
        seen.add(qnum)
        unique_questions.append(q)
    else:
        print(f"Removing duplicate Q{qnum}")

# Sort by question number
unique_questions.sort(key=lambda x: x['questionNumber'])

# Update paper
paper['questions'] = unique_questions
paper['totalQuestions'] = len(unique_questions)

# Save
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(paper, f, indent=2, ensure_ascii=False)

print(f"\nTotal questions after: {len(unique_questions)}")
print(f"Question numbers: {sorted([q['questionNumber'] for q in unique_questions])}")

# Made with Bob
