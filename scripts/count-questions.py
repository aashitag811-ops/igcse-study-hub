import json

with open('public/papers/0417_s20_qp_12.json') as f:
    data = json.load(f)

print(f'Total questions: {len(data["questions"])}')
for q in data['questions']:
    subparts = q.get('subparts', [])
    print(f'Q{q["number"]}: {len(subparts)} subparts - {[s["number"] for s in subparts]}')

# Made with Bob
