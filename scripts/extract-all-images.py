"""
Enhanced Image Extraction - Multiple Methods
Extracts images using different techniques to catch all embedded images
"""

import fitz  # PyMuPDF
from PIL import Image
import io
import os
import sys

def extract_images_method1(pdf_path, paper_id, output_dir="public/papers/images"):
    """
    Method 1: Extract using get_images() - Standard method
    """
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    
    extracted = []
    image_counter = 1
    
    print("\n=== METHOD 1: Standard Image Extraction ===")
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images()
        
        if image_list:
            print(f"Page {page_num + 1}: Found {len(image_list)} images")
        
        for img_index, img in enumerate(image_list):
            try:
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                filename = f"{paper_id}_img{image_counter}.{image_ext}"
                filepath = os.path.join(output_dir, filename)
                
                with open(filepath, "wb") as img_file:
                    img_file.write(image_bytes)
                
                image = Image.open(io.BytesIO(image_bytes))
                width, height = image.size
                
                extracted.append({
                    "filename": filename,
                    "page": page_num + 1,
                    "method": "standard",
                    "width": width,
                    "height": height
                })
                
                print(f"  [OK] {filename} ({width}x{height})")
                image_counter += 1
                
            except Exception as e:
                print(f"  [ERROR] Image {img_index + 1}: {e}")
    
    doc.close()
    return extracted, image_counter

def extract_images_method2(pdf_path, paper_id, output_dir="public/papers/images", start_counter=1):
    """
    Method 2: Extract using page pixmap - Renders page as image and extracts
    """
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    
    extracted = []
    image_counter = start_counter
    
    print("\n=== METHOD 2: Pixmap Extraction (for embedded graphics) ===")
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Get all drawing commands
        drawings = page.get_drawings()
        
        if drawings:
            print(f"Page {page_num + 1}: Found {len(drawings)} drawing objects")
            
            # Try to extract each drawing as an image
            for draw_idx, drawing in enumerate(drawings):
                try:
                    # Get bounding box
                    rect = drawing["rect"]
                    
                    # Skip if too small (likely not an image)
                    if rect.width < 50 or rect.height < 50:
                        continue
                    
                    # Render this area as image
                    mat = fitz.Matrix(2, 2)  # 2x zoom for better quality
                    pix = page.get_pixmap(matrix=mat, clip=rect)
                    
                    filename = f"{paper_id}_drawing{image_counter}.png"
                    filepath = os.path.join(output_dir, filename)
                    
                    pix.save(filepath)
                    
                    extracted.append({
                        "filename": filename,
                        "page": page_num + 1,
                        "method": "drawing",
                        "width": int(rect.width),
                        "height": int(rect.height)
                    })
                    
                    print(f"  [OK] {filename} ({int(rect.width)}x{int(rect.height)})")
                    image_counter += 1
                    
                except Exception as e:
                    print(f"  [ERROR] Drawing {draw_idx + 1}: {e}")
    
    doc.close()
    return extracted, image_counter

