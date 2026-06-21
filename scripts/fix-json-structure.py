import json

# Read the malformed JSON file
with open('public/papers/0417_s20_qp_11.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the extra closing bracket and brace at lines 252-253
lines = content.split('\n')

# The file should end with:
# Line 251: }
# Line 252: ]  <- closes questions array
# Line 253: }  <- closes root object

# But currently has:
# Line 251: }
# Line 252: ]  <- EXTRA
# Line 253: }  <- EXTRA
# Line 254: ]  <- closes questions array
# Line 255: }  <- closes root object

# Remove lines 252 and 253 (indices 251 and 252)
fixed_lines = lines[:251] + lines[253:]

# Write back
with open('public/papers/0417_s20_qp_11.json', 'w', encoding='utf-8') as f:
    f.write('\n'.join(fixed_lines))

# Validate
try:
    with open('public/papers/0417_s20_qp_11.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"[OK] JSON is now valid!")
    print(f"[OK] Total questions: {len(data['questions'])}")
except json.JSONDecodeError as e:
    print(f"[ERROR] JSON still has errors: {e}")

# Made with Bob
