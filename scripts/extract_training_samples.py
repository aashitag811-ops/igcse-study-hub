"""
Extract sample questions for YOLO training
Creates a diverse training dataset from multiple papers
"""

import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

import fitz  # PyMuPDF
from pathlib import Path
import random

def extract_samples(pdf_path, output_dir, num_samples=15, prefix=""):
    """
    Extract random question images from a paper
    
    Args:
        pdf_path: Path to PDF file
        output_dir: Output directory for images
        num_samples: Number of samples to extract
        prefix: Prefix for filenames (e.g., 'bio_', 'chem_')
    """
    if not Path(pdf_path).exists():
        print(f"  Skipping {pdf_path} - file not found")
        return 0
    
    doc = fitz.open(pdf_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    # Get random questions (avoid first and last few)
    available_questions = list(range(5, 36))  # Questions 5-35
    questions = random.sample(available_questions, min(num_samples, len(available_questions)))
    
    extracted = 0
    
    for q_num in sorted(questions):
        # Find question on page
        for page_num in range(len(doc)):
            page = doc[page_num]
            rects = page.search_for(f"{q_num} ")
            
            if rects:
                # Crop question region
                q_start_y = rects[0].y0
                
                # Find next question
                next_rects = page.search_for(f"{q_num + 1} ")
                if next_rects:
                    q_end_y = next_rects[0].y0
                else:
                    q_end_y = page.rect.height
                
                # Create clip rectangle
                clip = fitz.Rect(0, q_start_y, page.rect.width, q_end_y)
                
                # Render at 2x resolution for better quality
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
                
                # Save image
                output_path = output_dir / f"{prefix}q{q_num}.png"
                pix.save(output_path)
                print(f"  ✓ Extracted Q{q_num}")
                extracted += 1
                break
    
    doc.close()
    return extracted


def main():
    """Extract training samples from multiple papers"""
    
    print("\n" + "="*70)
    print("YOLO Training Sample Extractor")
    print("="*70)
    print("\nExtracting diverse question samples for YOLO training...")
    print("Target: 30-40 images with variety (text, tables, diagrams)\n")
    
    output_dir = Path("training_images")
    output_dir.mkdir(exist_ok=True)
    
    # Papers to extract from (if they exist)
    papers = [
        ("0610_m20_qp_22.pdf", "bio_", 35),   # Biology - extract more since it's the only one
    ]
    
    total_extracted = 0
    
    for pdf_file, prefix, num_samples in papers:
        pdf_path = Path(pdf_file)
        
        if pdf_path.exists():
            print(f"\nProcessing {pdf_file}...")
            extracted = extract_samples(pdf_path, output_dir, num_samples, prefix)
            total_extracted += extracted
        else:
            print(f"\nSkipping {pdf_file} - not found")
            print(f"  (Download it first or use a different paper)")
    
    print("\n" + "="*70)
    print(f"Extraction Complete!")
    print("="*70)
    print(f"Total images extracted: {total_extracted}")
    print(f"Saved to: {output_dir.absolute()}")
    
    if total_extracted >= 30:
        print("\n✓ Great! You have enough samples for training.")
    elif total_extracted >= 20:
        print("\n⚠ You have some samples, but 30-40 is recommended.")
        print("  Try adding more papers or increase num_samples.")
    else:
        print("\n⚠ Not enough samples. You need at least 30-40 images.")
        print("  Add more PDF files to the scripts folder.")
    
    print("\n" + "="*70)
    print("Next Steps:")
    print("="*70)
    print("1. Go to https://roboflow.com (create free account)")
    print("2. Create new project: 'IGCSE MCQ Letters'")
    print(f"3. Upload all images from: {output_dir.absolute()}")
    print("4. Draw boxes around each A, B, C, D letter")
    print("5. Label them as: A, B, C, D")
    print("6. Generate → Export as 'YOLOv8' format")
    print("7. Download the dataset")
    print("8. Run training script")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()

# Made with Bob
