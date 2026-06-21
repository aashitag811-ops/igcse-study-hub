"""
Automated Image Extraction from Question Paper PDFs
Extracts all images from a PDF and saves them with proper naming
"""

import fitz  # PyMuPDF
from PIL import Image
import io
import os
import sys
import json
from pathlib import Path

def extract_images_from_pdf(pdf_path, paper_id, output_dir="public/papers/images"):
    """
    Extract all images from a PDF and save them with proper naming
    
    Args:
        pdf_path: Path to the PDF file
        paper_id: Paper ID (e.g., '0417_s20_qp_11')
        output_dir: Directory to save images
    """
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Open PDF
    doc = fitz.open(pdf_path)
    
    extracted_images = []
    image_counter = 1
    
    print(f"Processing {pdf_path}...")
    print(f"Total pages: {len(doc)}")
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images()
        
        if image_list:
            print(f"\nPage {page_num + 1}: Found {len(image_list)} images")
        
        for img_index, img in enumerate(image_list):
            try:
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # Create filename
                filename = f"{paper_id}_img{image_counter}.{image_ext}"
                filepath = os.path.join(output_dir, filename)
                
                # Save image
                with open(filepath, "wb") as img_file:
                    img_file.write(image_bytes)
                
                # Get image dimensions
                image = Image.open(io.BytesIO(image_bytes))
                width, height = image.size
                
                extracted_images.append({
                    "filename": filename,
                    "page": page_num + 1,
                    "width": width,
                    "height": height,
                    "format": image_ext,
                    "path": f"/papers/images/{filename}"
                })
                
                print(f"  [OK] Extracted: {filename} ({width}x{height})")
                image_counter += 1
                
            except Exception as e:
                print(f"  [ERROR] Error extracting image {img_index + 1}: {e}")
    
    doc.close()
    
    # Save metadata
    metadata_path = os.path.join(output_dir, f"{paper_id}_images.json")
    with open(metadata_path, "w") as f:
        json.dump({
            "paper_id": paper_id,
            "total_images": len(extracted_images),
            "images": extracted_images
        }, f, indent=2)
    
    print(f"\n[SUCCESS] Extraction complete!")
    print(f"  Total images extracted: {len(extracted_images)}")
    print(f"  Metadata saved to: {metadata_path}")
    print(f"\nNext steps:")
    print(f"1. Review images in {output_dir}")
    print(f"2. Identify which images belong to which questions")
    print(f"3. Rename images to match question numbers (e.g., {paper_id}_q3b_img1.png)")
    print(f"4. Update the JSON file to reference these images")
    
    return extracted_images

def batch_extract_all_papers(papers_dir="public/papers/pdfs"):
    """
    Extract images from all PDFs in the papers directory
    """
    pdf_files = list(Path(papers_dir).glob("*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {papers_dir}")
        return
    
    print(f"Found {len(pdf_files)} PDF files")
    
    for pdf_path in pdf_files:
        # Extract paper ID from filename (e.g., 0417_s20_qp_11.pdf -> 0417_s20_qp_11)
        paper_id = pdf_path.stem
        
        try:
            extract_images_from_pdf(str(pdf_path), paper_id)
            print("\n" + "="*60 + "\n")
        except Exception as e:
            print(f"Error processing {pdf_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Single PDF:  python extract-images-from-pdf.py <pdf_path> <paper_id>")
        print("  Batch mode:  python extract-images-from-pdf.py --batch")
        print("\nExample:")
        print("  python extract-images-from-pdf.py public/papers/pdfs/0417_s20_qp_11.pdf 0417_s20_qp_11")
        sys.exit(1)
    
    if sys.argv[1] == "--batch":
        batch_extract_all_papers()
    else:
        pdf_path = sys.argv[1]
        paper_id = sys.argv[2] if len(sys.argv) > 2 else Path(pdf_path).stem
        extract_images_from_pdf(pdf_path, paper_id)

# Made with Bob
