# 🐍 Python Setup Guide for Windows

Quick guide to install Python and get the paper conversion script working.

## Step 1: Download Python

### Official Website (Recommended)
**Link:** https://www.python.org/downloads/

1. Click the big yellow "Download Python 3.12.x" button
2. Download will start automatically

### Direct Link
**Windows 64-bit:** https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe

## Step 2: Install Python

1. **Run the installer** (python-3.12.0-amd64.exe)

2. **IMPORTANT:** Check these boxes:
   - ✅ **"Add python.exe to PATH"** (MUST CHECK THIS!)
   - ✅ "Install launcher for all users"

3. Click **"Install Now"**

4. Wait for installation (2-3 minutes)

5. Click **"Close"** when done

## Step 3: Verify Installation

Open PowerShell and type:
```powershell
python --version
```

You should see:
```
Python 3.12.0
```

If you see this, you're good! ✅

## Step 4: Install Script Dependencies

In your project folder:
```powershell
cd scripts
pip install -r requirements.txt
```

You should see:
```
Successfully installed PyPDF2-3.0.1 requests-2.31.0
```

## Step 5: Test the Script

Try converting a paper:
```powershell
python convert-paper-to-json.py 2025 m 2
```

If it works, you'll see:
```
📥 Downloading from: https://...
✅ Downloaded 234567 bytes
📄 Extracting text from PDF...
🔍 Parsing questions...
✅ SUCCESS!
```

## Troubleshooting

### "python is not recognized"
**Problem:** You didn't check "Add python.exe to PATH" during installation

**Solution:**
1. Uninstall Python (Windows Settings → Apps)
2. Reinstall and CHECK the "Add to PATH" box

### "pip is not recognized"
**Problem:** pip wasn't installed

**Solution:**
```powershell
python -m ensurepip --upgrade
```

### "Module not found"
**Problem:** Dependencies not installed

**Solution:**
```powershell
cd scripts
pip install -r requirements.txt
```

### Still having issues?
1. Restart PowerShell after installing Python
2. Restart your computer
3. Send me the error message and I'll help!

## Alternative: Microsoft Store (Easier)

If the above doesn't work:

1. Open **Microsoft Store**
2. Search for **"Python 3.12"**
3. Click **"Get"** or **"Install"**
4. Wait for installation
5. Python is automatically added to PATH!

Then continue from Step 4 above.

## Quick Reference

**Check Python:** `python --version`
**Check pip:** `pip --version`
**Install dependencies:** `pip install -r requirements.txt`
**Convert paper:** `python convert-paper-to-json.py 2025 m 2`

That's it! Once Python is installed, you're ready to convert papers! 🚀