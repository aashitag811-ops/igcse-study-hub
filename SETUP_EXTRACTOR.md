# Setup Advanced PDF Extractor

Quick guide to get the extractor working.

## Step 1: Install Python Packages

Open PowerShell in the project root and run:

```powershell
pip install pdfplumber Pillow PyPDF2
```

Or if you prefer using the requirements file:

```powershell
pip install -r scripts/requirements-advanced.txt
```

## Step 2: Test the Extractor

**If you're in the project root directory:**
```powershell
python scripts/advanced-pdf-extractor.py path/to/your/paper.pdf
```

**If you're already in the scripts directory:**
```powershell
python advanced-pdf-extractor.py path/to/your/paper.pdf
```

Example (from project root):
```powershell
python scripts/advanced-pdf-extractor.py "C:/Users/HP/Downloads/0417_s25_qp_12.pdf"
```

Example (from scripts directory):
```powershell
cd scripts
python advanced-pdf-extractor.py "C:/Users/HP/Downloads/0417_s25_qp_12.pdf"
```

## Step 3: Check Output

The JSON file will be saved to `public/papers/[filename].json`

## Troubleshooting

### Error: "pip is not recognized"
**Solution:** Python is not in PATH. Reinstall Python with "Add to PATH" checked.

### Error: "No module named 'pdfplumber'"
**Solution:** Run the pip install command above.

### Error: "Permission denied"
**Solution:** Run PowerShell as Administrator.

## Alternative: Manual Entry

If extraction doesn't work well, use manual entry instead:
- See `MANUAL_ENTRY_TEMPLATE.md`
- Takes 20-30 minutes per paper
- Perfect quality

## Quick Test

To verify everything works:

```powershell
# Install packages
pip install pdfplumber Pillow

# Test with a sample (if you have a PDF)
python scripts/advanced-pdf-extractor.py sample.pdf

# Check if JSON was created
ls public/papers/
```

## What You Need

- ✅ Python 3.8+ installed
- ✅ pip working
- ✅ PDF file to convert
- ✅ 5 minutes

That's it! The interface is already ready to use the extracted JSON files.