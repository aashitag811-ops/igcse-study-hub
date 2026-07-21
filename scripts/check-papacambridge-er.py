#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check PapaCambridge for missing Examiner Report PDFs
Compares local ER files against expected papers and generates download URLs
"""

import os
import re
import sys
from pathlib import Path
from collections import defaultdict

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Subject configurations
SUBJECTS = {
    '0610': {'name': 'Biology', 'papers': [1, 2]},  # Paper 1 & 2 are MCQ
    '0620': {'name': 'Chemistry', 'papers': [1, 2]},
    '0625': {'name': 'Physics', 'papers': [1, 2]},
    '0455': {'name': 'Economics', 'papers': [1]},  # Only Paper 1 is MCQ
}

# Years and sessions to check
YEARS = range(2014, 2026)  # 2014-2025
SESSIONS = ['m', 's', 'w']  # March, Summer, Winter

def get_local_er_files():
    """Scan local directory for existing ER files"""
    local_files = set()
    pastpapers_dir = Path('scripts/pastpapers')
    
    if not pastpapers_dir.exists():
        print(f"❌ Directory not found: {pastpapers_dir}")
        return local_files
    
    for er_file in pastpapers_dir.rglob('*_er.pdf'):
        # Extract paper ID from filename (e.g., 0610_m20_er.pdf -> 0610_m20)
        match = re.match(r'(\d{4})_([smw])(\d{2})_er\.pdf', er_file.name)
        if match:
            subject, session, year = match.groups()
            paper_id = f"{subject}_{session}{year}"
            local_files.add(paper_id)
    
    return local_files

def generate_expected_papers():
    """Generate list of all expected paper IDs"""
    expected = []
    
    for subject_code, config in SUBJECTS.items():
        for year in YEARS:
            year_short = str(year)[2:]  # 2020 -> 20
            for session in SESSIONS:
                paper_id = f"{subject_code}_{session}{year_short}"
                expected.append({
                    'paper_id': paper_id,
                    'subject_code': subject_code,
                    'subject_name': config['name'],
                    'year': year,
                    'session': session,
                })
    
    return expected

def generate_papacambridge_url(paper_info):
    """Generate PapaCambridge download URL for ER file"""
    subject_code = paper_info['subject_code']
    year = paper_info['year']
    session = paper_info['session']
    year_short = str(year)[2:]
    
    # PapaCambridge URL pattern
    # Example: https://pastpapers.papacambridge.com/directories/IGCSE/Biology%20(0610)/2020/0610_m20_er.pdf
    
    session_map = {'m': 'March', 's': 'Summer', 'w': 'Winter'}
    session_name = session_map.get(session, session.upper())
    
    subject_name = paper_info['subject_name']
    filename = f"{subject_code}_{session}{year_short}_er.pdf"
    
    url = f"https://pastpapers.papacambridge.com/directories/IGCSE/{subject_name}%20({subject_code})/{year}/{filename}"
    
    return url

def main():
    print("🔍 Checking PapaCambridge for Missing Examiner Reports\n")
    print("=" * 80)
    
    # Get local files
    print("\n📂 Scanning local ER files...")
    local_files = get_local_er_files()
    print(f"✅ Found {len(local_files)} local ER files\n")
    
    # Generate expected papers
    print("📋 Generating expected paper list...")
    expected_papers = generate_expected_papers()
    print(f"✅ Expecting {len(expected_papers)} ER files total\n")
    
    # Find missing files
    missing_by_subject = defaultdict(list)
    
    for paper in expected_papers:
        paper_id = paper['paper_id']
        if paper_id not in local_files:
            missing_by_subject[paper['subject_code']].append(paper)
    
    # Report results
    print("=" * 80)
    print("\n📊 SUMMARY BY SUBJECT\n")
    
    total_missing = 0
    for subject_code in sorted(SUBJECTS.keys()):
        subject_name = SUBJECTS[subject_code]['name']
        expected_count = len([p for p in expected_papers if p['subject_code'] == subject_code])
        missing_count = len(missing_by_subject[subject_code])
        found_count = expected_count - missing_count
        
        coverage = (found_count / expected_count * 100) if expected_count > 0 else 0
        
        print(f"{subject_name} ({subject_code}):")
        print(f"  ✅ Found: {found_count}/{expected_count} ({coverage:.1f}%)")
        print(f"  ❌ Missing: {missing_count}")
        print()
        
        total_missing += missing_count
    
    # Generate download URLs for missing files
    if total_missing > 0:
        print("=" * 80)
        print(f"\n📥 MISSING ER FILES ({total_missing} total)\n")
        print("Copy these URLs to download from PapaCambridge:\n")
        
        for subject_code in sorted(SUBJECTS.keys()):
            missing_papers = missing_by_subject[subject_code]
            if missing_papers:
                subject_name = SUBJECTS[subject_code]['name']
                print(f"\n## {subject_name} ({subject_code}) - {len(missing_papers)} missing\n")
                
                for paper in sorted(missing_papers, key=lambda x: (x['year'], x['session'])):
                    url = generate_papacambridge_url(paper)
                    print(f"{paper['paper_id']}: {url}")
        
        # Generate wget/curl commands
        print("\n" + "=" * 80)
        print("\n💡 BULK DOWNLOAD COMMANDS\n")
        print("Save URLs to a file 'missing_er_urls.txt' and use:\n")
        print("# Using wget:")
        print("wget -i missing_er_urls.txt -P scripts/pastpapers/downloads/\n")
        print("# Using curl:")
        print("xargs -n 1 curl -O < missing_er_urls.txt\n")
    else:
        print("=" * 80)
        print("\n🎉 ALL ER FILES PRESENT! No missing files.\n")
    
    print("=" * 80)

if __name__ == '__main__':
    main()

# Made with Bob
