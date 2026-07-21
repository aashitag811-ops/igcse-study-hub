# Step-by-Step Setup Instructions

## Step 1: Move Poppler to Program Files

1. Open File Explorer
2. Navigate to your Downloads folder
3. Find the Poppler folder (should be named something like `Release-XX.XX.X-0`)
4. **Right-click** on the folder → **Cut** (or press Ctrl+X)
5. Navigate to `C:\Program Files\`
6. **Right-click** in the folder → **Paste** (or press Ctrl+V)
7. **Rename** the folder to just `poppler` (remove the version numbers)

Final path should be: `C:\Program Files\poppler`

## Step 2: Add to System PATH

### For Tesseract:
1. Press `Windows Key + R`
2. Type: `sysdm.cpl` and press Enter
3. Click **"Advanced"** tab
4. Click **"Environment Variables"** button
5. Under **"System variables"**, find and select **"Path"**
6. Click **"Edit"**
7. Click **"New"**
8. Add: `C:\Program Files\Tesseract-OCR`
9. Click **"OK"** on all windows

### For Poppler:
1. In the same **"Path"** editor (from step 5 above)
2. Click **"New"** again
3. Add: `C:\Program Files\poppler\Library\bin`
4. Click **"OK"** on all windows

## Step 3: Restart PowerShell/Terminal

**IMPORTANT:** Close ALL PowerShell/Terminal windows and reopen them for PATH changes to take effect.

## Step 4: Verify Installation

Open a NEW PowerShell window and run:

```powershell
# Test Tesseract
tesseract --version

# Test Poppler
pdftoppm -v
```

You should see version information for both.

## Step 5: Install Python Packages

In PowerShell, run these commands ONE BY ONE:

```powershell
pip install pytesseract
```

Wait for it to finish, then:

```powershell
pip install pdf2image
```

Wait for it to finish, then:

```powershell
pip install opencv-python
```

Wait for it to finish, then:

```powershell
pip install numpy
```

## Step 6: Run Test Script

Navigate to your project and test:

```powershell
cd C:\Users\sahal\Documents\GitHub\igcse-study-hub\scripts
python test-advanced-tools.py
```

## Expected Output:

```
Testing Advanced PDF Tools...
--------------------------------------------------
✓ Tesseract OCR: v5.3.3
✓ pdf2image: Installed
✓ OpenCV: v4.8.1
✓ pdfplumber: Installed
--------------------------------------------------

If all tests pass, run the advanced parser!
```

## Troubleshooting:

### If Tesseract test fails:
- Make sure you added `C:\Program Files\Tesseract-OCR` to PATH
- Restart PowerShell
- Check if Tesseract is installed at that location

### If Poppler test fails:
- Make sure Poppler folder is at `C:\Program Files\poppler`
- Make sure you added `C:\Program Files\poppler\Library\bin` to PATH
- Restart PowerShell

### If Python packages fail:
- Make sure Python is installed
- Try: `python -m pip install <package_name>`

## Next Steps:

Once all tests pass, let me know and I'll create the ultra-advanced parser!