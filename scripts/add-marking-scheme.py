"""
Script to add marking scheme, grade thresholds, and examiner report to a paper's JSON file.

Usage:
    python add-marking-scheme.py 2025 m 2

This will:
1. Find the existing paper JSON (0417_m25_qp_12.json)
2. Prompt you to add marking scheme answers
3. Add grade thresholds
4. Add examiner report notes
5. Save the updated JSON
"""

import sys
import json
from pathlib import Path

def load_paper(year, season, variant):
    """Load existing paper JSON"""
    subject = "0417"
    year_short = str(year)[-2:]
    filename = f"{subject}_{season}{year_short}_qp_1{variant}.json"
    
    paper_path = Path(__file__).parent.parent / "public" / "papers" / filename
    
    if not paper_path.exists():
        print(f"❌ Paper not found: {paper_path}")
        print(f"Please convert the paper first using convert-paper-to-json.py")
        sys.exit(1)
    
    with open(paper_path, 'r', encoding='utf-8') as f:
        return json.load(f), paper_path

def add_marking_scheme(paper_data):
    """Add marking scheme answers to questions"""
    print("\n📝 Adding Marking Scheme")
    print("=" * 50)
    print("For each question, enter the marking scheme answer.")
    print("Press Enter to skip a question.")
    print("=" * 50)
    
    for question in paper_data['questions']:
        print(f"\n📌 Question {question['number']} ({question['totalMarks']} marks)")
        
        for part in question['parts']:
            print(f"\n  {part['id']}: {part['text'][:80]}...")
            print(f"  Marks: {part['marks']}")
            
            # Get marking scheme answer
            answer = input(f"  Answer for {part['id']}: ").strip()
            
            if answer:
                part['markingScheme'] = {
                    'answer': answer,
                    'marks': part['marks'],
                    'acceptableAnswers': []  # Can be filled in later
                }
                print(f"  ✅ Added marking scheme for {part['id']}")
            else:
                print(f"  ⏭️  Skipped {part['id']}")
    
    return paper_data

def add_grade_thresholds(paper_data):
    """Add grade thresholds"""
    print("\n📊 Adding Grade Thresholds")
    print("=" * 50)
    print(f"Total marks: {paper_data['totalMarks']}")
    print("Enter the minimum marks for each grade:")
    print("=" * 50)
    
    thresholds = {}
    grades = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
    
    for grade in grades:
        marks = input(f"  {grade}: ").strip()
        if marks:
            thresholds[grade] = int(marks)
    
    if thresholds:
        paper_data['gradeThresholds'] = thresholds
        print("  ✅ Grade thresholds added")
    else:
        print("  ⏭️  Skipped grade thresholds")
    
    return paper_data

def add_examiner_report(paper_data):
    """Add examiner report notes"""
    print("\n📋 Adding Examiner Report Notes")
    print("=" * 50)
    print("Enter general examiner report notes (or press Enter to skip):")
    print("=" * 50)
    
    notes = input("  General notes: ").strip()
    
    if notes:
        paper_data['examinerReport'] = {
            'generalNotes': notes,
            'commonMistakes': [],
            'goodPractices': []
        }
        print("  ✅ Examiner report added")
    else:
        print("  ⏭️  Skipped examiner report")
    
    return paper_data

def save_paper(paper_data, paper_path):
    """Save updated paper JSON"""
    with open(paper_path, 'w', encoding='utf-8') as f:
        json.dump(paper_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ SUCCESS!")
    print(f"📁 Updated: {paper_path}")

def main():
    if len(sys.argv) != 4:
        print("Usage: python add-marking-scheme.py <year> <season> <variant>")
        print("Example: python add-marking-scheme.py 2025 m 2")
        print("\nSeason codes: m=Feb/Mar, s=May/Jun, w=Oct/Nov")
        sys.exit(1)
    
    year = int(sys.argv[1])
    season = sys.argv[2].lower()
    variant = sys.argv[3]
    
    if season not in ['m', 's', 'w']:
        print("❌ Season must be m, s, or w")
        sys.exit(1)
    
    try:
        # Load existing paper
        paper_data, paper_path = load_paper(year, season, variant)
        print(f"✅ Loaded paper: {paper_path.name}")
        
        # Add marking scheme
        add_choice = input("\nAdd marking scheme? (y/n): ").lower()
        if add_choice == 'y':
            paper_data = add_marking_scheme(paper_data)
        
        # Add grade thresholds
        gt_choice = input("\nAdd grade thresholds? (y/n): ").lower()
        if gt_choice == 'y':
            paper_data = add_grade_thresholds(paper_data)
        
        # Add examiner report
        er_choice = input("\nAdd examiner report? (y/n): ").lower()
        if er_choice == 'y':
            paper_data = add_examiner_report(paper_data)
        
        # Save updated paper
        save_paper(paper_data, paper_path)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

# Made with Bob
