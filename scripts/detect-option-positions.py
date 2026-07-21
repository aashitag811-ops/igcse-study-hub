"""
Detect A, B, C, D option letter positions in MCQ question images
and update the JSON file with accurate coordinates for clickable regions.
"""

import json
import os
import sys
from pathlib import Path
from PIL import Image
import pytesseract
import cv2
import numpy as np

# Note: Removed emojis for Windows console compatibility

# Configure tesseract path if needed (Windows)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def detect_letter_positions(image_path):
    """
    Detect positions of A, B, C, D letters in the question image.
    Returns a dictionary with letter positions as percentages.
    """
    print(f"Processing: {image_path}")
    
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"  [ERROR] Could not read image: {image_path}")
        return None
    
    height, width = img.shape[:2]
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply preprocessing to improve OCR
    # Increase contrast
    gray = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)
    
    # Apply thresholding
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Create a version that emphasizes bold text (darker/thicker letters)
    # Dilate to make bold text more prominent
    kernel = np.ones((2,2), np.uint8)
    bold_enhanced = cv2.dilate(thresh, kernel, iterations=1)
    
    positions = {}
    
    # Try multiple PSM modes for better detection
    psm_modes = [11, 6, 3]  # 11=sparse text, 6=uniform block, 3=auto
    
    for psm in psm_modes:
        custom_config = f'--oem 3 --psm {psm}'
        # Try both regular and bold-enhanced images
        for img_version, img_name in [(thresh, 'normal'), (bold_enhanced, 'bold')]:
            data = pytesseract.image_to_data(img_version, config=custom_config, output_type=pytesseract.Output.DICT)
            
            # Look for A, B, C, D letters
            for i, text in enumerate(data['text']):
                text = text.strip()
                
                # Check if this is one of our option letters
                if text in ['A', 'B', 'C', 'D']:
                    x = data['left'][i]
                    y = data['top'][i]
                    w = data['width'][i]
                    h = data['height'][i]
                    conf = data['conf'][i]
                    
                    # Lower confidence threshold and try multiple modes
                    if conf > 50:
                        # Calculate center position as percentage
                        center_x = (x + w/2) / width * 100
                        center_y = (y + h/2) / height * 100
                        
                        # Filter out letters that are likely in the question text (not option markers)
                        # Option letters are typically:
                        # 1. On the left side of the image (x < 20%)
                        # 2. OR in a horizontal row at bottom (y > 80%)
                        # 3. OR in diagram labels (scattered positions)
                        
                        is_left_margin = center_x < 20  # Left side options
                        is_bottom_row = center_y > 75   # Bottom row options
                        is_diagram_label = center_x > 20 and center_y < 75  # Diagram labels
                        
                        # Only accept if it looks like an option marker
                        if is_left_margin or is_bottom_row or (is_diagram_label and len(positions) < 4):
                            # Store position (only if not already found or this one is more confident)
                            if text not in positions or conf > positions[text].get('confidence', 0):
                                positions[text] = {
                                    'x': round(center_x, 2),
                                    'y': round(center_y, 2),
                                    'confidence': conf
                                }
                                print(f"  [OK] Found {text} at ({center_x:.1f}%, {center_y:.1f}%) - confidence: {conf} (PSM {psm}, {img_name})")
        
        # If we found all 4, no need to try other modes
        if len(positions) == 4:
            break
    
    # Remove confidence from final output
    final_positions = {
        letter: {'x': pos['x'], 'y': pos['y']}
        for letter, pos in positions.items()
    }
    
    # Smart interpolation for missing C
    if len(final_positions) == 3 and 'C' not in final_positions:
        if 'A' in final_positions and 'B' in final_positions and 'D' in final_positions:
            a_pos = final_positions['A']
            b_pos = final_positions['B']
            d_pos = final_positions['D']
            
            # Check if they're in a horizontal row (same Y, different X)
            if abs(a_pos['y'] - b_pos['y']) < 5 and abs(b_pos['y'] - d_pos['y']) < 5:
                # Horizontal layout - interpolate X between B and D
                c_x = (b_pos['x'] + d_pos['x']) / 2
                c_y = b_pos['y']
                final_positions['C'] = {'x': round(c_x, 2), 'y': round(c_y, 2)}
                print(f"  [CALC] Calculated C at ({c_x:.1f}%, {c_y:.1f}%) - interpolated from B and D")
            
            # Check if they're in a vertical column (same X, different Y)
            elif abs(a_pos['x'] - b_pos['x']) < 5 and abs(b_pos['x'] - d_pos['x']) < 5:
                # Vertical layout - interpolate Y between B and D
                c_x = b_pos['x']
                c_y = (b_pos['y'] + d_pos['y']) / 2
                final_positions['C'] = {'x': round(c_x, 2), 'y': round(c_y, 2)}
                print(f"  [CALC] Calculated C at ({c_x:.1f}%, {c_y:.1f}%) - interpolated from B and D")
    
    # Check if we found all letters
    if len(final_positions) == 4:
        print(f"  [SUCCESS] All 4 options detected!")
    else:
        print(f"  [WARNING] Only found {len(final_positions)} options: {list(final_positions.keys())}")
    
    return final_positions if final_positions else None


def update_json_with_positions(json_path, images_dir):
    """
    Update the JSON file with detected option positions.
    """
    print(f"\nLoading JSON: {json_path}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    questions = data.get('questions', [])
    updated_count = 0
    
    print(f"Processing {len(questions)} questions...\n")
    
    for question in questions:
        q_num = question['questionNumber']
        image_url = question.get('imageUrl', '')
        
        # Extract image filename from URL
        # e.g., "/images/biology/questions/q1.png?v=24" -> "q1.png"
        image_filename = image_url.split('/')[-1].split('?')[0]
        image_path = os.path.join(images_dir, image_filename)
        
        if not os.path.exists(image_path):
            print(f"Question {q_num}: Image not found at {image_path}")
            continue
        
        # Detect positions
        positions = detect_letter_positions(image_path)
        
        if positions:
            question['optionPositions'] = positions
            updated_count += 1
        
        print()  # Empty line between questions
    
    # Save updated JSON
    print(f"\n[SAVE] Saving updated JSON...")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"[SUCCESS] Updated {updated_count}/{len(questions)} questions with option positions!")
    print(f"[SAVED] File: {json_path}")


def main():
    # Paths
    project_root = Path(__file__).parent.parent
    json_path = project_root / 'public' / 'papers' / '0610_m20_qp_22.json'
    images_dir = project_root / 'public' / 'images' / 'biology' / 'questions'
    
    print("=" * 60)
    print("MCQ Option Position Detector")
    print("=" * 60)
    
    if not json_path.exists():
        print(f"[ERROR] JSON file not found: {json_path}")
        return
    
    if not images_dir.exists():
        print(f"[ERROR] Images directory not found: {images_dir}")
        return
    
    update_json_with_positions(str(json_path), str(images_dir))
    
    print("\n" + "=" * 60)
    print("[COMPLETE] Done! You can now use the updated JSON in your app.")
    print("=" * 60)


if __name__ == '__main__':
    main()

# Made with Bob
