import re

def is_junk(text):
    """Check if line is junk (watermarks, page numbers, etc.)"""
    # Check length first, but BEFORE that, preserve single digits
    if len(text) < 2:
        # Exception: single digits could be question numbers 1-9
        if re.match(r'^\d$', text):
            return False
        return True
    
    junk_patterns = [
        r'www\.dynamicpapers\.com',
        r'©\s*UCLES\s*\d{4}',
        r'^\s*\d{4}/\d{2}/[A-Z]/[A-Z]/\d{2}\s*$',
        r'^\s*\[Turn over\s*$',
        r'^\s*BLANK PAGE\s*$',
        r'^\s*\*+\s*\d+\s*\*+\s*$',
        r'^Cambridge',
        r'^Permission to reproduce',
        r'^University of Cambridge',
    ]
    
    for pattern in junk_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return True
    
    return False

# Test
test_cases = ['1', '2', '10', 'a', '', 'Question 1']
for test in test_cases:
    result = is_junk(test)
    print(f"is_junk('{test}'): {result}")

# Made with Bob
