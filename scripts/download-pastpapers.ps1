# IGCSE Past Papers Mass Downloader (PowerShell)
# Downloads papers from PapaCambridge for multiple subjects (2015-2025)

# Base directory for downloads
$BaseDir = "pastpapers"

# Create base directory
New-Item -ItemType Directory -Force -Path $BaseDir | Out-Null

# Log file
$LogFile = "$BaseDir/download_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Subject codes and names
$Subjects = @{
    "0580" = "Mathematics"
    "0606" = "Additional Mathematics"
    "0500" = "First Language English"
    "0549" = "Hindi as a Second Language"
    "0520" = "French - Foreign Language"
    "0610" = "Biology"
    "0620" = "Chemistry"
    "0625" = "Physics"
    "0417" = "Information and Communication Technology"
    "0450" = "Business Studies"
    "0452" = "Accounting"
    "0455" = "Economics"
    "0457" = "Global Perspectives"
}

# Years to download
$Years = 2015..2025

# Sessions
$Sessions = @{
    "s" = "Summer"
    "m" = "March"
    "w" = "Winter"
}

# Paper numbers (common variants)
$PaperNumbers = @("11", "12", "13", "21", "22", "23", "31", "32", "33", "41", "42", "43", "51", "52", "53", "61", "62", "63")

# Statistics
$script:TotalDownloaded = 0
$script:TotalFailed = 0
$script:TotalSkipped = 0

# Function to log messages
function Log-Message {
    param(
        [string]$Level,
        [string]$Message
    )
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogEntry
    Write-Host $LogEntry
}

# Function to print colored output
function Print-Status {
    param(
        [string]$Color,
        [string]$Message
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to download a file
function Download-File {
    param(
        [string]$Url,
        [string]$OutputPath
    )
    
    $FileName = Split-Path $OutputPath -Leaf
    
    # Check if file already exists
    if (Test-Path $OutputPath) {
        Print-Status "Yellow" "  O Already exists: $FileName"
        Log-Message "SKIP" "File already exists: $OutputPath"
        $script:TotalSkipped++
        return $true
    }
    
    try {
        # Download file
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -ErrorAction Stop
        
        # Check if it's a PDF
        $FileBytes = [System.IO.File]::ReadAllBytes($OutputPath)
        if ($FileBytes.Length -gt 4 -and $FileBytes[0] -eq 0x25 -and $FileBytes[1] -eq 0x50 -and $FileBytes[2] -eq 0x44 -and $FileBytes[3] -eq 0x46) {
            Print-Status "Green" "  + Downloaded: $FileName"
            Log-Message "SUCCESS" "Downloaded: $OutputPath"
            $script:TotalDownloaded++
            return $true
        } else {
            # Not a PDF, remove it
            Remove-Item $OutputPath -Force
            $script:TotalFailed++
            return $false
        }
    } catch {
        $script:TotalFailed++
        return $false
    }
}

# Function to download papers for a subject
function Download-SubjectPapers {
    param(
        [string]$SubjectCode,
        [string]$SubjectName
    )
    
    Print-Status "Cyan" "`n=========================================="
    Print-Status "Cyan" "Downloading: $SubjectName ($SubjectCode)"
    Print-Status "Cyan" "=========================================="
    Log-Message "INFO" "Starting download for $SubjectName ($SubjectCode)"
    
    # Create subject directory
    $SubjectDir = "$BaseDir/$SubjectCode-$SubjectName"
    New-Item -ItemType Directory -Force -Path $SubjectDir | Out-Null
    
    # Loop through years
    foreach ($Year in $Years) {
        Print-Status "Yellow" "`n--- Year: $Year ---"
        
        # Create year directory
        $YearDir = "$SubjectDir/$Year"
        New-Item -ItemType Directory -Force -Path $YearDir | Out-Null
        
        # Loop through sessions
        foreach ($SessionKey in $Sessions.Keys) {
            $SessionName = $Sessions[$SessionKey]
            
            Print-Status "Yellow" "`n  Session: $SessionName ($SessionKey)"
            
            # Create session directory
            $SessionDir = "$YearDir/$SessionName"
            New-Item -ItemType Directory -Force -Path $SessionDir | Out-Null
            
            # Get year suffix (last 2 digits)
            $YearSuffix = $Year.ToString().Substring(2, 2)
            
            # Download grade thresholds
            $GtCode = "${SubjectCode}_${SessionKey}${YearSuffix}_gt"
            $GtUrl = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${GtCode}.pdf"
            $GtPath = "$SessionDir/${GtCode}.pdf"
            Download-File -Url $GtUrl -OutputPath $GtPath | Out-Null
            
            # Download examiner reports
            $ErCode = "${SubjectCode}_${SessionKey}${YearSuffix}_er"
            $ErUrl = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${ErCode}.pdf"
            $ErPath = "$SessionDir/${ErCode}.pdf"
            Download-File -Url $ErUrl -OutputPath $ErPath | Out-Null
            
            # Loop through paper types (qp and ms)
            foreach ($PaperType in @("qp", "ms")) {
                # Loop through paper numbers
                foreach ($PaperNum in $PaperNumbers) {
                    $PaperCode = "${SubjectCode}_${SessionKey}${YearSuffix}_${PaperType}_${PaperNum}"
                    $PaperUrl = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${PaperCode}.pdf"
                    $PaperPath = "$SessionDir/${PaperCode}.pdf"
                    
                    Download-File -Url $PaperUrl -OutputPath $PaperPath | Out-Null
                }
            }
        }
    }
    
    Print-Status "Green" "`n+ Completed: $SubjectName"
    Log-Message "INFO" "Completed download for $SubjectName ($SubjectCode)"
}

# Main execution
Print-Status "Cyan" "=========================================================="
Print-Status "Cyan" "   IGCSE Past Papers Mass Downloader"
Print-Status "Cyan" "   Source: PapaCambridge"
Print-Status "Cyan" "   Years: 2015-2025"
Print-Status "Cyan" "=========================================================="

Log-Message "INFO" "Starting mass download process"
Log-Message "INFO" "Base directory: $BaseDir"

$StartTime = Get-Date

# Download papers for each subject
foreach ($SubjectCode in $Subjects.Keys) {
    Download-SubjectPapers -SubjectCode $SubjectCode -SubjectName $Subjects[$SubjectCode]
}

$EndTime = Get-Date
$Duration = $EndTime - $StartTime

# Print summary
Print-Status "Cyan" "`n=========================================================="
Print-Status "Cyan" "                   DOWNLOAD SUMMARY"
Print-Status "Cyan" "=========================================================="
Print-Status "Green" "+ Successfully downloaded: $TotalDownloaded files"
Print-Status "Yellow" "O Already existed (skipped): $TotalSkipped files"
Print-Status "Red" "X Failed/Not found: $TotalFailed files"
Print-Status "Cyan" "Time: $($Duration.Hours)h $($Duration.Minutes)m $($Duration.Seconds)s"
Print-Status "Cyan" "Files saved to: $BaseDir"
Print-Status "Cyan" "Log file: $LogFile"

Log-Message "INFO" "Download process completed"
Log-Message "INFO" "Downloaded: $TotalDownloaded, Skipped: $TotalSkipped, Failed: $TotalFailed"
Log-Message "INFO" "Duration: $($Duration.Hours)h $($Duration.Minutes)m $($Duration.Seconds)s"

Print-Status "Green" "`n+ All done! Check the '$BaseDir' directory for your papers."

# Made with Bob
