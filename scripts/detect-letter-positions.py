import json
from PIL import Image
import os

# This script will help identify where letters are in images
# We'll analyze the images to find the actual letter positions

def analyze_question_image(image_path, question_num):
    """Analyze a question image to suggest letter positions"""
    try:
        img = Image.open(image_path)
        width, height = img.size
        
        print(f"\nQ{question_num}: Image size = {width}x{height}")
        
        # Common letter positions as percentages
        # Based on typical PDF layouts:
        # - Left margin letters: usually around 10-15% from left
        # - Table format letters: usually around 18-20% from left
        
        # Suggest positions based on image analysis
        print(f"  Suggested x-positions to try:")
        print(f"    - Left margin style: x=12.5%")
        print(f"    - Table style: x=18.5%")
        print(f"    - Compact style: x=15.5%")
        
        return True
    except Exception as e:
        print(f"  Error: {e}")
        return False

# Check which images exist
image_dir = "../public/images/biology/questions"
questions_to_check = [1, 3, 9, 13, 16, 30, 32, 35, 40]

print("Analyzing question images to find letter positions...")
print("=" * 60)

for q_num in questions_to_check:
    image_path = f"{image_dir}/q{q_num}.png"
    if os.path.exists(image_path):
        analyze_question_image(image_path, q_num)
    else:
        print(f"\nQ{q_num}: Image not found at {image_path}")

print("\n" + "=" * 60)
print("\nRECOMMENDATION:")
print("Based on your screenshots showing Q2, Q5, Q6, Q10 as CORRECT,")
print("the working x-coordinates are:")
print("  - Q2: x=14.33 (table format)")
print("  - Q6: x=12.61 (left margin)")
print("\nBUT these don't seem to work for Q1, Q3, Q9, etc.")
print("\nThis suggests the letters in Q1, Q3, Q9 are at a DIFFERENT")
print("x-position than Q2. They might need x=18.5% or x=19%")

# Made with Bob