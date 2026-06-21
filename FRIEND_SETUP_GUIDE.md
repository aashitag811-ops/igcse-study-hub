# Setup Guide for Team Members

Complete guide for your friend to set up the project and start adding papers.

## Prerequisites

- Git installed
- Python 3.8+ installed
- Access to GitHub repo
- Access to Vercel (optional, for deployment)

## Step 1: Clone the Repository

```powershell
# Navigate to where you want the project
cd Desktop

# Clone the repo
git clone https://github.com/YOUR-USERNAME/igcse-study-hub.git

# Enter the project
cd igcse-study-hub
```

## Step 2: Install Node Dependencies

```powershell
npm install
```

## Step 3: Install Python Dependencies

```powershell
cd scripts
pip install -r requirements.txt
cd ..
```

## Step 4: Set Up Environment Variables

Create `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

(Get these from the main team member or Supabase dashboard)

## Step 5: Test the Setup

```powershell
# Start dev server
npm run dev

# Open browser to http://localhost:3000
```

## Step 6: Convert Papers

### For 2024 Papers (All Variants):

```powershell
cd scripts

# February/March 2024
python convert-paper-to-json.py 2024 m 1
python convert-paper-to-json.py 2024 m 2
python convert-paper-to-json.py 2024 m 3

# May/June 2024
python convert-paper-to-json.py 2024 s 1
python convert-paper-to-json.py 2024 s 2
python convert-paper-to-json.py 2024 s 3

# October/November 2024
python convert-paper-to-json.py 2024 w 1
python convert-paper-to-json.py 2024 w 2
python convert-paper-to-json.py 2024 w 3
```

## Step 7: Commit and Push

```powershell
# Go back to project root
cd ..

# Pull latest changes first
git pull origin main

# Add all new papers
git add public/papers/

# Commit
git commit -m "Add all 2024 papers (Feb/Mar, May/Jun, Oct/Nov)"

# Push
git push origin main
```

## Step 8: Verify Deployment

- Vercel will auto-deploy (if connected)
- Check the live site in 2-3 minutes
- Papers should appear in the dropdown

## Troubleshooting

### "Module not found" error
```powershell
cd scripts
pip install -r requirements.txt
```

### "EOF marker not found" error
The PDF might be corrupted or not a standard Cambridge paper. Skip it and try the next one.

### Git conflicts
```powershell
git pull origin main
# Resolve conflicts in VS Code
git add .
git commit -m "Resolve conflicts"
git push origin main
```

### Papers not showing in dropdown
- Check that JSON files are in `public/papers/`
- Verify file naming: `0417_m24_qp_11.json`
- Clear browser cache and refresh

## Quick Reference

**Season Codes:**
- `m` = February/March
- `s` = May/June
- `w` = October/November

**File Structure:**
```
public/papers/
├── 0417_m24_qp_11.json
├── 0417_m24_qp_12.json
├── 0417_m24_qp_13.json
├── 0417_s24_qp_11.json
└── ...
```

## Need Help?

Contact the main team member or check:
- `PAPER_CONVERSION_GUIDE.md` - Detailed conversion guide
- `GIT_CONFLICT_RESOLUTION.md` - Git help
- `PYTHON_SETUP_GUIDE.md` - Python installation

Happy contributing! 🚀