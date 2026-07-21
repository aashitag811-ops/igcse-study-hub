# PowerShell script to copy all PDFs from nested structure to flat public/pdfs directory

$sourceBase = "scripts/pastpapers"
$destination = "public/pdfs"

# Create destination directory if it doesn't exist
if (-not (Test-Path $destination)) {
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Write-Host "Created directory: $destination"
}

# Get all PDF files recursively
$pdfFiles = Get-ChildItem -Path $sourceBase -Filter "*.pdf" -Recurse

$copiedCount = 0
$skippedCount = 0

foreach ($pdf in $pdfFiles) {
    $destPath = Join-Path $destination $pdf.Name
    
    # Copy file (overwrite if exists)
    Copy-Item -Path $pdf.FullName -Destination $destPath -Force
    $copiedCount++
    
    if ($copiedCount % 50 -eq 0) {
        Write-Host "Copied $copiedCount files..."
    }
}

Write-Host "`nCopy complete!"
Write-Host "Total files copied: $copiedCount"
Write-Host "Destination: $destination"

# Made with Bob