def extract_images_method3(pdf_path, paper_id, output_dir="public/papers/images", start_counter=1):
    """
    Method 3: Page-by-page screenshot of specific regions
    """
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    
    extracted = []
    image_counter = start_counter
    
    print("\n=== METHOD 3: Region-based Extraction ===")
    print("(Skipping page 1 - cover/instructions)")
    
    for page_num in range(len(doc)):
        # Skip page 1 (index 0) - it's usually cover/instructions
        if page_num == 0:
            continue
            
        page = doc[page_num]
        
        # Get text blocks to identify gaps (where images might be)
        blocks = page.get_text("dict")["blocks"]
        
        # Look for large vertical gaps between text blocks
        text_blocks = [b for b in blocks if b["type"] == 0]
        
        if len(text_blocks) < 2:
            continue
        
        # Sort by vertical position
        text_blocks.sort(key=lambda b: b["bbox"][1])
        
        # Find gaps
        for i in range(len(text_blocks) - 1):
            current_bottom = text_blocks[i]["bbox"][3]
            next_top = text_blocks[i + 1]["bbox"][1]
            gap = next_top - current_bottom
            
            # If gap is significant, there might be an image
            if gap > 100:  # 100 points gap
                try:
                    # Define region
                    rect = fitz.Rect(
                        50,  # left margin
                        current_bottom + 10,
                        page.rect.width - 50,  # right margin
                        next_top - 10
                    )
                    
                    # Render this region
                    mat = fitz.Matrix(2, 2)
                    pix = page.get_pixmap(matrix=mat, clip=rect)
                    
                    # Check if region has actual content (not just white space)
                    # Convert to PIL Image to check
                    img_data = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_data))
                    
                    # Convert to grayscale and check if it's mostly white
                    grayscale = img.convert('L')
                    pixels = list(grayscale.getdata())
                    avg_brightness = sum(pixels) / len(pixels)
                    
                    # If average brightness > 250 (almost white), skip it
                    if avg_brightness > 250:
                        continue
                    
                    filename = f"{paper_id}_region{image_counter}.png"
                    filepath = os.path.join(output_dir, filename)
                    
                    pix.save(filepath)
                    
                    extracted.append({
                        "filename": filename,
                        "page": page_num + 1,
                        "method": "region",
                        "width": int(rect.width),
                        "height": int(rect.height)
                    })
                    
                    print(f"  [OK] Page {page_num + 1} gap region: {filename}")
                    image_counter += 1
                    
                except Exception as e:
                    print(f"  [ERROR] Region extraction: {e}")
    
    doc.close()
    return extracted, image_counter

def main(pdf_path, paper_id):
    """
    Run all extraction methods
    """
    print(f"Processing: {pdf_path}")
    print(f"Paper ID: {paper_id}")
    
    all_extracted = []
    
    # Method 1: Standard extraction
    extracted1, counter = extract_images_method1(pdf_path, paper_id)
    all_extracted.extend(extracted1)
    
    # Method 2: Drawing extraction
    extracted2, counter = extract_images_method2(pdf_path, paper_id, start_counter=counter)
    all_extracted.extend(extracted2)
    
    # Method 3: Region extraction
    extracted3, counter = extract_images_method3(pdf_path, paper_id, start_counter=counter)
    all_extracted.extend(extracted3)
    
    # Summary
    print("\n" + "="*60)
    print(f"TOTAL IMAGES EXTRACTED: {len(all_extracted)}")
    print("="*60)
    
    print("\nBy Method:")
    for method in ["standard", "drawing", "region"]:
        count = len([e for e in all_extracted if e["method"] == method])
        print(f"  {method.capitalize()}: {count}")
    
    print("\nBy Page:")
    pages = set(e["page"] for e in all_extracted)
    for page in sorted(pages):
        count = len([e for e in all_extracted if e["page"] == page])
        print(f"  Page {page}: {count} images")
    
    # Save metadata
    import json
    metadata_path = f"public/papers/images/{paper_id}_all_images.json"
    with open(metadata_path, "w") as f:
        json.dump({
            "paper_id": paper_id,
            "total_images": len(all_extracted),
            "images": all_extracted
        }, f, indent=2)
    
    print(f"\nMetadata saved to: {metadata_path}")
    print("\nNext steps:")
    print("1. Review all extracted images in public/papers/images/")
    print("2. Delete duplicates or unwanted images")
    print("3. Rename images to match questions (e.g., 0417_s20_qp_11_q3b_img1.png)")
    print("4. Update JSON to reference the images")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract-all-images.py <pdf_path> <paper_id>")
        print("Example: python extract-all-images.py path/to/0417_s20_qp_11.pdf 0417_s20_qp_11")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    paper_id = sys.argv[2]
    
    main(pdf_path, paper_id)

# Made with Bob
