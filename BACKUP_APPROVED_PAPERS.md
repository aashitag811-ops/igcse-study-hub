# Backup System for Approved Papers

## Critical Rule
**ALWAYS backup approved papers before any parsing operations!**

## Backup Locations
- `public/papers-og/` - Original approved versions
- `public/papers-codex/` - Alternative backup location
- Git commits - Version control backup

## Backup Command
```powershell
# Backup a single approved paper
Copy-Item "public/papers/PAPER_ID.json" "public/papers-og/PAPER_ID.json" -Force

# Backup all papers
Copy-Item "public/papers/*.json" "public/papers-og/" -Force
```

## Before Running Parser
1. Check if paper already exists and is approved
2. If approved, create backup first
3. Parser should skip existing files by default

## Restore Command
```powershell
# Restore from backup
Copy-Item "public/papers-og/PAPER_ID.json" "public/papers/PAPER_ID.json" -Force
```

## Current Approved Papers
- ✅ 0417_s20_qp_11.json - Manually refined, DO NOT OVERWRITE

---
Made with Bob