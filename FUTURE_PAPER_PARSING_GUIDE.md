# Guide for Parsing Future Biology Papers

## Overview
This guide documents the approach for extracting MCQ questions from Biology PDF papers based on lessons learned from parsing 0610_m20_qp_22.

## Key Principles

### 1. Question Boundary Detection
- **Find question numbers in LEFT MARGIN ONLY** (x < 100px)
- Questions are numbered sequentially (1-40 for Biology Paper 2)
- Each question ends just before the next question number

### 2. Margin Settings (Critical!)
- **Top margin before question**: 10px (to include question number)
- **Bottom margin before next question**: **10px** (NOT 30px - that cuts options!)
- **Page bottom margin**: 40-60px (to avoid footer)
- **Page top margin**: 40-50px (to avoid header)

### 3. Common Issues & Solutions

#### Issue: Options Cut Off (D option missing)
**Cause**: Too much margin before next question (30px was too much)
**Solution**: Use only 10px margin before next question
```python
extract_question(doc, q_num, page_num, q_y, page_num, next_q_y - 10)  # NOT -30!
```

#### Issue: Question Overlaps with Next Question
**Cause**: Not enough margin, or question spans pages
**Solution**: 
- For same-page questions: Use 10px margin
- For page-spanning questions: Extract to page end, then from next page top to next question

#### Issue: Footer/Header Included
**Cause**: Extracting too close to page edges
**Solution**:
- Bottom: Stop 40-60px before page end
- Top: Start 40-50px from page top

### 4. Page-Spanning Questions

When a question spans two pages:
```python
# Page 1: From question start to page end (minus footer)
clip1 = fitz.Rect(0, q_y - 10, page.rect.width, page.rect.height - 60)

# Page 2: From page top (plus header) to next question (minus margin)
clip2 = fitz.Rect(0, 50, page.rect.width, next_q_y - 10)

# Merge vertically
```

### 5. Extraction Script Template

```python
def extract_question(doc, question_num, start_page, start_y, end_page, end_y):
    """Extract a question with proper boundaries"""
    
    if start_page == end_page:
        # Single page
        page = doc[start_page]
        clip = fitz.Rect(0, start_y - 10, page.rect.width, end_y)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
        # ... save image
    else:
        # Multi-page (merge vertically)
        # ... extract from both pages and merge

def find_question_on_page(page, q_num):
    """Find question number in LEFT MARGIN ONLY"""
    text_instances = page.search_for(str(q_num))
    for inst in text_instances:
        if inst.x0 < 100:  # LEFT MARGIN ONLY!
            return inst.y0
    return None

# For each question:
q_y = find_question_on_page(page, q_num)
next_q_y = find_question_on_page(page, q_num + 1)
extract_question(doc, q_num, page_num, q_y, page_num, next_q_y - 10)
```

## Workflow for New Papers

### Step 1: Initial Extraction
Run the main extractor to get most questions:
```bash
python scripts/extract-full-question-images-v2.py
```

### Step 2: Identify Problem Questions
Check the output for:
- Questions with < 4 options found
- Questions with > 4 options found (duplicates)
- Cut-off questions

### Step 3: Fix Individual Questions
Create targeted fix scripts for problem questions:
```bash
python scripts/fix-cut-options.py  # For questions with cut options
python scripts/fix-q15-clean.py    # For questions with footer/next question
```

### Step 4: Verify All Questions
- Check all 40 images visually
- Ensure no overlaps
- Ensure all 4 options (A, B, C, D) are visible
- Ensure no footer/header text

### Step 5: Update Cache-Busting
Increment the version number in MCQQuestionCard.tsx:
```typescript
src={`${question.imageUrl}?v=7`}  // Increment version
```

## Different Paper Formats

### If Questions Have Different Lengths
The current approach handles this automatically because:
1. We detect each question number's position
2. We extract from question N to question N+1
3. No fixed heights or assumptions about question length

### If Questions Have Tables/Diagrams
- The image-based approach captures everything
- No special handling needed
- Just ensure proper boundaries

### If Page Layout Changes
- Adjust LEFT MARGIN threshold (currently x < 100)
- Adjust page margins (top/bottom) if needed
- Test with a few questions first

## Quality Checklist

Before finalizing a paper:
- [ ] All 40 questions extracted
- [ ] No cut-off options (especially D)
- [ ] No overlaps with next question
- [ ] No footer/header text
- [ ] No duplicate questions
- [ ] Images are sharp and readable
- [ ] Cache-busting version updated

## Notes
- **10px margin is the sweet spot** - enough to avoid overlap, not enough to cut options
- Always test with problem questions first (those near page breaks)
- Visual inspection is essential - automated checks can miss subtle issues