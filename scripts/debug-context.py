#!/usr/bin/env python3
"""Show context around specific line numbers"""

import fitz
import re
import sys

def clean_text(text):
    text = re.sub(r'\.{3,}', '', text)
    text = re.sub(r'©\s*\d{4}', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_lines(pdf_path):
    doc = fitz.open(pdf_path)
    all_lines = []
    
    for page_num in range(len(doc)):
        if page_num == 0:
            continue
        
        page = doc[page_num]
        text_dict = page.get_text("dict")
        
        for block in text_dict["blocks"]:
            if "lines" not in block:
                continue
            
            for line in block["lines"]:
                line_text = ""
                for span in line["spans"]:
                    line_text += span["text"]
                
                line_text = clean_text(line_text)
                
                if line_text:
                    all_lines.append({
                        "page": page_num + 1,
                        "y": line["bbox"][1],
                        "text": line_text
                    })
    
    all_lines.sort(key=lambda x: (x["page"], x["y"]))
    return all_lines

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    lines = extract_lines(pdf_path)
    
    # Show context around lines where Q2, Q6, Q8, Q11 should be
    target_lines = [10, 45, 127, 176]
    
    for target in target_lines:
        print(f"\n{'='*60}")
        print(f"Context around line {target}:")
        print(f"{'='*60}\n")
        
        start = max(0, target - 3)
        end = min(len(lines), target + 4)
        
        for i in range(start, end):
            marker = " >>> " if i == target else "     "
            print(f"{marker}Line {i}: Page {lines[i]['page']}, Y={lines[i]['y']:.1f}")
            print(f"     Text: '{lines[i]['text']}'")
            print()

# Made with Bob
