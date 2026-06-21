import json

with open('public/papers/0417_s20_qp_12.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Paper: {data['id']}")
print(f"Total Questions: {len(data['questions'])}")
print(f"Total Marks: {data['totalMarks']}")
print("\nQuestions Summary:")
print("-" * 50)

for q in data['questions']:
    parts_count = len(q['subparts'])
    marks = q['marks'] if q['marks'] else 'null'
    print(f"Q{q['number']:2s}: {parts_count} parts, {marks} marks")
    
    # Show first 60 chars of question text
    text = q['text'][:60] + '...' if len(q['text']) > 60 else q['text']
    print(f"     {text}")
    print()

# Made with Bob
