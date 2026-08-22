# Copy all downloaded A-Level PDFs from the flat download folder into public/pdfs
# Run from repo root: .\scripts\copy-alevels-to-public.ps1

$sourceDir      = "scripts\pastpapers-alevels"
$destinationDir = "public\pdfs"

if (-not (Test-Path $sourceDir)) {
    Write-Host "Source folder not found: $sourceDir" -ForegroundColor Red
    Write-Host "Run 'node scripts/download-alevels-fast.js' first." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $destinationDir)) {
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    Write-Host "Created: $destinationDir"
}

$pdfs     = Get-ChildItem -Path $sourceDir -Filter "*.pdf"
$total    = $pdfs.Count
$copied   = 0
$skipped  = 0

Write-Host "`nCopying $total A-Level PDFs → $destinationDir`n"

foreach ($pdf in $pdfs) {
    $dest = Join-Path $destinationDir $pdf.Name
    if (Test-Path $dest) {
        $skipped++
    } else {
        Copy-Item -Path $pdf.FullName -Destination $dest -Force
        $copied++
    }
    if (($copied + $skipped) % 200 -eq 0) {
        Write-Host "  Progress: $($copied + $skipped) / $total"
    }
}

Write-Host "`nDone!"
Write-Host "  Copied  : $copied"
Write-Host "  Skipped : $skipped (already existed)"
Write-Host "  Total   : $total"
