# Automated cleanup script - removes 270KB error files without confirmation
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Auto-Cleaning Error Files (270 KB)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorSize = 270 * 1KB
$Tolerance = 5 * 1KB
$MinSize = $ErrorSize - $Tolerance
$MaxSize = $ErrorSize + $Tolerance

Write-Host "Scanning for error files..." -ForegroundColor Yellow
$ErrorFiles = Get-ChildItem -Path "pastpapers" -Filter "*.pdf" -Recurse | 
    Where-Object { $_.Length -ge $MinSize -and $_.Length -le $MaxSize }

$TotalErrors = $ErrorFiles.Count
Write-Host "Found $TotalErrors error files to delete" -ForegroundColor Red
Write-Host ""

if ($TotalErrors -eq 0) {
    Write-Host "No error files found! All clean!" -ForegroundColor Green
    exit
}

# Show breakdown by subject
Write-Host "Error files by subject:" -ForegroundColor Yellow
$ErrorFiles | ForEach-Object {
    $_.FullName -replace '.*\\pastpapers\\([^\\]+)\\.*', '$1'
} | Group-Object | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) files" -ForegroundColor White
}
Write-Host ""

Write-Host "Starting automatic deletion..." -ForegroundColor Yellow
Write-Host ""

$Deleted = 0
foreach ($File in $ErrorFiles) {
    try {
        Remove-Item $File.FullName -Force
        $Deleted++
        if ($Deleted % 500 -eq 0) {
            $Percent = [math]::Round(($Deleted / $TotalErrors) * 100, 1)
            Write-Host "  Progress: $Deleted / $TotalErrors ($Percent%)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "  Failed to delete: $($File.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deleted: $Deleted error files" -ForegroundColor Green
Write-Host ""

# Show final statistics
Write-Host "Final Statistics:" -ForegroundColor Cyan
$ValidFiles = Get-ChildItem -Path "pastpapers" -Filter "*.pdf" -Recurse | 
    Where-Object { $_.Length -gt 350KB }
$TotalFiles = (Get-ChildItem -Path "pastpapers" -Filter "*.pdf" -Recurse).Count
Write-Host "  Valid PDFs (>350 KB): $($ValidFiles.Count)" -ForegroundColor Green
Write-Host "  Total PDFs remaining: $TotalFiles" -ForegroundColor White
Write-Host "  Space saved: $([math]::Round($Deleted * 270 / 1MB, 1)) MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "All done! Your past papers are organized and clean!" -ForegroundColor Green

# Made with Bob
