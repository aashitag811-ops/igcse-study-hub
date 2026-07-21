# IGCSE Past Papers Mass Downloader

This script automatically downloads IGCSE past papers from PapaCambridge for multiple subjects, organizing them by subject, year, and session.

## 📋 What Gets Downloaded

### Subjects (13 total):
- **0580** - Mathematics
- **0606** - Additional Mathematics
- **0500** - First Language English
- **0549** - Hindi as a Second Language
- **0520** - French - Foreign Language
- **0610** - Biology
- **0620** - Chemistry
- **0625** - Physics
- **0417** - Information and Communication Technology
- **0450** - Business Studies
- **0452** - Accounting
- **0455** - Economics
- **0457** - Global Perspectives

### Years: 2015 - 2025

### Sessions:
- Summer (s)
- March (m)
- Winter (w)

### File Types:
- **QP** - Question Papers
- **MS** - Mark Schemes
- **GT** - Grade Thresholds
- **ER** - Examiner Reports

### Paper Variants:
Papers 11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43, 51, 52, 53, 61, 62, 63

## 🚀 How to Run

### For Windows (PowerShell):

1. **Open PowerShell** in the scripts directory:
   ```powershell
   cd c:\Users\sahal\Documents\GitHub\igcse-study-hub\scripts
   ```

2. **Run the script**:
   ```powershell
   .\download-pastpapers.ps1
   ```

   If you get an execution policy error, run this first:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### For Linux/Mac (Bash):

1. **Make the script executable**:
   ```bash
   chmod +x download-pastpapers.sh
   ```

2. **Run the script**:
   ```bash
   ./download-pastpapers.sh
   ```

## 📁 Output Structure

The script creates the following directory structure:

```
pastpapers/
├── 0580-Mathematics/
│   ├── 2015/
│   │   ├── Summer/
│   │   │   ├── 0580_s15_qp_11.pdf
│   │   │   ├── 0580_s15_ms_11.pdf
│   │   │   ├── 0580_s15_gt.pdf
│   │   │   └── 0580_s15_er.pdf
│   │   ├── March/
│   │   └── Winter/
│   ├── 2016/
│   └── ...
├── 0610-Biology/
├── 0620-Chemistry/
└── ...
```

## 📊 Features

### ✅ Smart Download
- **Skips existing files** - Won't re-download files you already have
- **PDF validation** - Only saves actual PDF files
- **Error handling** - Continues even if some files are missing

### 📝 Logging
- Creates a detailed log file with timestamp
- Tracks successful downloads, skipped files, and failures
- Located in: `pastpapers/download_log_YYYYMMDD_HHMMSS.txt`

### 🎨 Visual Feedback
- Color-coded output:
  - 🟢 Green = Successfully downloaded
  - 🟡 Yellow = Already exists (skipped)
  - 🔴 Red = Failed/Not found
  - 🔵 Blue = Information

### 📈 Statistics
At the end, you'll see:
- Total files downloaded
- Total files skipped (already existed)
- Total files failed/not found
- Total time taken

## ⚙️ Customization

### To modify subjects:
Edit the `$Subjects` hashtable in the PowerShell script or `SUBJECTS` array in the bash script.

### To change years:
Modify the `$Years` range:
```powershell
$Years = 2020..2025  # Only download 2020-2025
```

### To change sessions:
Edit the `$Sessions` hashtable to include/exclude sessions.

### To add/remove paper variants:
Modify the `$PaperNumbers` array.

## ⏱️ Expected Duration

- **Full download** (all subjects, all years): 2-4 hours depending on internet speed
- **Single subject**: 15-30 minutes
- **Single year**: 30-60 minutes

The script will show progress as it downloads.

## 🔍 Troubleshooting

### "File not found" errors
- This is normal! Not all paper variants exist for every subject/year/session
- The script will continue and download what's available

### PowerShell execution policy error
Run this command:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Slow downloads
- The script downloads files sequentially to avoid overwhelming the server
- You can pause and resume - already downloaded files will be skipped

### Internet connection issues
- The script will continue even if some downloads fail
- Check the log file for details
- Re-run the script to retry failed downloads

## 📝 Notes

1. **Only PDF files** are downloaded - practical papers (like ICT Paper 1 & 2) are automatically excluded
2. **Respectful downloading** - The script doesn't hammer the server with parallel requests
3. **Resume capability** - You can stop and restart the script anytime
4. **Space requirements** - Expect ~10-20 GB for all subjects and years

## 🎯 Quick Start Example

To download just Biology papers for 2023-2024:

1. Edit the script to modify:
   ```powershell
   $Subjects = @{
       "0610" = "Biology"
   }
   $Years = 2023..2024
   ```

2. Run the script:
   ```powershell
   .\download-pastpapers.ps1
   ```

## 📞 Support

If you encounter issues:
1. Check the log file in `pastpapers/download_log_*.txt`
2. Verify your internet connection
3. Ensure you have write permissions in the directory
4. Check if the PapaCambridge website is accessible

## 🔄 Updates

To get the latest papers:
- Simply re-run the script
- It will skip existing files and only download new ones
- Perfect for keeping your collection up to date!

---

**Happy studying! 📚✨**