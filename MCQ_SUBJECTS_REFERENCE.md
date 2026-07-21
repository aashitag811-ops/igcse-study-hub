# MCQ Subjects Reference Guide

## ✅ Currently Parsed (Image-Based Parser)
| Subject | Code | MCQ Papers | Questions | Status |
|---------|------|------------|-----------|--------|
| Biology | 0610 | Papers 12, 22 | 40 | ✅ 86/86 (100%) |
| Chemistry | 0620 | Papers 12, 22 | 40 | ✅ 83/83 (100%) |
| Physics | 0625 | Papers 12, 22 | 40 | ✅ 84/84 (100%) |
| Economics | 0455 | Paper 12 only | 30 | ✅ 41/43 (95.3%) |

**Note:** Economics Paper 22 is Structured Questions (NOT MCQ)

---

## 📋 Future MCQ Subjects to Parse

### Accounting (0452)
- **Paper 1**: MCQ ✅ (needs parsing)
- **Paper 2**: Structured Questions ❌ (not MCQ)
- Expected questions: TBD (likely 30 or 40)

### ICT (0417)
- MCQ papers: TBD
- Expected questions: TBD

### French (0520)
- MCQ papers: TBD
- Expected questions: TBD

### Mathematics (0580)
- MCQ papers: TBD
- Expected questions: TBD

### Additional Mathematics (0606)
- MCQ papers: TBD
- Expected questions: TBD

---

## 🔧 How to Parse New Subjects

1. **Identify MCQ papers** - Check which paper numbers are MCQ
2. **Determine question count** - Usually 30 or 40
3. **Create batch parser** - Copy from existing batch scripts
4. **Run parser** - `python scripts/batch-parse-SUBJECT.py`
5. **Verify results** - Check JSON files and images

### Example Command:
```bash
# For 40-question papers
python scripts/master-image-mcq-parser.py 0452_m25_qp_12

# For 30-question papers (like Economics)
python scripts/master-image-mcq-parser.py 0452_m25_qp_12 --questions 30
```

---

## 📊 Current System Stats
- **Total parsed papers**: 294
- **Total question images**: 11,350
- **Success rate**: 99.3%
- **Subjects complete**: 4 (Biology, Chemistry, Physics, Economics)
- **Subjects pending**: 5 (Accounting, ICT, French, Math, Add Math)

---

*Last Updated: June 7, 2026*