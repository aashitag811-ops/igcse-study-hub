"""
Subject Configuration for Unified MCQ Parser
Defines rules and constraints for each subject's MCQ papers (2010-2025)
"""

SUBJECT_RULES = {
    "0610": {
        "name": "Biology",
        "total_questions": 40,
        "core_paper": "1",
        "extended_paper": "2",
        "time_limit": 2700,  # 45 minutes in seconds
        "has_diagrams": True,
        "question_pattern": r"^([1-3][0-9]|40)\s+",
        "option_pattern": r"^([A-D])\s+(.+)$"
    },
    "0620": {
        "name": "Chemistry",
        "total_questions": 40,
        "core_paper": "1",
        "extended_paper": "2",
        "time_limit": 2700,
        "has_diagrams": True,
        "question_pattern": r"^([1-3][0-9]|40)\s+",
        "option_pattern": r"^([A-D])\s+(.+)$"
    },
    "0625": {
        "name": "Physics",
        "total_questions": 40,
        "core_paper": "1",
        "extended_paper": "2",
        "time_limit": 2700,
        "has_diagrams": True,
        "question_pattern": r"^([1-3][0-9]|40)\s+",
        "option_pattern": r"^([A-D])\s+(.+)$"
    },
    "0455": {
        "name": "Economics",
        "total_questions": 30,
        "core_paper": "1",
        "extended_paper": "1",  # No separate extended paper
        "time_limit": 2700,
        "has_diagrams": False,
        "question_pattern": r"^([1-2][0-9]|30)\s+",
        "option_pattern": r"^([A-D])\s+(.+)$"
    },
    "0452": {
        "name": "Accounting",
        "total_questions": 35,
        "core_paper": "1",
        "extended_paper": "1",  # No separate extended paper
        "time_limit": 2700,
        "has_diagrams": False,
        "question_pattern": r"^([1-2][0-9]|3[0-5])\s+",
        "option_pattern": r"^([A-D])\s+(.+)$",
        "note": "Syllabus changed significantly - verify paper format before parsing"
    }
}

# Session code mappings
SESSION_CODES = {
    "m": "Feb/March",
    "s": "May/June",
    "w": "Oct/Nov"
}

# Reverse mapping for session names
SESSION_NAMES = {
    "Feb/March": "m",
    "May/June": "s",
    "Oct/Nov": "w"
}

# Paper tier mappings
PAPER_TIERS = {
    "1": "Core",
    "2": "Extended"
}

# Common footer patterns to ignore during parsing
FOOTER_PATTERNS = [
    r"^\[Turn over$",
    r"^Turn over$",
    r"^© UCLES",
    r"^© Cambridge",
    r"^\d{4}/\d{2}/[A-Z]/\d{2}$",  # Paper codes like 0610/22/O/N/20
    r"^Permission to reproduce",
    r"^BLANK PAGE$"
]

def get_subject_config(subject_code: str) -> dict:
    """
    Get configuration for a specific subject
    
    Args:
        subject_code: Subject code (e.g., "0610")
        
    Returns:
        Dictionary with subject configuration
        
    Raises:
        ValueError: If subject code is not supported
    """
    if subject_code not in SUBJECT_RULES:
        raise ValueError(f"Subject code {subject_code} not supported. Supported codes: {list(SUBJECT_RULES.keys())}")
    
    return SUBJECT_RULES[subject_code]

def parse_paper_code(paper_code: str) -> dict:
    """
    Parse a paper code into its components
    
    Args:
        paper_code: Paper code (e.g., "0610_m20_qp_22")
        
    Returns:
        Dictionary with parsed components
        
    Example:
        >>> parse_paper_code("0610_m20_qp_22")
        {
            'subject_code': '0610',
            'subject_name': 'Biology',
            'session': 'm',
            'session_name': 'Feb/March',
            'year': 2020,
            'paper_type': 'qp',
            'paper_number': '2',
            'variant': '2',
            'tier': 'Extended'
        }
    """
    parts = paper_code.split('_')
    
    if len(parts) != 4:
        raise ValueError(f"Invalid paper code format: {paper_code}")
    
    subject_code = parts[0]
    session_year = parts[1]
    paper_type = parts[2]
    paper_variant = parts[3]
    
    # Extract session and year
    session = session_year[0]
    year = 2000 + int(session_year[1:])
    
    # Extract paper number and variant
    paper_number = paper_variant[0]
    variant = paper_variant[1]
    
    # Get subject config
    config = get_subject_config(subject_code)
    
    # Determine tier
    tier = PAPER_TIERS.get(paper_number, "Unknown")
    
    return {
        'subject_code': subject_code,
        'subject_name': config['name'],
        'session': session,
        'session_name': SESSION_CODES.get(session, 'Unknown'),
        'year': year,
        'paper_type': paper_type,
        'paper_number': paper_number,
        'variant': variant,
        'tier': tier,
        'total_questions': config['total_questions'],
        'time_limit': config['time_limit']
    }

def generate_paper_code(subject_code: str, session: str, year: int, paper_number: str, variant: str) -> str:
    """
    Generate a paper code from components
    
    Args:
        subject_code: Subject code (e.g., "0610")
        session: Session code (m/s/w)
        year: Full year (e.g., 2020)
        paper_number: Paper number (1 or 2)
        variant: Variant number (1, 2, or 3)
        
    Returns:
        Paper code string
        
    Example:
        >>> generate_paper_code("0610", "m", 2020, "2", "2")
        "0610_m20_qp_22"
    """
    year_short = str(year)[-2:]
    return f"{subject_code}_{session}{year_short}_qp_{paper_number}{variant}"

def is_valid_subject(subject_code: str) -> bool:
    """Check if a subject code is valid"""
    return subject_code in SUBJECT_RULES

def get_all_subjects() -> list:
    """Get list of all supported subjects"""
    return [
        {
            'code': code,
            'name': config['name'],
            'total_questions': config['total_questions']
        }
        for code, config in SUBJECT_RULES.items()
    ]

if __name__ == "__main__":
    # Test the configuration
    print("=== Subject Configuration Test ===\n")
    
    # Test all subjects
    for code in SUBJECT_RULES.keys():
        config = get_subject_config(code)
        print(f"{config['name']} ({code}):")
        print(f"  Questions: {config['total_questions']}")
        print(f"  Core Paper: {config['core_paper']}, Extended Paper: {config['extended_paper']}")
        print(f"  Has Diagrams: {config['has_diagrams']}")
        print()
    
    # Test paper code parsing
    test_codes = [
        "0610_m20_qp_22",
        "0620_s21_qp_11",
        "0455_w23_qp_12"
    ]
    
    print("=== Paper Code Parsing Test ===\n")
    for code in test_codes:
        parsed = parse_paper_code(code)
        print(f"{code}:")
        print(f"  Subject: {parsed['subject_name']}")
        print(f"  Session: {parsed['session_name']} {parsed['year']}")
        print(f"  Tier: {parsed['tier']}")
        print(f"  Variant: {parsed['variant']}")
        print()

# Made with Bob
