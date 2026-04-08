# Restore Original Design Script
Write-Host "🔄 Restoring original design..." -ForegroundColor Cyan

# Remove current src folder
Remove-Item -Path "src" -Recurse -Force -ErrorAction SilentlyContinue

# Restore from backup
Copy-Item -Path "backups/current-design/src" -Destination "src" -Recurse -Force

Write-Host "✅ Original design restored successfully!" -ForegroundColor Green
Write-Host "The dev server will automatically reload." -ForegroundColor Yellow

# Made with Bob
