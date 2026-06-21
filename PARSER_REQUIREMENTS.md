# Parser Requirements - Complete Specification

## Based on demo_perfect_ui.json and user feedback

### Question Structure
```json
{
  "number": "1",
  "text": "Main question text",
  "marks": null,
  "subparts": [
    {
      "number": "a",
      "text": "Subpart text",
      "marks": 2,
      "type": "text"
    }
  ]
}
```

### Question Types

#### 1. **text** - Standard text answer
- For definitions, explanations
- Single text box
- Example: "Define the term software." [2 marks]

#### 2. **numbered_list** - Multiple numbered answer lines
- For "List", "Name", "Identify", "State" questions
- Shows numbered lines (1, 2, 3, 4...)
- `listCount` = number of marks
```json
{
  "type": "numbered_list",
  "listCount": 4
}
```

#### 3. **essay** - Long answer (6+ marks)
- For "Describe", "Explain", "Discuss", "Compare"
- Large text area
- 6 or more marks

#### 4. **matrix_tick_table** - Tick table with radio buttons
- **CRITICAL**: Must have `table` structure
- Shows table with radio buttons per row
- Example from screenshots:
```json
{
  "type": "matrix_tick_table",
  "table": {
    "headers": ["Statement", "CLI", "GUI"],
    "rows": [
      ["The user has to type in every instruction", "", ""],
      ["The user does not need to learn any of the instructions", "", ""],
      ["Each instruction has to be typed in correctly", "", ""],
      ["The user is in direct communication with the computer", "", ""]
    ]
  }
}
```

#### 5. **paired_list** - Two-column answers
- For "Feature" and "Description" type questions
- Shows table with two columns
```json
{
  "type": "paired_list",
  "labels": ["Feature", "Description"]
}
```

#### 6. **mcq** - Multiple choice
- Shows options with checkboxes
```json
{
  "type": "mcq",
  "options": ["Option 1", "Option 2", "Option 3"],
  "maxSelections": 2
}
```

#### 7. **image_based_list** - Images with answer lines
- Multiple images with answer input below each
```json
{
  "type": "image_based_list",
  "images": [
    {
      "path": "/papers/images/img1.png",
      "description": "Image description",
      "answerLine": true
    }
  ]
}
```

### Text Cleaning Rules

#### MUST REMOVE:
1. `© UCLES 2020` (or any year)
2. `[Turn over]`
3. Page numbers like `06_0417_11_2020_1.13`
4. `Permission to reproduce...` (entire copyright block)
5. `BLANK PAGE`
6. Excessive whitespace
7. Dot lines `..................` (keep only for answer lines in context)

#### MUST KEEP:
- Question numbers (1, 2, 3...)
- Subpart letters (a), (b), (c)
- Nested numbers (i), (ii), (iii)
- Marks notation [2], [4], [6]
- Actual question text
- Table content
- Tick (✓) symbols

### Parsing Logic

#### Main Questions
- Pattern: `^\d+\s+` (number at start of line)
- Extract until next main question number
- If has subparts, `marks: null`
- If standalone, detect type and set marks

#### Subparts
- Pattern: `\([a-z]\)\s+` for (a), (b), (c)
- Pattern: `\([ivx]+)\s+` for (i), (ii), (iii)
- Extract marks from `[X]` notation
- Detect type based on keywords

#### Type Detection Keywords
- **numbered_list**: "List", "Name", "Identify", "State", "Give", "Write down" + marks >= 2
- **essay**: "Describe", "Explain", "Discuss", "Compare" + marks >= 6
- **matrix_tick_table**: "Tick (✓)" or "Tick ( ✓ )" in text
- **paired_list**: "for each" or "Feature" + "Description"
- **mcq**: "Which of the following", "Select", "Choose"
- **text**: Default for everything else

#### Table Detection
When "Tick" is found:
1. Look for table structure in nearby text
2. Extract headers (first row)
3. Extract data rows
4. Create `table` object with headers and rows
5. Set type to `matrix_tick_table`

### Common Errors to Avoid

❌ **DON'T**:
- Parse subparts as main questions
- Include copyright text
- Lose question order
- Miss table structures
- Create blank questions

✅ **DO**:
- Maintain strict question order (1, 2, 3...)
- Parse all subparts under correct parent
- Extract and structure tables properly
- Clean text aggressively
- Validate output structure

### Example Perfect Output

```json
{
  "number": "1",
  "text": "A computer consists of both hardware and software.",
  "marks": null,
  "subparts": [
    {
      "number": "a",
      "text": "Define the term software.",
      "marks": 2,
      "type": "text"
    },
    {
      "number": "b",
      "text": "There are two types of software. Identify the types.",
      "marks": 2,
      "type": "numbered_list",
      "listCount": 2
    }
  ]
}
```

```json
{
  "number": "2",
  "text": "Tick (✓) whether the following statements refer to a Command Line Interface (CLI) or a Graphical User Interface (GUI).",
  "marks": 2,
  "type": "matrix_tick_table",
  "table": {
    "headers": ["Statement", "CLI", "GUI"],
    "rows": [
      ["The user has to type in every instruction", "", ""],
      ["The user does not need to learn any of the instructions", "", ""],
      ["Each instruction has to be typed in correctly", "", ""],
      ["The user is in direct communication with the computer", "", ""]
    ]
  }
}
```

### Image Handling

#### Multiple Images
- Use `images` array (not single `image`)
- Each image has `src` and optional `label`
- Detect labels (A, B, C, D) from question text
- Group images by Y-position proximity to question

```json
{
  "images": [
    { "src": "/papers/images/img1.png", "label": "A" },
    { "src": "/papers/images/img2.png", "label": "B" }
  ]
}
```

#### Image Extraction
- Extract from PDF using PyMuPDF or pdfplumber
- Save to `public/papers/images/`
- Name format: `{paper_id}_page{num}_img{num}.{ext}`
- Link to questions by Y-position

#### Label Detection
```python
labels = re.findall(r'\b([A-D])\b', question_text)
for i, img in enumerate(images):
    if i < len(labels):
        img["label"] = labels[i]
```

### Table Handling

#### Table Extraction
- Use pdfplumber's `extract_tables()` or PyMuPDF
- Store as `table` object with `headers` and `rows`
- Detect if it's a tick table

#### Tick Table Detection
```python
if "Tick" in question_text and table_found:
    question["type"] = "matrix_tick_table"
    question["table"] = {
        "headers": table[0],  # First row
        "rows": table[1:]     # Remaining rows
    }
```

#### Regular Table
```json
{
  "table": {
    "headers": ["Feature", "Value 1", "Value 2"],
    "rows": [
      ["Battery", "20 days", "7 days"],
      ["GPS", "Y", "N"]
    ]
  }
}
```

---
Made with Bob