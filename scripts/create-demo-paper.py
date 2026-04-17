"""
Create a demo ICT paper to test the parser and UI
"""

import json
from pathlib import Path

demo_paper = {
    "id": "demo_parser_test",
    "subject": "ICT 0417",
    "year": 2024,
    "season": "Demo",
    "variant": 1,
    "totalMarks": 25,
    "duration": 90,
    "questions": [
        {
            "number": 1,
            "text": "Falyaz uses a computer system to manage his business.",
            "marks": None,
            "subparts": [
                {
                    "number": "a",
                    "text": "State what is meant by a computer system.",
                    "marks": 2,
                    "type": "text"
                },
                {
                    "number": "b",
                    "text": "Describe two advantages of using a computer system for business management.",
                    "marks": 4,
                    "type": "essay"
                }
            ]
        },
        {
            "number": 2,
            "text": "A school uses various input and output devices.",
            "marks": None,
            "subparts": [
                {
                    "number": "a",
                    "text": "Circle two items that are input devices: Keyboard, Monitor, Mouse, Printer, Scanner, Speaker",
                    "marks": 2,
                    "type": "mcq"
                },
                {
                    "number": "b",
                    "text": "Explain the difference between RAM and ROM.",
                    "marks": None,
                    "subparts": [
                        {
                            "number": "i",
                            "text": "Describe what RAM is used for.",
                            "marks": 2,
                            "type": "text"
                        },
                        {
                            "number": "ii",
                            "text": "Describe what ROM is used for.",
                            "marks": 2,
                            "type": "text"
                        }
                    ]
                }
            ]
        },
        {
            "number": 3,
            "text": "Name three types of secondary storage devices.",
            "marks": 3,
            "type": "numbered_list"
        },
        {
            "number": 4,
            "text": "A company uses a database to store customer information. Describe four features of database software that make it suitable for this purpose.",
            "marks": 8,
            "type": "essay"
        },
        {
            "number": 5,
            "text": "State two methods of data validation.",
            "marks": 2,
            "type": "numbered_list"
        }
    ]
}

# Save to public/papers
output_dir = Path(__file__).parent.parent / "public" / "papers"
output_dir.mkdir(parents=True, exist_ok=True)

output_path = output_dir / "demo_parser_test.json"

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(demo_paper, f, indent=2, ensure_ascii=False)

print(f"[+] Created demo paper: {output_path}")
print(f"[+] Total questions: {len(demo_paper['questions'])}")
print(f"[+] Total marks: {demo_paper['totalMarks']}")
print(f"\n[*] You can now view this paper at:")
print(f"    http://localhost:3000/practice/demo_parser_test")

# Made with Bob
