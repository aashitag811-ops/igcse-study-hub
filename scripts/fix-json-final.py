import json

# Read the file
with open('public/papers/0417_s20_qp_11.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into lines
lines = content.split('\n')

# The JSON should end at line 253 (index 252)
# Lines 254-255 are extra
fixed_content = '\n'.join(lines[:253])

# Write back
with open('public/papers/0417_s20_qp_11.json', 'w', encoding='utf-8') as f:
    f.write(fixed_content)

# Validate
try:
    with open('public/papers/0417_s20_qp_11.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"[SUCCESS] JSON is now valid!")
    print(f"[SUCCESS] Total questions: {len(data['questions'])}")
    for i, q in enumerate(data['questions'], 1):
        print(f"  Question {i}: {q['number']}")
except json.JSONDecodeError as e:
    print(f"[ERROR] JSON still has errors: {e}")

# Made with Bob
