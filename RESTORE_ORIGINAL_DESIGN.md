# 🔄 Restore Original Design

Your current design has been backed up to `backups/current-design/`

## To Restore Your Original Design

Run this command in PowerShell:

```powershell
Remove-Item -Path "src" -Recurse -Force; Copy-Item -Path "backups/current-design/src" -Destination "src" -Recurse -Force
```

Or run this single command:

```powershell
.\restore-original.ps1
```

## What This Does

- Removes the current `src` folder
- Restores the backed-up version from `backups/current-design/src`
- Your original design will be back instantly!

## Note

The dev server (`npm run dev`) will automatically reload after restoration.

---

**Your original design is safe in `backups/current-design/`** ✅