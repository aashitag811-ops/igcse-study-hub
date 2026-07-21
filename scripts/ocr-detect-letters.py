import json
from PIL import Image
import pytesseract
import os

# Configure tesseract path (Windows)
# You may need to install: pip install pytesseract pillow
# And download Tesseract-OCR from: https://github.com/UB-Mannheim/tesseract/wiki

def detect_letter_positions(image_path, question_num):
    """Use OCR to find bold A, B, C, D letters in the image"""
    try:
        img = Image.open(image_path)
        width, height = img.size
        
        # Use pytesseract to get detailed data about text positions
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        
        positions = {}
        
        # Look for single bold letters A, B, C, D
        for i, text in enumerate(data['text']):
            if text.strip() in ['A', 'B', 'C', 'D']:
                # Get position
                x = data['left'][i]
                y = data['top'][i]
                w = data['width'][i]
                h = data['height'][i]
                
                # Convert to percentages
                x_percent = ((x + w/2) / width) * 100
                y_percent = ((y + h/2) / height) * 100
                
                positions[text.strip()] = {
                    "x": round(x_percent, 2),
                    "y": round(y_percent, 2)
                }
        
        return positions
    except Exception as e:
        print(f"Error detecting Q{question_num}: {e}")
        return None

# Main script
print("Installing pytesseract if needed...")
print("Note: You need Tesseract-OCR installed on your system")
print("=" * 60)

image_dir = "../public/images/biology/questions"
questions_to_fix = [1, 3, 9, 13, 16, 30, 32, 35, 40]

detected_positions = {}

for q_num in questions_to_fix:
    image_path = f"{image_dir}/q{q_num}.png"
    if os.path.exists(image_path):
        print(f"\nDetecting letters in Q{q_num}...")
        positions = detect_letter_positions(image_path, q_num)
        if positions:
            detected_positions[q_num] = positions
            print(f"  Found: {positions}")
        else:
            print(f"  No letters detected")
    else:
        print(f"\nQ{q_num}: Image not found")

# Save detected positions
if detected_positions:
    with open('detected_positions.json', 'w') as f:
        json.dump(detected_positions, f, indent=2)
    print("\n" + "=" * 60)
    print(f"Detected positions saved to detected_positions.json")
    print("Run the next script to apply these positions to the JSON file")
else:
    print("\n" + "=" * 60)
    print("ERROR: Could not detect any letter positions")
    print("Make sure pytesseract and Tesseract-OCR are installed")

# Made with Bob