# Fill Missing Papers Script
# Re-runs the download to catch any papers that were missed
# Skips existing files, only downloads new ones

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Filling Missing Papers" -ForegroundColor Cyan
Write-Host "   This will skip existing files and only download new ones" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Run the smart downloader again
& ".\download-pastpapers-smart.ps1"

# Made with Bob
