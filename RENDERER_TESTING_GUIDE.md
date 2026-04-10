# 🧪 Renderer Testing Guide

## Overview
You've shared 4 different rendering approaches (V1-V4). This guide helps you test them systematically.

## 📋 The 4 Versions You Shared

### V1: Basic Renderer
**Focus**: Simple type detection (selection_table, word_bank, standard)
**Strengths**:
- Clean, minimal code
- Easy to understand
- Basic table rendering with radio buttons

**Weaknesses**:
- Limited type support
- No image handling
- No validation

### V2: Image-Enhanced Renderer  
**Focus**: Visual diagrams and modern UI
**Strengths**:
- Image rendering with zoom
- Beautiful card-based layout
- Multi-select grid support
- Responsive design

**Weaknesses**:
- Hardcoded row/column data
- No actual image extraction logic in renderer

### V3: Criticism-Aware System
**Focus**: Answer validation and examiner feedback
**Strengths**:
- Brand name detection (Excel, Word, etc.)
- Format checking (DISCUSS = prose, not bullets)
- Vague term warnings ("faster" → be specific)
- Real-time feedback

**Weaknesses**:
- Complex validation logic
- May be too strict for practice mode

### V4: Notebook-Style Renderer
**Focus**: Realistic exam paper appearance
**Strengths**:
- Authentic notebook look (ruled lines)
- Red margin border
- Handwriting-style font (Caveat)
- Real-time examiner warnings
- Beautiful visual design

**Weaknesses**:
- May not work well on mobile
- Handwriting font may be hard to read

---

## 🎯 Current System vs New Versions

### What We Currently Have
Our system uses:
- `QuestionRendererSimple.tsx` - Main renderer
- `InputFactory.tsx` - Creates different input types
- Types: text, mcq, paired_list, numbered_list, essay, matrix_tick_table, word_bank

### Key Differences in Your Versions
1. **V1-V2**: Use different type names (`selection_table` vs our `matrix_tick_table`)
2. **V3**: Adds validation layer (not in our current system)
3. **V4**: Completely different UI approach (notebook style)

---

## 🔧 Testing Strategy

### Option A: Test Parsers First (Recommended)
Since parsers create the JSON that renderers consume, test parsers first:

```bash
# Install dependencies
pip install pdfplumber PyMuPDF

# Test all 4 parsers on March 2021 paper
python scripts/test-all-parsers.py path/to/0417_m21_qp_12.pdf

# This creates:
# test_results_0417_m21_qp_12/
#   ├── 0417_m21_qp_12_v1.json
#   ├── 0417_m21_qp_12_v2.json
#   ├── 0417_m21_qp_12_v3.json
#   └── 0417_m21_qp_12_v4.json
```

**Then review each JSON:**
1. Check question detection accuracy
2. Verify marks extraction
3. Check type classification
4. Look for missing content

### Option B: Test Renderer Features Individually
Instead of replacing the whole renderer, add features one by one:

#### Feature 1: Add V3's Validation (Brand Name Detection)
```typescript
// In QuestionRendererSimple.tsx, add:
const checkForBrandNames = (text: string) => {
  const brands = ['excel', 'word', 'access', 'powerpoint'];
  const found = brands.filter(b => text.toLowerCase().includes(b));
  if (found.length > 0) {
    return `⚠️ Avoid brand names: ${found.join(', ')}`;
  }
  return null;
};
```

#### Feature 2: Add V4's Notebook Styling
```typescript
// Add to textarea:
style={{
  fontFamily: "'Caveat', cursive",
  backgroundImage: 'linear-gradient(#2563eb 1px, transparent 1px)',
  backgroundSize: '100% 2.5rem',
  lineHeight: '2.5rem'
}}
```

#### Feature 3: Add V2's Image Rendering
```typescript
// Already implemented! Check if question.image exists
{question.image && (
  <div className="my-4">
    <img src={question.image.url} alt={question.image.alt} />
    {question.image.caption && <p>{question.image.caption}</p>}
  </div>
)}
```

---

## 📊 Comparison Matrix

