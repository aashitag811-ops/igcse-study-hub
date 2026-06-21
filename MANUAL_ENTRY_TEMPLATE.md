# Manual Paper Entry Template

Use this template when PDF extraction fails or you need perfect accuracy.

## Quick Start

1. Copy the template below
2. Save as `public/papers/[code]_[season][year]_qp_[variant].json`
3. Fill in metadata and questions
4. Test at `/practice`

## File Naming Convention

```
0417_s25_qp_12.json
│    │   │   └─ Variant (11, 12, 13)
│    │   └───── Paper type (qp = question paper)
│    └───────── Season + Year (s25 = Summer 2025, m25 = May 2025, w25 = Winter 2025)
└────────────── Subject code (0417 = ICT)
```

## Full Template

```json
{
  "metadata": {
    "subject": "ICT",
    "code": "0417",
    "year": 2025,
    "season": "May/June",
    "variant": "12",
    "duration": 90,
    "totalMarks": 80
  },
  "questions": [
    {
      "number": "1",
      "text": "Main question text here",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "Subpart (a) text",
          "marks": 2,
          "type": "text"
        },
        {
          "number": "b",
          "text": "Subpart (b) text",
          "marks": 3,
          "type": "text"
        }
      ]
    },
    {
      "number": "2",
      "text": "Question with nested subparts",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "Part (a) with sub-subparts",
          "marks": null,
          "subparts": [
            {
              "number": "i",
              "text": "Sub-subpart (i) text",
              "marks": 1,
              "type": "text"
            },
            {
              "number": "ii",
              "text": "Sub-subpart (ii) text",
              "marks": 2,
              "type": "text"
            }
          ]
        }
      ]
    }
  ]
}
```

## Question Types

### 1. Text Question (Default)

```json
{
  "number": "1",
  "text": "Explain what is meant by the term hacking.",
  "marks": 2,
  "type": "text"
}
```

**Renders as:** Single text box sized by marks

---

### 2. MCQ Question

```json
{
  "number": "2",
  "text": "Tick TWO benefits of parallel implementation.",
  "marks": 2,
  "type": "mcq",
  "maxSelections": 2,
  "options": [
    "Direct",
    "Parallel",
    "Pilot",
    "All benefits are immediate",
    "If the new system fails, the old system is still operational"
  ]
}
```

**Renders as:** Clickable buttons with selection limit

**Tips:**
- `maxSelections` = how many options student can select
- Usually equals `marks` (2 marks = select 2)
- Options display inline with wrapping

---

### 3. List Answer Question

```json
{
  "number": "3",
  "text": "Describe three measures that could be taken to protect the data from being hacked.",
  "marks": 3,
  "type": "list",
  "listCount": 3
}
```

**Renders as:** Three numbered text boxes (1. 2. 3.)

**Tips:**
- Use when question asks for multiple points
- `listCount` = number of answer slots
- Usually equals `marks`

---

### 4. Question with Image

```json
{
  "number": "4",
  "text": "Study the diagram below and answer the questions.",
  "marks": null,
  "hasImage": true,
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "subparts": [
    {
      "number": "a",
      "text": "Identify component X.",
      "marks": 1,
      "type": "text"
    }
  ]
}
```

**Renders as:** Image displayed above subparts

**Tips:**
- Use online tool to convert image to base64
- Or use Python: `base64.b64encode(open('image.png', 'rb').read()).decode()`
- Image displays with border and shadow

---

## Hierarchy Rules

### Rule 1: Parent Questions Have `marks: null`

```json
{
  "number": "1",
  "text": "This is a parent question",
  "marks": null,  // ← No answer box
  "subparts": [...]
}
```

### Rule 2: Terminal Questions Have Marks

```json
{
  "number": "a",
  "text": "This gets an answer box",
  "marks": 2,  // ← Answer box appears
  "type": "text"
}
```

### Rule 3: Three Levels Maximum

```
1           ← Level 0 (number)
  (a)       ← Level 1 (letter)
    (i)     ← Level 2 (roman)
```

### Rule 4: Use Correct Number Format

- Level 0: `"1"`, `"2"`, `"3"`
- Level 1: `"a"`, `"b"`, `"c"` (NOT "(a)")
- Level 2: `"i"`, `"ii"`, `"iii"` (NOT "(i)")

The interface adds parentheses automatically.

