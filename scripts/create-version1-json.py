"""
Create Version 1 JSON with all 40 questions
Format from MCQ_INTERFACE_HANDOFF.md
"""

import json

# Correct answers for all 40 questions (from marking scheme)
ANSWERS = {
    1: "B", 2: "B", 3: "B", 4: "D", 5: "C", 6: "A", 7: "B", 8: "D", 9: "C", 10: "A",
    11: "C", 12: "B", 13: "B", 14: "A", 15: "B", 16: "A", 17: "D", 18: "D", 19: "A", 20: "D",
    21: "C", 22: "C", 23: "B", 24: "D", 25: "C", 26: "A", 27: "A", 28: "A", 29: "B", 30: "C",
    31: "B", 32: "D", 33: "D", 34: "B", 35: "A", 36: "C", 37: "C", 38: "B", 39: "C", 40: "A"
}

# Create paper structure
paper = {
    "paperId": "0610_m20_qp_22",
    "paperName": "Biology Paper 2 - Feb/March 2020",
    "subject": "Biology",
    "syllabus": "0610",
    "year": 2020,
    "session": "m",
    "paper": "22",
    "totalQuestions": 40,
    "timeLimit": 2700,  # 45 minutes in seconds
    "questions": []
}

# Add all 40 questions
for q_num in range(1, 41):
    question = {
        "questionNumber": q_num,
        "imageUrl": f"/images/biology/questions/q{q_num}.png",
        "correctAnswer": ANSWERS.get(q_num, "A"),
        "marks": 1
    }
    paper["questions"].append(question)

# Save JSON
output_path = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\papers\0610_m20_qp_22.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(paper, f, indent=2, ensure_ascii=False)

print(f"SUCCESS: Created Version 1 JSON with {len(paper['questions'])} questions")
print(f"SUCCESS: Saved to: {output_path}")

# Made with Bob
