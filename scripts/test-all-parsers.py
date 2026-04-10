"""
MULTI-VERSION PARSER TESTING SUITE
Tests 4 different parsing approaches on the same PDF
Run: python scripts/test-all-parsers.py <pdf_path>
"""

import pdfplumber
import fitz  # PyMuPDF
import json
import sys
import os
import re
from datetime import datetime

# ============================================================================
# VERSION 1: BASIC REGEX PARSER
# ============================================================================
def parse_v1_basic(pdf_path):
    """Simple regex-based detection"""
    questions = []
    current_q = None

    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
        
        lines = full_text.split('\n')
        for line in lines:
            # Main question detection
            main_q_match = re.match(r'^(\d+)\s+(.+)', line.strip())
            if main_q_match and len(line.strip()) > 5:
                if current_q:
                    questions.append(current_q)
                current_q = {
                    "id": f"q{main_q_match.group(1)}",
                    "text": main_q_match.group(2),
                    "type": "text",
                    "marks": 1,
                    "subparts": []
                }
            
            if current_q:
                # Type detection
                if "Tick" in line or "[v]" in line or "[v]" in line:
                    current_q["type"] = "selection_table"
                elif "from the list" in line.lower() or "word bank" in line.lower():
                    current_q["type"] = "word_bank"
                elif "Circle" in line:
                    current_q["type"] = "mcq"
                
                # Marks detection
                mark_match = re.search(r'\[(\d+)\]', line)
                if mark_match:
                    current_q["marks"] = int(mark_match.group(1))
        
        if current_q:
            questions.append(current_q)

    return {
        "version": "V1-Basic",
        "paperId": "test_v1",
        "title": "ICT Paper 1 - Basic Parser",
        "duration": 120,
        "totalMarks": sum(q["marks"] for q in questions),
        "questions": questions
    }


# ============================================================================
# VERSION 2: IMAGE-ENHANCED PARSER
# ============================================================================
def parse_v2_images(pdf_path, output_dir="test_v2_assets"):
    """Extracts images and links them to questions"""
    os.makedirs(f"{output_dir}/images", exist_ok=True)
    questions = []
    
    # Extract images with PyMuPDF
    doc = fitz.open(pdf_path)
    images_map = []
    for page_index in range(len(doc)):
        page = doc[page_index]
        img_list = page.get_images()
        for img_index, img in enumerate(img_list):
            try:
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_filename = f"img_p{page_index}_{img_index}.png"
                img_path = f"{output_dir}/images/{image_filename}"
                with open(img_path, "wb") as f:
                    f.write(base_image["image"])
                images_map.append({
                    "page": page_index,
                    "path": f"images/{image_filename}",
                    "index": img_index
                })
            except:
                pass
    
    # Parse text
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            
            # Split by question numbers
            q_blocks = re.split(r'(\n\d+\s+)', text)
            
            for block in q_blocks:
                if not block.strip() or len(block.strip()) < 10:
                    continue
                
                # Determine type
                q_type = "text"
                if "Tick" in block or "[v]" in block:
                    q_type = "selection_table"
                elif "Circle" in block:
                    q_type = "mcq"
                elif "Design" in block or "Draw" in block:
                    q_type = "layout_design"
                
                # Find marks
                marks_match = re.search(r'\[(\d+)\]', block)
                marks = int(marks_match.group(1)) if marks_match else 1
                
                # Link image if on same page
                matched_image = None
                for img in images_map:
                    if img['page'] == i:
                        matched_image = img['path']
                        break
                
                questions.append({
                    "id": f"q{len(questions) + 1}",
                    "text": block.strip(),
                    "type": q_type,
                    "marks": marks,
                    "image": matched_image,
                    "subparts": []
                })
    
    return {
        "version": "V2-Images",
        "paperId": "test_v2",
        "title": "ICT Paper 1 - Image Parser",
        "duration": 120,
        "totalMarks": sum(q["marks"] for q in questions),
        "questions": questions,
        "images_extracted": len(images_map)
    }


