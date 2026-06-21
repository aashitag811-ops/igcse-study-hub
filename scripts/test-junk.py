import sys
sys.path.insert(0, 'scripts')
from production_parser import is_junk

test_lines = ['1', '2', '10', '(a)', 'The 2020 Olympic']

for line in test_lines:
    print(f'Is "{line}" junk? {is_junk(line)}')

# Made with Bob
