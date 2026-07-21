#!/usr/bin/env python3
"""Count parsed papers by subject"""

from pathlib import Path
import json

papers_dir = Path('public/papers')
subjects = {}

for f in papers_dir.glob('*.json'):
    code = f.name[:4]
    subjects[code] = subjects.get(code, 0) + 1

print('Subject Summary:')
print('=' * 50)
for code in sorted(subjects.keys()):
    print(f'  {code}: {subjects[code]} papers')

print('=' * 50)
print(f'Total: {sum(subjects.values())} papers')

# Made with Bob