# ============================================================================
# VERSION 3: CRITICISM-AWARE PARSER
# ============================================================================
def parse_v3_criticism(pdf_path):
    """Includes validation rules and command word detection"""
    questions = []
    forbidden_brands = ["excel", "word", "access", "powerpoint", "windows"]
    command_words = ["DISCUSS", "EXPLAIN", "DESCRIBE", "IDENTIFY", "COMPARE", "EVALUATE"]
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
        
        # Split by question numbers
        parts = re.split(r'\n(\d+)\s+', full_text)
        
        for i in range(1, len(parts), 2):
            if i + 1 >= len(parts):
                break
            
            q_num = parts[i]
            q_text = parts[i + 1]
            
            # Detect command word
            detected_command = "IDENTIFY"
            for cmd in command_words:
                if cmd.lower() in q_text.lower():
                    detected_command = cmd
                    break
            
            # Detect type
            q_type = "text"
            if "Tick" in q_text:
                q_type = "selection_table"
            elif "Circle" in q_text:
                q_type = "mcq"
            
            # Extract marks
            marks_match = re.search(r'\[(\d+)\]', q_text)
            marks = int(marks_match.group(1)) if marks_match else 1
            
            # Add validation hints
            validation_hints = []
            if detected_command == "DISCUSS" and marks >= 4:
                validation_hints.append("Requires prose format, not bullet points")
            if any(brand in q_text.lower() for brand in forbidden_brands):
                validation_hints.append("WARNING: Contains brand name - use generic terms")
            
            questions.append({
                "id": f"q{q_num}",
                "text": q_text.strip(),
                "type": q_type,
                "marks": marks,
                "command": detected_command,
                "validation_hints": validation_hints,
                "subparts": []
            })
    
    return {
        "version": "V3-Criticism",
        "paperId": "test_v3",
        "title": "ICT Paper 1 - Criticism Parser",
        "duration": 120,
        "totalMarks": sum(q["marks"] for q in questions),
        "questions": questions
    }


# ============================================================================
# VERSION 4: COMMAND-WORD FOCUSED PARSER
# ============================================================================
def parse_v4_commands(pdf_path, output_folder="test_v4_assets"):
    """Focus on command words and high-quality image extraction"""
    os.makedirs(f"{output_folder}/images", exist_ok=True)
    questions = []
    
    # Extract images (high quality)
    doc = fitz.open(pdf_path)
    for i in range(len(doc)):
        for img_index, img in enumerate(doc[i].get_images()):
            try:
                xref = img[0]
                pix = fitz.Pixmap(doc, xref)
                if pix.n - pix.alpha < 4:  # RGB or Gray
                    img_path = f"{output_folder}/images/p{i}_{img_index}.png"
                    pix.save(img_path)
            except:
                pass
    
    # Parse with command word focus
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            parts = re.split(r'\n(\d+\s+)', text)
            
            for part in parts:
                if len(part.strip()) < 15:
                    continue
                
                # Command word detection (priority)
                cmd = "IDENTIFY"
                if "Discuss" in part:
                    cmd = "DISCUSS"
                elif "Explain" in part or "Describe" in part:
                    cmd = "DESCRIBE"
                elif "Compare" in part:
                    cmd = "COMPARE"
                elif "Evaluate" in part:
                    cmd = "EVALUATE"
                
                # Type detection
                q_type = "text"
                if "Tick" in part:
                    q_type = "selection_table"
                elif "Circle" in part:
                    q_type = "mcq"
                
                marks = re.search(r'\[(\d+)\]', part)
                
                # Link image if diagram mentioned
                image_path = None
                if "diagram" in part.lower() or "figure" in part.lower():
                    image_path = f"{output_folder}/images/p{i}_0.png"
                
                questions.append({
                    "id": f"q{len(questions) + 1}",
                    "text": part.strip(),
                    "type": q_type,
                    "command": cmd,
                    "marks": int(marks.group(1)) if marks else 1,
                    "image": image_path if os.path.exists(image_path or "") else None,
                    "subparts": []
                })
    
    return {
        "version": "V4-Commands",
        "paperId": "test_v4",
        "title": "ICT Paper 1 - Command Parser",
        "duration": 120,
        "totalMarks": sum(q["marks"] for q in questions),
        "questions": questions
    }


