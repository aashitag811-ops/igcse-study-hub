# Marking Scheme, Grade Thresholds & Examiner Reports Guide

Complete guide for adding marking schemes, grade thresholds (GT), and examiner reports to papers.

## Overview

Each paper JSON can contain:
1. **Questions** - Already added by `convert-paper-to-json.py`
2. **Marking Scheme** - Correct answers for each question
3. **Grade Thresholds** - Minimum marks for each grade (A*, A, B, etc.)
4. **Examiner Report** - Common mistakes and good practices

## Workflow

### Step 1: Convert Paper First

```powershell
cd scripts
python convert-paper-to-json.py 2025 m 2
```

This creates: `public/papers/0417_m25_qp_12.json` with questions only.

### Step 2: Add Marking Scheme

```powershell
python add-marking-scheme.py 2025 m 2
```

This will prompt you to add:
- Marking scheme answers for each question
- Grade thresholds
- Examiner report notes

### Step 3: Commit Everything

```powershell
cd ..
git add public/papers/
git commit -m "Add 2025 Feb/Mar Paper 2 with marking scheme"
git push origin main
```

## Example: Complete Paper JSON Structure

```json
{
  "id": "0417_2025_m_2",
  "subject": "ICT 0417",
  "year": 2025,
  "season": "February March",
  "variant": 2,
  "totalMarks": 80,
  "duration": 90,
  
  "questions": [
    {
      "number": 1,
      "totalMarks": 10,
      "parts": [
        {
          "id": "1a",
          "text": "State two advantages of cloud storage.",
          "marks": 2,
          "level": 1,
          "parentId": "1",
          "markingScheme": {
            "answer": "Access from anywhere; Automatic backups",
            "marks": 2,
            "acceptableAnswers": [
              "Can access files from any device",
              "Files are backed up automatically",
              "No need for physical storage",
              "Scalable storage space"
            ]
          }
        }
      ]
    }
  ],
  
  "gradeThresholds": {
    "A*": 72,
    "A": 64,
    "B": 56,
    "C": 48,
    "D": 40,
    "E": 32,
    "F": 24,
    "G": 16
  },
  
  "examinerReport": {
    "generalNotes": "Most candidates performed well on practical questions but struggled with theory.",
    "commonMistakes": [
      "Confusing RAM and ROM",
      "Not providing enough detail in explanations",
      "Missing units in numerical answers"
    ],
    "goodPractices": [
      "Clear diagrams with labels",
      "Step-by-step explanations",
      "Using technical terminology correctly"
    ]
  }
}
```

## Adding Marking Schemes Manually

If you prefer to edit the JSON directly:

1. Open the paper JSON in VS Code
2. Add `markingScheme` to each question part:

```json
{
  "id": "1a",
  "text": "Question text here",
  "marks": 2,
  "markingScheme": {
    "answer": "The correct answer",
    "marks": 2,
    "acceptableAnswers": [
      "Alternative answer 1",
      "Alternative answer 2"
    ]
  }
}
```

3. Add grade thresholds at the root level:

```json
{
  "gradeThresholds": {
    "A*": 72,
    "A": 64,
    "B": 56,
    "C": 48,
    "D": 40,
    "E": 32,
    "F": 24,
    "G": 16
  }
}
```

4. Add examiner report at the root level:

```json
{
  "examinerReport": {
    "generalNotes": "Overall performance notes",
    "commonMistakes": ["Mistake 1", "Mistake 2"],
    "goodPractices": ["Good practice 1", "Good practice 2"]
  }
}
```

## Where to Find This Information

### Marking Schemes
- Download from PapaCambridge: `0417_m25_ms_12.pdf`
- Or from Cambridge website (if you have access)

### Grade Thresholds
- Download from Cambridge: `0417_m25_gt.pdf`
- Usually published a few months after the exam

### Examiner Reports
- Download from Cambridge: `0417_m25_er.pdf`
- Contains valuable insights on common mistakes

## Batch Processing

To add marking schemes to multiple papers:

```powershell
# Convert all papers first
python convert-paper-to-json.py 2024 m 1
python convert-paper-to-json.py 2024 m 2
python convert-paper-to-json.py 2024 m 3

# Add marking schemes one by one
python add-marking-scheme.py 2024 m 1
python add-marking-scheme.py 2024 m 2
python add-marking-scheme.py 2024 m 3

# Commit all together
cd ..
git add public/papers/
git commit -m "Add 2024 Feb/Mar papers with marking schemes"
git push origin main
```

## Important Notes

1. **Marking schemes are optional** - Papers work without them, but they're needed for auto-grading
2. **Grade thresholds vary** - Different exam sessions have different thresholds
3. **Examiner reports are valuable** - Help students understand common mistakes
4. **Commit everything together** - Keep questions and marking schemes in sync

## Future: Auto-Grading

Once marking schemes are added, we can build the auto-grading system that:
- Compares student answers to marking scheme
- Awards marks based on acceptable answers
- Provides feedback based on examiner reports
- Calculates final grade using grade thresholds

This is the next phase after we have enough papers with marking schemes! 🎯