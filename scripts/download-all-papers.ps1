# ============================================================
# Download ALL past papers for all 13 IGCSE subjects 2010-2025
# Files: QP + MS (per variant) + ER (shared per session) + GT (shared per session)
# Run from repo root: cd scripts; .\download-all-papers.ps1
# ============================================================

$BaseUrl = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload"
$OutDir  = "pastpapers"
$MinSize = 50KB   # some MSs are small, ERs tiny

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$script:Downloaded = 0; $script:Skipped = 0; $script:Failed = 0; $script:Total = 0

function Get-PDF {
    param([string]$Code)
    $script:Total++
    $url = "$BaseUrl/$Code.pdf"
    $out = "$OutDir/$Code.pdf"
    if (Test-Path $out) {
        if ((Get-Item $out).Length -gt $MinSize) { $script:Skipped++; return }
        Remove-Item $out -Force
    }
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $url -OutFile $out -TimeoutSec 45 -ErrorAction Stop
        $item = Get-Item $out -ErrorAction SilentlyContinue
        $size = if ($item) { $item.Length } else { 0 }
        $bytes = if ($size -gt 4) { [System.IO.File]::ReadAllBytes($out)[0..3] } else { @(0,0,0,0) }
        $isPDF = $bytes[0] -eq 0x25 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x44 -and $bytes[3] -eq 0x46
        if ($isPDF -and $size -gt $MinSize) {
            $script:Downloaded++
        } else {
            Remove-Item $out -Force -ErrorAction SilentlyContinue
            $script:Failed++
        }
    } catch {
        Remove-Item $out -Force -ErrorAction SilentlyContinue
        $script:Failed++
    }
}

$years = 10..25 | ForEach-Object { $_.ToString().PadLeft(2,'0') }

# ---- Helper: download QP+MS for given variants, ER+GT shared per session ----
function Download-Session {
    param(
        [string]$Code,
        [string[]]$Sessions,
        [string[]]$Years,
        [string[]]$QpVariants,  # e.g. "11","12","13","21","22","23"
        [string[]]$MsVariants,  # usually same as QP, sometimes shared (e.g. "12" only)
        [bool]$HasER = $true,
        [bool]$HasGT = $true
    )
    foreach ($yr in $Years) {
        foreach ($sess in $Sessions) {
            foreach ($v in $QpVariants) { Get-PDF "${Code}_${sess}${yr}_qp_${v}" }
            foreach ($v in $MsVariants) { Get-PDF "${Code}_${sess}${yr}_ms_${v}" }
            if ($HasER) { Get-PDF "${Code}_${sess}${yr}_er" }
            if ($HasGT) { Get-PDF "${Code}_${sess}${yr}_gt" }
        }
    }
}

Write-Host "=== 0610 Biology ===" -ForegroundColor Cyan
Download-Session -Code "0610" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23","31","32","33","41","42","43","51","52","53","61","62","63") `
    -MsVariants @("11","12","13","21","22","23","31","32","33","41","42","43","51","52","53","61","62","63")

Write-Host "=== 0620 Chemistry ===" -ForegroundColor Cyan
Download-Session -Code "0620" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23","31","32","33","41","42","43","51","52","53","61","62","63") `
    -MsVariants @("11","12","13","21","22","23","31","32","33","41","42","43","51","52","53","61","62","63")

Write-Host "=== 0625 Physics ===" -ForegroundColor Cyan
Download-Session -Code "0625" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23","31","32","33","41","42","43","51","52","53","61","62","63") `
    -MsVariants @("11","12","13","21","22","23","31","32","33","41","42","43","51","52","53","61","62","63")

Write-Host "=== 0580 Mathematics ===" -ForegroundColor Cyan
Download-Session -Code "0580" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23","31","32","33","41","42","43") `
    -MsVariants @("11","12","13","21","22","23","31","32","33","41","42","43")

Write-Host "=== 0606 Additional Mathematics ===" -ForegroundColor Cyan
Download-Session -Code "0606" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23") `
    -MsVariants @("11","12","13","21","22","23")

Write-Host "=== 0455 Economics ===" -ForegroundColor Cyan
Download-Session -Code "0455" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23") `
    -MsVariants @("11","12","13","21","22","23")

Write-Host "=== 0452 Accounting ===" -ForegroundColor Cyan
Download-Session -Code "0452" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23") `
    -MsVariants @("11","12","13","21","22","23")

Write-Host "=== 0450 Business Studies ===" -ForegroundColor Cyan
Download-Session -Code "0450" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23") `
    -MsVariants @("11","12","13","21","22","23")

Write-Host "=== 0417 ICT ===" -ForegroundColor Cyan
Download-Session -Code "0417" -Sessions @("s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","31","32") `
    -MsVariants @("11","12","13","21","22","31","32")

Write-Host "=== 0500 First Language English ===" -ForegroundColor Cyan
Download-Session -Code "0500" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23") `
    -MsVariants @("11","12","13","21","22","23")

Write-Host "=== 0520 French ===" -ForegroundColor Cyan
Download-Session -Code "0520" -Sessions @("m","s","w") -Years $years `
    -QpVariants @("11","12","13","21","22","23","41","42","43") `
    -MsVariants @("11","12","13","21","22","23","41","42","43")

Write-Host "=== 0457 Global Perspectives ===" -ForegroundColor Cyan
Download-Session -Code "0457" -Sessions @("s","w") -Years $years `
    -QpVariants @("11","12","13") `
    -MsVariants @("11","12","13")

# Hindi 0549 - not on PapaCambridge, skip QP/MS but try ER+GT
Write-Host "=== 0549 Hindi (ER+GT only - QP not on PapaCambridge) ===" -ForegroundColor Yellow
foreach ($yr in $years) {
    foreach ($sess in @("s","w")) {
        Get-PDF "0549_${sess}${yr}_er"
        Get-PDF "0549_${sess}${yr}_gt"
    }
}

Write-Host "`n=== COMPLETE ===" -ForegroundColor Green
$dl = $script:Downloaded; $sk = $script:Skipped; $fa = $script:Failed; $tot = $script:Total
Write-Host "Downloaded: $dl | Skipped: $sk | Failed/NotFound: $fa | Total: $tot"
