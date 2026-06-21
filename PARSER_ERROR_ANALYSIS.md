# Parser Error Analysis - Universal IGCSE ICT Parser

## Overview
This document details the specific errors encountered while building a universal parser for ALL IGCSE ICT papers. Paper 12 MJ 2020 is used as the test case, but fixes apply to the entire parser system.

---

## Error 1: Table-Based Questions Have Empty Content

### Symptom
```json
{
  "number": "1",
  "text": "",           // ❌ EMPTY
  "marks": null,
  "subparts": []        // ❌ EMPTY
}
```

### Expected Output (from Paper 11 manual)
```json
{
  "number": "1",
  "text": "The 2020 Olympic Games committee is producing a database...",
  "marks": null,
  "subparts": [
    {
      "number": "a",
      "text": "Tick (✓) the most appropriate data type for each field.",
      "type": "matrix_tick_table"
    }
  ]
}
```

### Root Cause
**Location:** `production-parser-v2.py`, lines 115-145

The parser extracts tables FIRST, then tries to extract text. When a question has a table:
1. `extract_tables()` identifies table bounding box
2. Text extraction skips that area (table masking)
3. Question text and parts near/in the table are lost

**Debug Evidence:**
```
PAGE 2 FULL TEXT:
Line 3: 1 The 2020 Olympic Games committee...
Line 6: (a) Tick (✓) the most appropriate data type...
[TABLE STARTS HERE]
```

After cropping and table masking:
```
CROPPED TEXT:
Line 1: cycling events.  // ❌ Question number "1" removed
Line 3: (a) Tick...       // ❌ Part appears without parent question
```

### Why This Happens
1. **Bounding box crops question number**: Even with x0=20, some question numbers at x0<20 are lost
2. **Table masking removes context**: Text inside/near tables is excluded
3. **Orphaned parts**: Parser sees "(a)" without seeing "1" first, so it doesn't attach

### Solution Needed
**Don't mask tables from text extraction.** Instead:
1. Extract ALL text from page (including table areas)
2. Extract tables separately
3. Build question hierarchy from full text
4. Match tables to questions based on:
   - Same page
   - Question text mentions "tick" or "table"
   - Table appears after question number

**Code Change Required:**
```python
# CURRENT (BROKEN):
tables = self.extract_tables(page)
table_bboxes = self.get_table_bboxes(page)
# ... skip text in table areas

# NEEDED (FIXED):
tables = self.extract_tables(page)
text = content.extract_text()  # Get ALL text, don't mask
lines = text.split('\n')
# ... process all lines
# ... match tables to questions after hierarchy is built
```

---

## Error 2: Parts Not Detected in Table Questions

### Symptom
Q1-Q5 have `subparts: []` even though parts exist in PDF

### Root Cause
**Location:** `production-parser-v2.py`, lines 195-210

When the parser processes lines:
```python
if (p_match or p_text_match) and self.current_q:
    # Create part
```

The condition `self.current_q` fails because:
1. Question "1" was never created (cropped out)
2. Or question "1" was created but has no text
3. Parser sees "(a)" but `self.current_q` is None or wrong question

### Debug Evidence
From our debug run:
```
Q1: 0 parts []  // ❌ Parts exist but not detected
Q6: 5 parts ['a', 'b', 'a', 'i', 'a']  // ✅ Works for non-table questions
```

### Solution Needed
1. **Ensure question is created before parts**: Fix Error 1 first
2. **Better part detection**: Don't rely on `self.current_q` being set
3. **Lookahead logic**: If we see "(a)" without a current question, look back for the question number

---

## Error 3: Missing Questions (Q8, Q11)

### Symptom
Parser finds Q1-Q7, Q9, Q10, Q12 but skips Q8 and Q11

### Possible Causes
1. **Page break issue**: Q8/Q11 might span multiple pages
2. **Monotonic validation too strict**: If Q8 appears after Q9 due to page layout, it's rejected
3. **Junk filter**: Q8/Q11 text might match a junk pattern
4. **Duplicate detection**: Q8/Q11 might be seen as duplicates

### Debug Needed
Run parser with verbose logging to see:
```python
print(f"[DEBUG] Found question: {q_id}, current_highest: {self.highest_q_num}")
print(f"[DEBUG] Skipping line (junk): {line}")
print(f"[DEBUG] Skipping question (duplicate): {q_id}")
```

