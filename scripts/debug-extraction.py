#!/usr/bin/env python3
"""Debug what pdfplumber extracts from Paper 12"""

import pdfplumber
import sys

def debug_pdf(path):
    with pdfplumber.open(path) as pdf:
        for page_num in [2, 3]:  # Pages 2 and 3
            page = pdf.pages[page_num - 1]
            
            print(f"\n{'='*60}")
            print(f"PAGE {page_num}")
            print(f"{'='*60}\n")
            
            # Try full page
            print("FULL PAGE TEXT:")
            print("-" * 60)
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                for i, line in enumerate(lines[:20], 1):
                    # Replace checkmarks to avoid unicode error
                    safe_line = line.replace('✓', '[CHECK]').replace('✔', '[CHECK]')
                    print(f"{i:3d}: {safe_line}")
            else:
                print("NO TEXT EXTRACTED")
            
            print("\n")
            
            # Try cropped
            print("CROPPED (50, 70, 545, 790):")
            print("-" * 60)
            content = page.within_bbox((50, 70, 545, 790))
            if content:
                text = content.extract_text()
                if text:
                    lines = text.split('\n')
                    for i, line in enumerate(lines[:20], 1):
                        safe_line = line.replace('✓', '[CHECK]').replace('✔', '[CHECK]')
                        print(f"{i:3d}: {safe_line}")
                else:
                    print("NO TEXT IN CROPPED AREA")
            else:
                print("CROP FAILED")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python debug-extraction.py <pdf_path>")
        sys.exit(1)
    
    debug_pdf(sys.argv[1])

# Made with Bob
