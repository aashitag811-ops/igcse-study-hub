# Downloads QP + MS for the 140 MCQ papers that need parsing
# Run from repo root: cd scripts; .\download-missing-variants.ps1

$BaseUrl = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload"
$OutDir  = "pastpapers"
$MinSize = 200KB

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Downloaded = 0; $Skipped = 0; $Failed = 0

function Get-PDF {
    param([string]$Code)
    $url = "$BaseUrl/$Code.pdf"
    $out = "$OutDir/$Code.pdf"
    if (Test-Path $out) {
        if ((Get-Item $out).Length -gt $MinSize) { $script:Skipped++; return }
        Remove-Item $out -Force
    }
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $url -OutFile $out -TimeoutSec 60 -ErrorAction Stop
        $bytes = [System.IO.File]::ReadAllBytes($out)
        $isPDF = $bytes.Length -gt 4 -and $bytes[0] -eq 0x25 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x44 -and $bytes[3] -eq 0x46
        if ($isPDF -and (Get-Item $out).Length -gt $MinSize) {
            Write-Host "OK  $Code" -ForegroundColor Green
            $script:Downloaded++
        } else {
            Remove-Item $out -Force -ErrorAction SilentlyContinue
            Write-Host "NO  $Code" -ForegroundColor Yellow
            $script:Failed++
        }
    } catch {
        Write-Host "ERR $Code" -ForegroundColor Red
        $script:Failed++
    }
}

# Economics 0455 - variants 11 and 13 (variant 12 already done)
$econ_codes = @(
    "s13","s14","s15","s16","s17","s18","s19","s20","s21","s22","s23","s24","s25",
    "w13","w14","w15","w16","w17","w18","w19","w20","w21","w22","w23","w24","w25"
)
foreach ($c in $econ_codes) {
    Get-PDF "0455_${c}_qp_11"
    Get-PDF "0455_${c}_ms_11"
    Get-PDF "0455_${c}_qp_13"
    Get-PDF "0455_${c}_ms_13"
}

# Biology 0610 - variants 11, 13, 21, 23 (variant 12 and 22 already done)
$bio_sw_codes = @(
    "s14","s15","s16","s17","s18","s19","s20","s21","s22","s23","s24","s25",
    "w14","w15","w16","w17","w18","w19","w20","w21","w22","w23","w24","w25"
)
foreach ($c in $bio_sw_codes) {
    Get-PDF "0610_${c}_qp_11"
    Get-PDF "0610_${c}_ms_11"
    Get-PDF "0610_${c}_qp_13"
    Get-PDF "0610_${c}_ms_13"
    Get-PDF "0610_${c}_qp_21"
    Get-PDF "0610_${c}_ms_21"
    Get-PDF "0610_${c}_qp_23"
    Get-PDF "0610_${c}_ms_23"
}

# Accounting 0452 - m-series variants 11 and 13 (variant 12 already done)
$acc_m_codes = @("m20","m21","m22","m23","m24","m25")
foreach ($c in $acc_m_codes) {
    Get-PDF "0452_${c}_qp_11"
    Get-PDF "0452_${c}_ms_11"
    Get-PDF "0452_${c}_qp_13"
    Get-PDF "0452_${c}_ms_13"
}
# Accounting edge cases
Get-PDF "0452_s14_qp_11"; Get-PDF "0452_s14_ms_11"
Get-PDF "0452_s14_qp_13"; Get-PDF "0452_s14_ms_13"
Get-PDF "0452_w25_qp_11"; Get-PDF "0452_w25_ms_11"

Write-Host "`n=== DONE ===" -ForegroundColor Cyan
Write-Host "Downloaded: $Downloaded | Skipped: $Skipped | Failed/Not found: $Failed"
