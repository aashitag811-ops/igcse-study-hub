# Send Question Rendering Files via Git

This guide explains how to send all files related to the question rendering system to your friend.

## Files to Send

### 1. **Question Renderer Components** (Main UI)
- `src/components/exam-new/QuestionRendererV1.tsx` - Version 1 renderer
- `src/components/exam-new/QuestionRenderer.tsx` - Advanced renderer
- `src/components/exam-new/QuestionRendererSimple.tsx` - Simple renderer (currently used)
- `src/components/exam-new/ExamInterface.tsx` - Main exam interface

### 2. **Type Definitions**
- `src/lib/exam-new/types.ts` - TypeScript types for exam system
- `src/lib/exam-new/pdf-extractor.ts` - PDF extraction utilities

### 3. **Sample Papers** (JSON format)
- `public/papers/0417_s20_qp_11_clean.json` - May/June 2020 Variant 11 (near perfect conversion)
- `public/papers/demo_perfect_ui.json` - 2024 sample (main reference)
- `public/papers/sample_test.json` - Sample test file

### 4. **Parser Scripts** (Python)
- `scripts/parser-v1-basic.py` - Basic parser version 1
- `scripts/quick-test-parser.py` - Quick test parser
- `scripts/test-all-parsers.py` - Test all parser versions
- `scripts/golden-ict-parser.py` - Golden ICT parser
- `scripts/ict-pdf-parser.py` - ICT PDF parser

### 5. **Documentation**
- `RENDERER_TESTING_GUIDE.md` - Testing guide for renderers
- `QUICK_PARSER_TEST.md` - Quick parser testing guide
- `TEST_PARSER_VERSIONS.md` - Parser versions documentation

### 6. **Practice Page** (Uses the renderer)
- `src/app/practice/[paperId]/page.tsx` - Practice page that uses ExamInterface

## Method 1: Create a Git Branch and Push (RECOMMENDED)

```powershell
# Navigate to your project
cd igcse-study-hub

# Create a new branch for question rendering
git checkout -b question-rendering-system

# Add all the relevant files
git add src/components/exam-new/
git add src/lib/exam-new/
git add public/papers/0417_s20_qp_11_clean.json
git add public/papers/demo_perfect_ui.json
git add public/papers/sample_test.json
git add scripts/parser-v1-basic.py
git add scripts/quick-test-parser.py
git add scripts/test-all-parsers.py
git add scripts/golden-ict-parser.py
git add scripts/ict-pdf-parser.py
git add RENDERER_TESTING_GUIDE.md
git add QUICK_PARSER_TEST.md
git add TEST_PARSER_VERSIONS.md
git add src/app/practice/

# Commit the files
git commit -m "Add question rendering system files"

# Push to GitHub
git push origin question-rendering-system
```

Then share the branch with your friend:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/tree/question-rendering-system
```

## Method 2: Create a Zip Archive of Specific Files

```powershell
# Create a directory for the files
mkdir question-rendering-export

# Copy renderer components
mkdir question-rendering-export\components
xcopy src\components\exam-new question-rendering-export\components\exam-new /E /I

# Copy lib files
mkdir question-rendering-export\lib
xcopy src\lib\exam-new question-rendering-export\lib\exam-new /E /I

# Copy sample papers
mkdir question-rendering-export\papers
copy public\papers\0417_s20_qp_11_clean.json question-rendering-export\papers\
copy public\papers\demo_perfect_ui.json question-rendering-export\papers\
copy public\papers\sample_test.json question-rendering-export\papers\

# Copy parser scripts
mkdir question-rendering-export\scripts
copy scripts\parser-v1-basic.py question-rendering-export\scripts\
copy scripts\quick-test-parser.py question-rendering-export\scripts\
copy scripts\test-all-parsers.py question-rendering-export\scripts\
copy scripts\golden-ict-parser.py question-rendering-export\scripts\
copy scripts\ict-pdf-parser.py question-rendering-export\scripts\

# Copy documentation
copy RENDERER_TESTING_GUIDE.md question-rendering-export\
copy QUICK_PARSER_TEST.md question-rendering-export\
copy TEST_PARSER_VERSIONS.md question-rendering-export\

# Copy practice page
mkdir question-rendering-export\practice
xcopy src\app\practice question-rendering-export\practice /E /I

# Create a zip file (requires PowerShell 5.0+)
Compress-Archive -Path question-rendering-export -DestinationPath question-rendering-system.zip
```

## Method 3: Use Git to Create a Patch File

```powershell
# Add all files to staging
git add src/components/exam-new/
git add src/lib/exam-new/
git add public/papers/0417_s20_qp_11_clean.json
git add public/papers/demo_perfect_ui.json
git add public/papers/sample_test.json
git add scripts/parser-v1-basic.py
git add scripts/quick-test-parser.py
git add scripts/test-all-parsers.py
git add scripts/golden-ict-parser.py
git add scripts/ict-pdf-parser.py
git add RENDERER_TESTING_GUIDE.md
git add QUICK_PARSER_TEST.md
git add TEST_PARSER_VERSIONS.md
git add src/app/practice/

# Create a patch file
git diff --cached > question-rendering-system.patch
```

Your friend can apply the patch with:
```powershell
git apply question-rendering-system.patch
```

## Quick Command (RECOMMENDED - One Line)

```powershell
cd igcse-study-hub; git checkout -b question-rendering-system; git add src/components/exam-new/ src/lib/exam-new/ public/papers/0417_s20_qp_11_clean.json public/papers/demo_perfect_ui.json public/papers/sample_test.json scripts/parser-v1-basic.py scripts/quick-test-parser.py scripts/test-all-parsers.py scripts/golden-ict-parser.py scripts/ict-pdf-parser.py RENDERER_TESTING_GUIDE.md QUICK_PARSER_TEST.md TEST_PARSER_VERSIONS.md src/app/practice/; git commit -m "Add complete question rendering system with samples"; git push origin question-rendering-system
```

## Why Method 1 (Git Branch) is Best

- ✅ Preserves git history
- ✅ Easy to review changes
- ✅ Can be merged easily
- ✅ Tracks file relationships
- ✅ Your friend can pull updates
- ✅ Professional workflow

## What Your Friend Needs to Know

Send them this information along with the files:

### 1. **Main Components:**
   - `ExamInterface.tsx` - Main component that renders the entire exam
   - `QuestionRendererSimple.tsx` - Currently used renderer (simple, clean)
   - `QuestionRendererV1.tsx` - Alternative renderer version

### 2. **Key Sample Files:**
   - `demo_perfect_ui.json` - 2024 sample format (reference standard)
   - `0417_s20_qp_11_clean.json` - May/June 2020 Variant 11 (near perfect conversion)

### 3. **How to Use:**
   - Import `ExamInterface` component
   - Load a JSON paper file
   - Pass it to the component
   - The renderer handles all question types automatically

### 4. **Testing:**
   - Use `RENDERER_TESTING_GUIDE.md` for testing instructions
   - Use `QUICK_PARSER_TEST.md` for parser testing

## After Sending

Your friend should:
1. Clone or pull the branch
2. Run `npm install` to get dependencies
3. Check the documentation files
4. Test with the sample papers provided
5. Review the renderer components to understand the structure

## Notes

- The 2024 sample (`demo_perfect_ui.json`) is the gold standard format
- The May/June 2020 paper shows a near-perfect real-world conversion
- All renderers support nested subparts, images, tables, and various input types
- The system is designed to be extensible for future question types