# ============================================================================
# MAIN TESTING FUNCTION
# ============================================================================
def test_all_versions(pdf_path):
    """Run all 4 parsers and save results"""
    print("=" * 70)
    print("MULTI-VERSION PARSER TEST")
    print("=" * 70)
    print(f"PDF: {pdf_path}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    output_dir = f"test_results_{base_name}"
    os.makedirs(output_dir, exist_ok=True)
    
    results = {}
    
    # Test V1
    print("Testing V1 (Basic)...", end=" ")
    try:
        v1_result = parse_v1_basic(pdf_path)
        v1_path = f"{output_dir}/{base_name}_v1.json"
        with open(v1_path, 'w', encoding='utf-8') as f:
            json.dump(v1_result, f, indent=2, ensure_ascii=False)
        results['v1'] = v1_result
        print(f"[OK] {len(v1_result['questions'])} questions, {v1_result['totalMarks']} marks")
    except Exception as e:
        print(f"[ERROR] Error: {e}")
    
    # Test V2
    print("Testing V2 (Images)...", end=" ")
    try:
        v2_result = parse_v2_images(pdf_path, f"{output_dir}/v2_assets")
        v2_path = f"{output_dir}/{base_name}_v2.json"
        with open(v2_path, 'w', encoding='utf-8') as f:
            json.dump(v2_result, f, indent=2, ensure_ascii=False)
        results['v2'] = v2_result
        print(f"[OK] {len(v2_result['questions'])} questions, {v2_result.get('images_extracted', 0)} images")
    except Exception as e:
        print(f"[ERROR] Error: {e}")
    
    # Test V3
    print("Testing V3 (Criticism)...", end=" ")
    try:
        v3_result = parse_v3_criticism(pdf_path)
        v3_path = f"{output_dir}/{base_name}_v3.json"
        with open(v3_path, 'w', encoding='utf-8') as f:
            json.dump(v3_result, f, indent=2, ensure_ascii=False)
        results['v3'] = v3_result
        print(f"[OK] {len(v3_result['questions'])} questions with validation")
    except Exception as e:
        print(f"[ERROR] Error: {e}")
    
    # Test V4
    print("Testing V4 (Commands)...", end=" ")
    try:
        v4_result = parse_v4_commands(pdf_path, f"{output_dir}/v4_assets")
        v4_path = f"{output_dir}/{base_name}_v4.json"
        with open(v4_path, 'w', encoding='utf-8') as f:
            json.dump(v4_result, f, indent=2, ensure_ascii=False)
        results['v4'] = v4_result
        print(f"[OK] {len(v4_result['questions'])} questions with commands")
    except Exception as e:
        print(f"[ERROR] Error: {e}")
    
    # Summary
    print()
    print("=" * 70)
    print("COMPARISON SUMMARY")
    print("=" * 70)
    print(f"{'Version':<15} {'Questions':<12} {'Total Marks':<12} {'Features'}")
    print("-" * 70)
    for version, data in results.items():
        features = []
        if 'images_extracted' in data:
            features.append(f"{data['images_extracted']} imgs")
        if version == 'v3':
            features.append("validation")
        if version == 'v4':
            features.append("commands")
        print(f"{data['version']:<15} {len(data['questions']):<12} {data['totalMarks']:<12} {', '.join(features)}")
    
    print()
    print(f"[OK] All results saved to: {output_dir}/")
    print()
    print("NEXT STEPS:")
    print("1. Review JSON files in the output directory")
    print("2. Test each version in the UI")
    print("3. Report which version works best")
    
    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test-all-parsers.py <pdf_path>")
        print("Example: python test-all-parsers.py papers/0417_m21_qp_12.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"[ERROR] Error: File not found: {pdf_path}")
        sys.exit(1)
    
    test_all_versions(pdf_path)

# Made with Bob
