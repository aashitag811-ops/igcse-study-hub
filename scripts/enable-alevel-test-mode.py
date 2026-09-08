"""
enable-alevel-test-mode.py
Marks all A-Level papers with real parsed questions as testModeAvailable: true
"""
import os, json, io
from pathlib import Path

PUBLIC_DIR = Path('public/papers')

ALEVEL_CODES = {str(i) for i in range(8000, 10000)}

updated = 0
for fn in sorted(os.listdir(PUBLIC_DIR)):
    if not fn.endswith('.json'): continue
    code = fn.split('_')[0]
    if not code.isdigit() or code not in ALEVEL_CODES: continue
    
    path = PUBLIC_DIR / fn
    with io.open(path, encoding='utf-8', errors='replace') as f:
        d = json.load(f)
    
    q = d.get('questions', [])
    if len(q) <= 2: continue  # not a real parsed paper
    if d.get('testModeAvailable'): continue  # already set
    
    d['testModeAvailable'] = True
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2)
    updated += 1

print(f'Updated {updated} A-Level papers to testModeAvailable: true')
