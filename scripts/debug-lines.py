#!/usr/bin/env python3
"""Debug script to see what lines are being detected"""

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

def is_question_start(line):
    text = line["text"].strip()
    y_pos = line["y"]
    
    if re.match(r'^\[', text):
        return False
    if re.match(r'^\d+\s+\d+', text):
        return False
    if 20 < y_pos < 30:
        return False
    
    if re.match(r'^(\d{1,2})$', text):
        num = int(text)
        if 1 <= num <= 12:
            if 55 < y_pos < 75:
                return True
    
    match = re.match(r'^(\d{1,2})\s+([A-Za-z])', text)
    if match:
        num = int(match.group(1))
        if 1 <= num <= 12:
            if 55 < y_pos < 400:
                return True
    
    return False

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    lines = extract_lines(pdf_path)
    
    print(f"Total lines: {len(lines)}\n")
    print("Lines detected as question starts:\n")
    
    for i, line in enumerate(lines):
        if is_question_start(line):
            print(f"Line {i}: Page {line['page']}, Y={line['y']:.1f}")
            print(f"  Text: '{line['text']}'")
            print()
    
    print("\n" + "="*60)
    print("All lines at Y position 60-70 (where questions should be):\n")
    
    for i, line in enumerate(lines):
        if 60 < line['y'] < 70:
            print(f"Line {i}: Page {line['page']}, Y={line['y']:.1f}")
            print(f"  Text: '{line['text']}'")
            print()

# Made with Bob