---

## Common Patterns

### Pattern 1: Simple Question (No Subparts)

```json
{
  "number": "1",
  "text": "Define the term 'phishing'.",
  "marks": 2,
  "type": "text"
}
```

### Pattern 2: Question with Letter Subparts

```json
{
  "number": "2",
  "text": "A company uses a database.",
  "marks": null,
  "subparts": [
    {
      "number": "a",
      "text": "State what is meant by a database.",
      "marks": 1,
      "type": "text"
    },
    {
      "number": "b",
      "text": "Describe two advantages of using a database.",
      "marks": 4,
      "type": "text"
    }
  ]
}
```

### Pattern 3: Nested Subparts

```json
{
  "number": "3",
  "text": "A school uses a network.",
  "marks": null,
  "subparts": [
    {
      "number": "a",
      "text": "The network uses a star topology.",
      "marks": null,
      "subparts": [
        {
          "number": "i",
          "text": "Draw a diagram of a star topology.",
          "marks": 2,
          "type": "text"
        },
        {
          "number": "ii",
          "text": "State one advantage of a star topology.",
          "marks": 1,
          "type": "text"
        }
      ]
    },
    {
      "number": "b",
      "text": "Describe what is meant by a protocol.",
      "marks": 2,
      "type": "text"
    }
  ]
}
```

### Pattern 4: MCQ with Image

```json
{
  "number": "4",
  "text": "The diagram shows four types of implementation.",
  "marks": null,
  "hasImage": true,
  "image": "data:image/png;base64,...",
  "subparts": [
    {
      "number": "a",
      "text": "Tick the implementation method shown in diagram A.",
      "marks": 1,
      "type": "mcq",
      "maxSelections": 1,
      "options": ["Direct", "Parallel", "Phased", "Pilot"]
    }
  ]
}
```

---

## Validation Checklist

Before saving, verify:

- [ ] File name follows convention
- [ ] Metadata is complete and accurate
- [ ] Total marks calculated correctly
- [ ] All parent questions have `marks: null`
- [ ] All terminal questions have marks and type
- [ ] MCQ questions have options and maxSelections
- [ ] List questions have listCount
- [ ] Number format is correct (no parentheses)
- [ ] Hierarchy doesn't exceed 3 levels
- [ ] JSON is valid (use JSONLint.com)

---

## Tips for Speed

1. **Start with structure** - Add all question numbers first
2. **Copy-paste patterns** - Use the patterns above
3. **Don't worry about perfection** - Students can still use it
4. **Test frequently** - Load at `/practice` to check rendering
5. **Use a JSON editor** - VS Code with JSON validation

---

## Time Estimates

- Simple paper (10 questions, no subparts): **15 minutes**
- Medium paper (8 questions, some subparts): **25 minutes**
- Complex paper (nested subparts, images): **40 minutes**

---

## Example: Complete Simple Paper

```json
{
  "metadata": {
    "subject": "ICT",
    "code": "0417",
    "year": 2025,
    "season": "May/June",
    "variant": "12",
    "duration": 90,
    "totalMarks": 20
  },
  "questions": [
    {
      "number": "1",
      "text": "Define the term 'malware'.",
      "marks": 2,
      "type": "text"
    },
    {
      "number": "2",
      "text": "Tick TWO examples of input devices.",
      "marks": 2,
      "type": "mcq",
      "maxSelections": 2,
      "options": ["Mouse", "Printer", "Keyboard", "Monitor", "Speaker"]
    },
    {
      "number": "3",
      "text": "Describe three characteristics of RAM.",
      "marks": 6,
      "type": "list",
      "listCount": 3
    },
    {
      "number": "4",
      "text": "A company uses cloud storage.",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "State what is meant by cloud storage.",
          "marks": 2,
          "type": "text"
        },
        {
          "number": "b",
          "text": "Describe two advantages of cloud storage.",
          "marks": 4,
          "type": "text"
        },
        {
          "number": "c",
          "text": "Describe two disadvantages of cloud storage.",
          "marks": 4,
          "type": "text"
        }
      ]
    }
  ]
}
```

**Total: 20 marks** ✓

---

## Need Help?

- Check existing papers in `public/papers/` for examples
- Use the advanced extractor first, then clean up manually
- Test in the interface to see how it renders
- JSON validation: https://jsonlint.com/