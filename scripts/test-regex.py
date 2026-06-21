import re

tests = [
    '(a)',
    '(b) Some text',
    ' (a)',
    'Text (a)',
    '(a',
    'a)',
    '( a )',
    '(a) ',
]

print("Testing subpart marker detection:")
print("="*50)

for t in tests:
    matches = bool(re.match(r'^\([a-z]\)', t.strip()))
    print(f"{repr(t):20} -> {matches}")

# Made with Bob