### Solution Needed
1. **Relax monotonic validation**: Allow questions out of order if on different pages
2. **Better duplicate detection**: Only skip if same question on same page
3. **Check junk filter**: Ensure Q8/Q11 text doesn't match junk patterns

---

## Error 4: Text Spacing Issues

### Symptom
Some text has no spaces: "Describetwodrawbacksintermsoflifestyle"

### Root Cause
**Location:** `production-parser-v2.py`, line 127

```python
text = content.extract_text()
```

`pdfplumber.extract_text()` sometimes fails to preserve word boundaries when:
1. Words are in different text objects in PDF
2. Font spacing is unusual
3. Text is in a table cell

### Solution Needed
Use `extract_words()` with coordinate grouping (we tried this before but had other issues):

```python
def get_text_with_spacing(self, page):
    """Extract text with proper word spacing"""
    words = page.extract_words(horizontal_ltr=True)
    lines = defaultdict(list)
    
    for word in words:
        y = round(word['top'])
        lines[y].append(word)
    
    result = []
    for y in sorted(lines.keys()):
        line_words = sorted(lines[y], key=lambda w: w['x0'])
        # Add space between words if x-gap > threshold
        line_text = ""
        for i, word in enumerate(line_words):
            if i > 0:
                prev_word = line_words[i-1]
                gap = word['x0'] - prev_word['x1']
                if gap > 2:  # Threshold for space
                    line_text += " "
            line_text += word['text']
        result.append(line_text)
    
    return result
```

---

## Error 5: Renderer Not Showing Input Boxes

### Symptom
Q6(a) shows text but no input field for answer

### Root Cause
**Location:** `src/components/exam-new/QuestionRendererV1.tsx`

The renderer doesn't handle `type: "text"` properly. It needs to:
1. Check if subpart has `type: "text"`
2. Render a `<textarea>` or `<input>` for the answer
3. Handle different types: text, numbered_list, essay, matrix_tick_table

### Solution Needed
Update renderer to show appropriate input based on type:
```typescript
{subpart.type === 'text' && (
  <textarea 
    className="w-full border rounded p-2"
    placeholder="Type your answer here..."
  />
)}

{subpart.type === 'numbered_list' && (
  <div>
    {[1,2,3,4].map(i => (
      <input key={i} className="w-full border rounded p-2 mb-2" />
    ))}
  </div>
)}
```

---

## Priority Order for Fixes

### 🔴 Critical (Must Fix First)
1. **Error 1**: Table masking - prevents Q1-Q5 from being parsed at all
2. **Error 5**: Renderer input boxes - even working questions show no inputs

### 🟡 High Priority
3. **Error 2**: Part detection - needed for complete question hierarchy
4. **Error 3**: Missing questions - need all 12 questions

### 🟢 Medium Priority
5. **Error 4**: Text spacing - affects readability but not functionality

---

## Testing Strategy

After each fix, test on:
1. **Paper 12 MJ 2020** (current test case)
2. **Paper 13 MJ 2020** (verify it's not Paper 12-specific)
3. **Paper 11 MJ 2020** (ensure we don't break working papers)
4. **Different year** (e.g., 2019, 2021) to ensure universal compatibility

---

## Success Criteria

Parser is complete when it produces output matching Paper 11 manual quality:
- ✅ All 12 questions detected
- ✅ Proper hierarchy (questions → parts → sub-parts)
- ✅ Clean text (no junk, proper spacing)
- ✅ Tables classified correctly (TICK_TABLE vs DATA_TABLE)
- ✅ Appropriate types assigned (text, numbered_list, essay, matrix_tick_table)
- ✅ Renderer shows input boxes for all question types

---

## Next Steps

1. Fix Error 1 (table masking) - this is the blocker
2. Test on Paper 12 to verify Q1-Q5 now have content
3. Fix Error 5 (renderer) so we can see the results
4. Fix Error 2 (part detection) for complete hierarchy
5. Fix Error 3 (missing questions) for full coverage
6. Fix Error 4 (spacing) for polish
7. Test on multiple papers to ensure universal compatibility