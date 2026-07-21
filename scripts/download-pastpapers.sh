#!/bin/bash

# IGCSE Past Papers Mass Downloader
# Downloads papers from PapaCambridge for multiple subjects (2015-2025)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory for downloads
BASE_DIR="pastpapers"

# Create base directory
mkdir -p "$BASE_DIR"

# Log file
LOG_FILE="$BASE_DIR/download_log_$(date +%Y%m%d_%H%M%S).txt"

# Subject codes and names
declare -A SUBJECTS=(
    ["0580"]="Mathematics"
    ["0606"]="Additional Mathematics"
    ["0500"]="First Language English"
    ["0549"]="Hindi as a Second Language"
    ["0520"]="French - Foreign Language"
    ["0610"]="Biology"
    ["0620"]="Chemistry"
    ["0625"]="Physics"
    ["0417"]="Information and Communication Technology"
    ["0450"]="Business Studies"
    ["0452"]="Accounting"
    ["0455"]="Economics"
    ["0457"]="Global Perspectives"
)

# Years to download
YEARS=(2015 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025)

# Sessions
SESSIONS=("s" "m" "w")  # Summer, March, Winter

# Paper types (qp=question paper, ms=mark scheme, gt=grade thresholds, er=examiner report)
PAPER_TYPES=("qp" "ms" "gt" "er")

# Paper numbers (common variants)
PAPER_NUMBERS=("11" "12" "13" "21" "22" "23" "31" "32" "33" "41" "42" "43" "51" "52" "53" "61" "62" "63")

# Statistics
TOTAL_DOWNLOADED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0

# Function to log messages
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to download a file
download_file() {
    local url=$1
    local output_path=$2
    local filename=$(basename "$output_path")
    
    # Check if file already exists
    if [ -f "$output_path" ]; then
        print_status "$YELLOW" "  ⊙ Already exists: $filename"
        log_message "SKIP" "File already exists: $output_path"
        ((TOTAL_SKIPPED++))
        return 0
    fi
    
    # Try to download
    if curl -f -s -L -o "$output_path" "$url" 2>/dev/null; then
        # Check if downloaded file is actually a PDF
        if file "$output_path" | grep -q "PDF"; then
            print_status "$GREEN" "  ✓ Downloaded: $filename"
            log_message "SUCCESS" "Downloaded: $output_path"
            ((TOTAL_DOWNLOADED++))
            return 0
        else
            # Not a PDF, remove it
            rm "$output_path"
            ((TOTAL_FAILED++))
            return 1
        fi
    else
        ((TOTAL_FAILED++))
        return 1
    fi
}

# Function to download papers for a subject
download_subject_papers() {
    local subject_code=$1
    local subject_name=$2
    
    print_status "$BLUE" "\n=========================================="
    print_status "$BLUE" "Downloading: $subject_name ($subject_code)"
    print_status "$BLUE" "=========================================="
    log_message "INFO" "Starting download for $subject_name ($subject_code)"
    
    # Create subject directory
    local subject_dir="$BASE_DIR/$subject_code-$subject_name"
    mkdir -p "$subject_dir"
    
    # Loop through years
    for year in "${YEARS[@]}"; do
        print_status "$YELLOW" "\n--- Year: $year ---"
        
        # Create year directory
        local year_dir="$subject_dir/$year"
        mkdir -p "$year_dir"
        
        # Loop through sessions
        for session in "${SESSIONS[@]}"; do
            local session_name=""
            case $session in
                "s") session_name="Summer" ;;
                "m") session_name="March" ;;
                "w") session_name="Winter" ;;
            esac
            
            print_status "$YELLOW" "\n  Session: $session_name ($session)"
            
            # Create session directory
            local session_dir="$year_dir/${session_name}"
            mkdir -p "$session_dir"
            
            # Download grade thresholds (only once per session)
            local gt_code="${subject_code}_${session}${year:2:2}_gt"
            local gt_url="https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${gt_code}.pdf"
            local gt_path="$session_dir/${gt_code}.pdf"
            download_file "$gt_url" "$gt_path"
            
            # Download examiner reports (only once per session)
            local er_code="${subject_code}_${session}${year:2:2}_er"
            local er_url="https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${er_code}.pdf"
            local er_path="$session_dir/${er_code}.pdf"
            download_file "$er_url" "$er_path"
            
            # Loop through paper types (qp and ms)
            for paper_type in "qp" "ms"; do
                # Loop through paper numbers
                for paper_num in "${PAPER_NUMBERS[@]}"; do
                    local paper_code="${subject_code}_${session}${year:2:2}_${paper_type}_${paper_num}"
                    local paper_url="https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${paper_code}.pdf"
                    local paper_path="$session_dir/${paper_code}.pdf"
                    
                    download_file "$paper_url" "$paper_path"
                done
            done
        done
    done
    
    print_status "$GREEN" "\n✓ Completed: $subject_name"
    log_message "INFO" "Completed download for $subject_name ($subject_code)"
}

# Main execution
main() {
    print_status "$BLUE" "╔════════════════════════════════════════════════════════╗"
    print_status "$BLUE" "║   IGCSE Past Papers Mass Downloader                   ║"
    print_status "$BLUE" "║   Source: PapaCambridge                                ║"
    print_status "$BLUE" "║   Years: 2015-2025                                     ║"
    print_status "$BLUE" "╚════════════════════════════════════════════════════════╝"
    
    log_message "INFO" "Starting mass download process"
    log_message "INFO" "Base directory: $BASE_DIR"
    
    local start_time=$(date +%s)
    
    # Download papers for each subject
    for subject_code in "${!SUBJECTS[@]}"; do
        download_subject_papers "$subject_code" "${SUBJECTS[$subject_code]}"
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local hours=$((duration / 3600))
    local minutes=$(((duration % 3600) / 60))
    local seconds=$((duration % 60))
    
    # Print summary
    print_status "$BLUE" "\n╔════════════════════════════════════════════════════════╗"
    print_status "$BLUE" "║                   DOWNLOAD SUMMARY                     ║"
    print_status "$BLUE" "╚════════════════════════════════════════════════════════╝"
    print_status "$GREEN" "✓ Successfully downloaded: $TOTAL_DOWNLOADED files"
    print_status "$YELLOW" "⊙ Already existed (skipped): $TOTAL_SKIPPED files"
    print_status "$RED" "✗ Failed/Not found: $TOTAL_FAILED files"
    print_status "$BLUE" "⏱ Total time: ${hours}h ${minutes}m ${seconds}s"
    print_status "$BLUE" "📁 Files saved to: $BASE_DIR"
    print_status "$BLUE" "📋 Log file: $LOG_FILE"
    
    log_message "INFO" "Download process completed"
    log_message "INFO" "Downloaded: $TOTAL_DOWNLOADED, Skipped: $TOTAL_SKIPPED, Failed: $TOTAL_FAILED"
    log_message "INFO" "Duration: ${hours}h ${minutes}m ${seconds}s"
}

# Run main function
main

print_status "$GREEN" "\n✓ All done! Check the '$BASE_DIR' directory for your papers."

# Made with Bob