| Feature | Current | V1 | V2 | V3 | V4 |
|---------|---------|----|----|----|----|
| Basic text questions | ✅ | ✅ | ✅ | ✅ | ✅ |
| MCQ rendering | ✅ | ❌ | ✅ | ❌ | ❌ |
| Matrix/Tick tables | ✅ | ✅ | ✅ | ❌ | ❌ |
| Word banks | ✅ | ✅ | ❌ | ❌ | ❌ |
| Image support | ✅ | ❌ | ✅ | ❌ | ✅ |
| Paired lists | ✅ | ❌ | ❌ | ❌ | ❌ |
| Numbered lists | ✅ | ❌ | ❌ | ❌ | ❌ |
| Brand validation | ❌ | ❌ | ❌ | ✅ | ✅ |
| Format checking | ❌ | ❌ | ❌ | ✅ | ✅ |
| Notebook styling | ❌ | ❌ | ❌ | ❌ | ✅ |
| Auto-save | ✅ | ❌ | ❌ | ❌ | ❌ |
| Progress tracking | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🚀 Recommended Approach

### Phase 1: Test Parsers (Do This First!)
```bash
# Get a PDF of 0417_m21_qp_12
# Run the multi-parser test
python scripts/test-all-parsers.py 0417_m21_qp_12.pdf

# Review the 4 JSON outputs
# Tell me which parser extracted questions best
```

### Phase 2: Enhance Current Renderer
Based on parser results, we'll add the best features:

**From V3 (Validation)**:
- Brand name detection
- Format checking for DISCUSS questions
- Vague term warnings

**From V4 (UI)**:
- Optional notebook styling toggle
- Ruled line backgrounds
- Better visual feedback

**Keep from Current**:
- All existing question types
- Auto-save functionality
- Progress tracking
- Sidebar navigation

### Phase 3: Create Hybrid Version
Combine best of all worlds:
```
Current System (base)
  + V3 Validation (smart feedback)
  + V4 Styling (optional theme)
  + V2 Image handling (if better than current)
  = Ultimate Renderer
```

---

## 📝 Testing Checklist

### Parser Testing
- [ ] Run test-all-parsers.py on March 2021 paper
- [ ] Check V1 output (basic detection)
- [ ] Check V2 output (with images)
- [ ] Check V3 output (with validation hints)
- [ ] Check V4 output (with command words)
- [ ] Compare question counts across versions
- [ ] Identify which parser is most accurate

### Renderer Testing (After Parser)
- [ ] Copy best JSON to public/papers/test_comparison.json
- [ ] Test in current UI
- [ ] Note what renders correctly
- [ ] Note what's missing or broken
- [ ] Test validation features (if using V3)
- [ ] Test notebook styling (if using V4)

### Feature Priority
Rate each feature 1-5 (5 = must have):
- [ ] Brand name detection: ___
- [ ] Format validation: ___
- [ ] Notebook styling: ___
- [ ] Image extraction: ___
- [ ] Command word detection: ___

---

## 🎬 Next Steps

1. **Do you have the PDF for 0417_m21_qp_12?**
   - If yes: Run the parser test
   - If no: I can help you get it from Supabase

2. **After parser test, tell me:**
   - Which version extracted questions best?
   - What features you want from each version?
   - Should we keep current system and add features, or start fresh?

3. **Then we'll:**
   - Implement the best parser
   - Add the features you want
   - Test on the March 2021 paper
   - Deploy if successful

---

## 💡 Quick Decision Guide

**If you want:**
- ✅ **Accuracy first** → Test parsers, pick best one
- ✅ **Beautiful UI** → Add V4 notebook styling to current system
- ✅ **Smart feedback** → Add V3 validation to current system
- ✅ **Everything** → Hybrid approach (recommended)

**Current system is already good at:**
- Question rendering
- Answer collection
- Auto-save
- Progress tracking

**Your versions add:**
- Better PDF parsing (V1-V4 parsers)
- Validation feedback (V3)
- Beautiful styling (V4)

**Best approach:**
Keep current foundation + add new features = Perfect system! 🎯