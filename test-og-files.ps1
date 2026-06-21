# Test OG Files on Separate Localhost
# This script temporarily swaps in your OG files so you can test them

Write-Host "=== Testing OG Files (April 8-9) ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Backup current main folder
Write-Host "1. Backing up current main folder..." -ForegroundColor Yellow
if (Test-Path "public/papers-temp-backup") {
    Remove-Item "public/papers-temp-backup" -Recurse -Force
}
New-Item -ItemType Directory -Path "public/papers-temp-backup" -Force | Out-Null
Copy-Item "public/papers/*" -Destination "public/papers-temp-backup/" -Force
Write-Host "   ✓ Backed up to papers-temp-backup/" -ForegroundColor Green

# Step 2: Clear main folder
Write-Host "2. Clearing main folder..." -ForegroundColor Yellow
Remove-Item "public/papers/*.json" -Force
Write-Host "   ✓ Cleared" -ForegroundColor Green

# Step 3: Copy OG files to main folder
Write-Host "3. Copying OG files to main folder..." -ForegroundColor Yellow
Copy-Item "public/papers-og/*.json" -Destination "public/papers/" -Force
Copy-Item "public/papers-codex/sample_test.json" -Destination "public/papers/" -Force
$count = (Get-ChildItem "public/papers/*.json").Count
Write-Host "   ✓ Copied $count OG files" -ForegroundColor Green

# Step 4: Instructions
Write-Host ""
Write-Host "=== OG FILES ARE NOW ACTIVE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Open: http://localhost:3000/practice/0417_s20_qp_11" -ForegroundColor White
Write-Host "3. Test the papers - check if they look good!" -ForegroundColor White
Write-Host ""
Write-Host "If you like them:" -ForegroundColor Yellow
Write-Host "  - They're already in place, just keep using them!" -ForegroundColor White
Write-Host ""
Write-Host "If you don't like them:" -ForegroundColor Yellow
Write-Host "  - Run: .\restore-temp-backup.ps1" -ForegroundColor White
Write-Host "  - This will restore your previous files" -ForegroundColor White
Write-Host ""

# Made with Bob
