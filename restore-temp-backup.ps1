# Restore Previous Files
# Run this if you don't like the OG files and want to go back

Write-Host "=== Restoring Previous Files ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "public/papers-temp-backup")) {
    Write-Host "❌ No backup found!" -ForegroundColor Red
    Write-Host "The backup folder doesn't exist." -ForegroundColor Yellow
    exit 1
}

# Clear main folder
Write-Host "1. Clearing main folder..." -ForegroundColor Yellow
Remove-Item "public/papers/*.json" -Force
Write-Host "   ✓ Cleared" -ForegroundColor Green

# Restore from backup
Write-Host "2. Restoring from backup..." -ForegroundColor Yellow
Copy-Item "public/papers-temp-backup/*.json" -Destination "public/papers/" -Force
$count = (Get-ChildItem "public/papers/*.json").Count
Write-Host "   ✓ Restored $count files" -ForegroundColor Green

# Clean up backup
Write-Host "3. Cleaning up backup..." -ForegroundColor Yellow
Remove-Item "public/papers-temp-backup" -Recurse -Force
Write-Host "   ✓ Backup removed" -ForegroundColor Green

Write-Host ""
Write-Host "=== PREVIOUS FILES RESTORED ===" -ForegroundColor Green
Write-Host ""
Write-Host "Your previous files are back in place." -ForegroundColor White
Write-Host "Refresh your browser to see them." -ForegroundColor White
Write-Host ""

# Made with Bob
