# 📄 Paper Conversion Guide - Super Simple!

This guide shows you how to add new exam papers to your system. It's just **3 easy steps**!

## 🎯 What You Need

1. Python installed on your computer
2. Internet connection (to download from PapaCambridge)
3. 2 minutes of your time

## 📦 One-Time Setup (Do This Once)

Open PowerShell in your project folder and run:

```powershell
cd scripts
pip install -r requirements.txt
```

That's it! You're ready to convert papers.

## 🚀 How to Add a New Paper (3 Steps)

### Step 1: Run the Script

```powershell
cd scripts
python convert-paper-to-json.py <year> <season> <variant>
```

**Examples:**
```powershell
# February/March 2025, Variant 2
python convert-paper-to-json.py 2025 m 2

# May/June 2024, Variant 1
python convert-paper-to-json.py 2024 s 1

# October/November 2023, Variant 3
python convert-paper-to-json.py 2023 w 3
```

**Season Codes:**
- `m` = February/March
- `s` = May/June
- `w` = October/November

### Step 2: Wait for Success Message

You'll see:
```
📥 Downloading from: https://pastpapers.papacambridge.com/...
✅ Downloaded 234567 bytes
📄 Extracting text from PDF...
🔍 Parsing questions...

✅ SUCCESS!
📁 Saved to: C:\...\public\papers\0417_m25_qp_12.json
📊 Total questions: 8
📝 Total marks: 80
```

### Step 3: Done!

The paper is now available in your app! Just refresh and select it from the dropdowns.

## 📁 Where Are Papers Stored?

All converted papers are saved in:
```
public/papers/
  ├── 0417_m25_qp_12.json  (Feb/Mar 2025, Variant 2)
  ├── 0417_s24_qp_11.json  (May/Jun 2024, Variant 1)
  └── 0417_w23_qp_13.json  (Oct/Nov 2023, Variant 3)
```

Each file is tiny (~5KB) and contains all the questions in a structured format.

## 🔧 Troubleshooting

### "Module not found" error
```powershell
cd scripts
pip install -r requirements.txt
```

### "Failed to download PDF"
- Check your internet connection
- Verify the paper exists on PapaCambridge
- Make sure year/season/variant are correct

### "Failed to parse paper"
- The PDF might have unusual formatting
- Send me the error message and I'll fix the script

## 💡 Tips

1. **Convert papers as needed** - No need to convert all papers at once
2. **Small file sizes** - Each JSON is ~5KB, so storage is not an issue
3. **No maintenance** - Once converted, papers work forever
4. **Easy to share** - Just commit the JSON files to your repo

## 🎓 What Papers Can You Convert?

Currently supports:
- **Subject:** Cambridge IGCSE ICT (0417)
- **Years:** 2020-2025 (any year on PapaCambridge)
- **Seasons:** February/March, May/June, October/November
- **Variants:** 1, 2, 3

## 📞 Need Help?

If you get any errors:
1. Copy the error message
2. Send it to me
3. I'll fix the script for you

That's it! Super simple, no servers, no complexity. Just run the script when you need a new paper! 🎉