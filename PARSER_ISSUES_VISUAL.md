# Parser Issues - Visual Comparison

## Paper 12 (0417_s20_qp_12) Current vs Expected

### Question 5 - WRONG HIERARCHY

**Current Parser Output:**
```
Q5: "Part of the spreadsheet is shown, column G subtracts..."
├─ (b): "Describe the steps the teacher can take..."
└─ (i): ".......... The teacher has typed a formula ROUNDUP(AVERAGE(B3:D3),0)..."
```

**Expected Structure:**
```
Q5: "Part of the spreadsheet is shown, column G subtracts..."
├─ (a): [MISSING] "Write down the formula used in cell G3"
└─ (b): "Describe the steps the teacher can take..."
    └─ (i): "The teacher has typed a formula ROUNDUP(AVERAGE(B3:D3),0)..."
```

**Issues:**
1. ❌ Subpart (a) completely missing
2. ❌ Subpart (i) should be nested under (b), not sibling
3. ❌ Answer lines ("........") included in text

---

### Question 2 - MISSING SUBPART

**Current Parser Output:**
```
Q2: "A report has been produced that shows the male gold medal winners..."
└─ (b): "1....... 2....... 3....... 4....... 5....... 6......."
```

**Expected Structure:**
```
Q2: "A report has been produced that shows the male gold medal winners..."
├─ (a): [MISSING] "Identify the type of report"
└─ (b): "Write down six formatting features used in the report"
```

**Issues:**
1. ❌ Subpart (a) completely missing
2. ❌ Subpart (b) text is just answer lines, not the actual question

---

### Question 8 - DUPLICATE SUBPARTS

**Current Parser Output:**
```
Q8: "Describe the methods which can be used to help prevent phishing."
├─ (b): "........... Complete each sentence using the most appropriate output device..."
├─ (a): "........... The device that can output soft copy is called a"
├─ (b): "........... The device that can produce sound as its main output is called a"  [DUPLICATE!]
└─ (c): "..........."
```

**Expected Structure:**
```
Q8: "Describe the methods which can be used to help prevent phishing."
└─ (a): "Write down methods to prevent phishing"

Q9: "Complete each sentence using the most appropriate output device..."
├─ (a): "The device that can output soft copy is called a"
├─ (b): "The device that can produce sound as its main output is called a"
└─ (c): "The device that can produce hard copy is called a"
```

**Issues:**
1. ❌ Q8 and Q9 got merged into one question
2. ❌ Duplicate subpart (b)
3. ❌ Wrong question text for Q8

---

## Root Cause Analysis

### Why the 2-Pass Parser Fails

**Pass 1: Find Markers**
```
Line 87: "5 Part of the spreadsheet..."  → Q5 marker
Line 138: "5"                            → Q5 marker (PAGE HEADER - now filtered)
Line 145: "(a) Write down the formula..." → (a) marker
Line 160: "(b) Describe the steps..."    → (b) marker
Line 180: "(i) The teacher has typed..." → (i) marker
```

**Pass 2: Group Text**
```
Q5 text = lines[87:145]   → "Part of the spreadsheet..."
(a) text = lines[145:160] → "Write down the formula..."
(b) text = lines[160:180] → "Describe the steps..."
(i) text = lines[180:200] → "The teacher has typed..."
```

**Problem:** When Q5 spans pages 5-8, the page header "5" on page 8 creates a boundary. Text between the duplicate "5" markers gets lost or attached to wrong subparts.

---

## Solution Approaches

### Option A: Streaming Parser (Recommended)
- Read line-by-line
- Maintain state (current question, current subpart)
- Append text to current context
- Detect page headers by checking if number already seen
- **Pros:** Handles multi-page questions correctly
- **Cons:** More complex logic, 2-3 hours to implement

### Option B: Improved 2-Pass with Better Grouping
- Keep 2-pass approach
- Add "look-ahead" to detect if marker is page header
- Group text more intelligently (skip page headers)
- **Pros:** Builds on existing code
- **Cons:** Still fragile, may miss edge cases

### Option C: Manual Review + Auto-fix
- Use current parser (80% accurate)
- Build validation script to detect issues
- Manual review for 20% of papers
- **Pros:** Fastest to deploy
- **Cons:** Not fully automated

---

## Recommendation

**Build Streaming Parser (Option A)**

The 2-pass approach is fundamentally flawed for multi-page questions. A streaming parser that maintains context will handle all edge cases correctly.

**Estimated Time:** 2-3 hours
**Success Rate:** 95%+ (vs current 60-70%)