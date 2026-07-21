# Cleanup Invalid PDF Files (271 KB error pages)
# Removes files that are error pages disguised as PDFs

$BaseDir = "pastpapers"
$InvalidSize = 271KB
$Tolerance = 5KB  # Allow 5KB tolerance

$RemovedCount = 0

Write-Host "Scanning for invalid PDF files (271 KB error pages)..." -ForegroundColor Cyan

Get-ChildItem -Path $BaseDir -Filter "*.pdf" -Recurse | ForEach-Object {
    $file = $_
    $size = $file.Length
    
    # Check if file size is around 271 KB (with tolerance)
    if ($size -ge ($InvalidSize - $Tolerance) -and $size -le ($InvalidSize + $Tolerance)) {
        Write-Host "Removing: $($file.FullName) ($([math]::Round($size/1KB, 2)) KB)" -ForegroundColor Yellow
        Remove-Item $file.FullName -Force
        $RemovedCount++
    }
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
Write-Host "Removed $RemovedCount invalid files" -ForegroundColor Green

# Made with Bob
