import json

try:
    with open('public/papers/0417_s20_qp_11.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Valid JSON with {len(data['questions'])} questions")
except json.JSONDecodeError as e:
    print(f"JSON Error: {e}")

# Made with Bob
