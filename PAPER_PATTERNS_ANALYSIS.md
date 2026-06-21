# IGCSE ICT Paper Patterns Analysis
## Based on 0417_s20_qp_11 Manual JSON

## Question Number Formats

### Format 1: Centered Standalone Number (8 questions)
**Questions:** 1, 3, 4, 5, 7, 9, 10, 12
- Number appears alone on a line at Y position ~63
- Question text follows on subsequent lines
- Example: "1" on one line, then "A computer consists of..."

### Format 2: Left-Aligned Number + Text (4 questions)
**Questions:** 2, 6, 8, 11
- Number and text on same line
- Appears at various Y positions
- Example: "2 Tick (✓) whether the following..."

## Question Types

### 1. Questions with Subparts (9 questions)
- Q1: 2 subparts (a, b)
- Q3: 2 subparts (a, b)
- Q4: 5 subparts (a, b, c, d, e)
- Q5: 2 subparts (a, b)
- Q8: 3 subparts (a, b, c)
- Q9: 2 subparts (a, b)
- Q10: 3 subparts (a, b, c)

### 2. Questions without Subparts (3 questions)
- Q2: Table question (matrix_tick_table)
- Q6: Table question (matrix_tick_table)
- Q7: Essay question (4 marks)
- Q11: Numbered list (4 marks)
- Q12: Essay question (8 marks)

## Subpart Types

### Text Questions
- Simple answer questions
- Examples: Q1(a), Q4(e), Q8(b)

### Essay Questions
- Longer descriptive answers (4-8 marks)
- Keywords: "Describe", "Explain", "Discuss", "Compare and contrast"
- Examples: Q3(a), Q5(a), Q8(a), Q10(a)

### Numbered List Questions
- Require listing multiple items
- Keywords: "Identify", "List", "Name"
- Examples: Q1(b), Q4(a), Q10(c), Q11

### Matrix/Tick Table Questions
- Table with checkboxes
- Keywords: "Tick (✓)"
- Examples: Q2, Q4(b), Q6, Q9(a)

### Questions with Images
- Q3(b): Has 3 images (RFID, barcode, chip)

## Marks Distribution

### Subpart Marks
- 1 mark: Q4(e)
- 2 marks: Q1(a), Q1(b), Q4(b), Q8(b)
- 3 marks: Q10(c)
- 4 marks: Q3(a), Q4(a), Q4(d), Q5(b), Q8(c), Q10(b)
- 6 marks: Q4(c), Q5(a), Q8(a), Q9(a), Q9(b), Q10(a)
- 8 marks: Q12

### Question-Level Marks (no subparts)
- 2 marks: Q2
- 4 marks: Q6, Q7, Q11
- 8 marks: Q12

## Key Parsing Challenges

### 1. Two Different Question Number Formats
- Must detect both centered and left-aligned formats
- Cannot rely solely on Y position

### 2. Subpart Detection
- Subparts marked with (a), (b), (c), etc.
- Can appear at start of line or after text
- Must handle multi-line subpart text

### 3. Table Detection
- Tables have specific structure with headers and rows
- Need to detect "Tick (✓)" pattern
- Must extract table data separately from text

### 4. Marks Extraction
- Marks in format [2], [4], [6], [8]
- Can appear at end of question or subpart text
- Must remove from text after extraction

### 5. Type Detection
- Based on keywords and marks
- Essay: "Describe", "Explain", "Discuss" + high marks (4-8)
- Numbered list: "List", "Identify", "Name"
- MCQ/Table: "Tick", "Circle"
- Text: Default for simple questions

## Parser Strategy

### Phase 1: Question Detection
1. Use multiple extraction methods (simple text, dict mode, blocks)
2. Detect both centered (Y=63) and left-aligned formats
3. Merge results from all methods

### Phase 2: Subpart Extraction
1. For each question, extract text from its page
2. Look for (a), (b), (c) markers
3. Group text between markers
4. Handle multi-line subpart text

### Phase 3: Content Processing
1. Extract marks from text
2. Detect question type based on keywords
3. Extract tables if present
4. Attach images if present

### Phase 4: JSON Generation
1. Build structured JSON
2. Validate against schema
3. Save with backup