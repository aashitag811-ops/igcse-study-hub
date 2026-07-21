#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF Structure Analyzer
Analyzes different PDF formats to understand parsing challenges
"""

import pdfplumber
import re
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def analyze_pdf_structure(pdf_path):
    """Analyze the structure of a PDF file"""
    print(f"\n{'='*70}")
    print(f"ANALYZING: {pdf_path}")
    print(f"{'='*70}\n")
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total Pages: {len(pdf.pages)}")
        
        # Analyze first 3 pages
        for page_num in range(min(3, len(pdf.pages))):
            page = pdf.pages[page_num]
            text = page.extract_text()
            
            print(f"\n--- PAGE {page_num + 1} ---")
            print(f"Character count: {len(text)}")
            
            # Show first 1000 characters
            print("\nFirst 1000 characters:")
            print("-" * 70)
            print(text[:1000])
            print("-" * 70)
            
            # Find question patterns
            questions = re.findall(r'\n(\d+)\s+(.{0,100})', text)
            print(f"\nDetected question patterns: {len(questions)}")
            if questions:
                print("First 5 questions:")
                for q_num, q_text in questions[:5]:
                    print(f"  Q{q_num}: {q_text[:50]}...")
            
            # Find option patterns
            options = re.findall(r'\n\s*([A-D])\s+(.{0,50})', text)
            print(f"\nDetected option patterns: {len(options)}")
            if options:
                print("First 5 options:")
                for opt_letter, opt_text in options[:5]:
                    print(f"  {opt_letter}: {opt_text[:40]}...")

if __name__ == "__main__":
    # Analyze both the working and problematic papers
    papers = [
        "scripts/0610_m20_qp_22.pdf",  # Working perfectly
        "scripts/0455_m25_qp_12.pdf",  # Has issues
        "scripts/0610_m25_qp_12.pdf",  # Check this one too
    ]
    
    for paper in papers:
        try:
            analyze_pdf_structure(paper)
        except Exception as e:
            print(f"\n[ERROR] Failed to analyze {paper}: {e}")
    
    print("\n" + "="*70)
    print("ANALYSIS COMPLETE")
    print("="*70)

# Made with Bob
