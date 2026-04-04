# Install Git on Windows - Step by Step

## You're seeing: "git is not recognized"

This means Git is not installed on your computer. Let's fix that!

---

## Method 1: Install Git (Recommended - Easy)

### Step 1: Download Git

1. Open your web browser
2. Go to: **https://git-scm.com/download/win**
3. The download should start automatically
4. If not, click **"Click here to download manually"**
5. Save the file (it's called something like `Git-2.43.0-64-bit.exe`)

### Step 2: Install Git

1. **Find the downloaded file** (usually in Downloads folder)
2. **Double-click** the installer file
3. **Click "Yes"** if Windows asks for permission

### Step 3: Installation Wizard

Follow these steps in the installer:

1. **License Agreement**
   - Click **Next**

2. **Select Destination Location**
   - Keep default: `C:\Program Files\Git`
   - Click **Next**

3. **Select Components**
   - Keep all defaults checked
   - Click **Next**

4. **Select Start Menu Folder**
   - Keep default
   - Click **Next**

5. **Choosing the default editor**
   - Select **"Use Visual Studio Code as Git's default editor"**
   - Click **Next**

6. **Adjusting your PATH environment**
   - Select **"Git from the command line and also from 3rd-party software"** (should be selected by default)
   - Click **Next**

7. **Choosing HTTPS transport backend**
   - Keep default: **"Use the OpenSSL library"**
   - Click **Next**

8. **Configuring line ending conversions**
   - Keep default: **"Checkout Windows-style, commit Unix-style"**
   - Click **Next**

9. **Configuring terminal emulator**
   - Keep default: **"Use MinTTY"**
   - Click **Next**

10. **Choose default behavior of git pull**
    - Keep default: **"Default (fast-forward or merge)"**
    - Click **Next**

11. **Choose credential helper**
    - Keep default: **"Git Credential Manager"**
    - Click **Next**

12. **Configuring extra options**
    - Keep defaults checked
    - Click **Next**

13. **Configuring experimental options**
    - Leave unchecked
    - Click **Install**

14. **Wait for installation** (takes 1-2 minutes)

15. **Finish**
    - Uncheck "View Release Notes"
    - Click **Finish**

### Step 4: Restart VS Code

**IMPORTANT:** You must restart VS Code for it to recognize Git!

1. Close VS Code completely
2. Open VS Code again
3. Open your project folder

### Step 5: Verify Git is Installed

In VS Code, open PowerShell terminal and run:

```powershell
git --version
```

**Expected output:**
```
git version 2.43.0.windows.1
```

If you see a version number, **Git is installed successfully!** ✅

---

## Method 2: Install Using Winget (Alternative)

If you prefer command line installation:

### Step 1: Open PowerShell as Administrator

1. Press `Windows key`
2. Type `PowerShell`
3. Right-click **Windows PowerShell**
4. Select **"Run as administrator"**
5. Click **Yes** when prompted

### Step 2: Install Git

```powershell
winget install --id Git.Git -e --source winget
```

### Step 3: Restart VS Code

Close and reopen VS Code, then verify:

```powershell
git --version
```

---

## After Installing Git

### Configure Git (Required)

Once Git is installed, you need to configure it with your name and email:

```powershell
# Set your name
git config --global user.name "Your Name"

# Set your email (use your GitHub email)
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

**Example:**
```powershell
git config --global user.name "Arinjay Saha"
git config --global user.email "arinjaysaha2010@gmail.com"
```

---

## Troubleshooting

### Issue: Still says "git is not recognized" after installing

**Solution 1: Restart Computer**
- Sometimes Windows needs a full restart
- Restart your computer
- Open VS Code
- Try `git --version` again

**Solution 2: Check PATH**
1. Press `Windows + R`
2. Type `sysdm.cpl` and press Enter
3. Click **"Advanced"** tab
4. Click **"Environment Variables"**
5. Under **"System variables"**, find **"Path"**
6. Click **"Edit"**
7. Check if this path exists: `C:\Program Files\Git\cmd`
8. If not, click **"New"** and add it
9. Click **OK** on all windows
10. Restart VS Code

**Solution 3: Use Git Bash Instead**
- After installing Git, you can use Git Bash
- In VS Code, click the dropdown next to terminal `+` icon
- Select **"Git Bash"**
- Use Git Bash instead of PowerShell

---

## Next Steps

After Git is installed and working:

1. **Go back to `DEPLOY_WITH_POWERSHELL.md`**
2. **Start from Step 2** (Initialize Git Repository)
3. Continue with the deployment process

---

## Quick Test

To make sure everything is working:

```powershell
# Check Git version
git --version

# Check Git config
git config --list

# You should see your name and email
```

---

## Alternative: Deploy Without Git (Using Vercel Dashboard)

If you're having trouble with Git, you can deploy directly:

### Option A: Drag and Drop

1. Go to https://vercel.com
2. Sign in
3. Click **"Add New"** → **"Project"**
4. Click **"Browse"** and select your project folder
5. Vercel will upload and deploy

### Option B: Vercel CLI Only

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (no Git needed)
vercel
```

But Git is recommended for version control and easier updates!

---

**Need Help?**

If you're still stuck:
1. Take a screenshot of the error
2. Check if Git installer downloaded completely
3. Try restarting your computer
4. Try Method 2 (Winget) if Method 1 didn't work

---

**Made with Bob** 🤖