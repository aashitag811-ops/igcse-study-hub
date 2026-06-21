#!/usr/bin/env python3
"""
Link Extracted Images to Parsed JSON
Automatically adds extracted images to the question paper JSON
"""

import json
import sys
from pathlib import Path

def link_images_to_json(paper_json_path, images_json_path):
    """
    Link extracted images to questions in the paper JSON
    
    Args:
        paper_json_path: Path to the paper JSON file
        images_json_path: Path to the images metadata JSON file
    """
    
    # Read the paper JSON
    with open(paper_json_path, 'r', encoding='utf-8') as f:
        paper_data = json.load(f)
    
    # Read the images metadata
    with open(images_json_path, 'r', encoding='utf-8') as f:
        images_data = json.load(f)
    
    if not images_data.get('images'):
        print("No images found in metadata file")
        return
    
    print(f"Found {len(images_data['images'])} images to link")
    
    # Group images by page
    images_by_page = {}
    for img in images_data['images']:
        page = img['page']
        if page not in images_by_page:
            images_by_page[page] = []
        images_by_page[page].append(img)
    
    # Link images to questions
    # Simple heuristic: add all images from a page to the first question on that page
    # You can improve this by using Y-position or other criteria
    
    linked_count = 0
    
    for page_num, page_images in images_by_page.items():
        print(f"\nPage {page_num}: {len(page_images)} images")
        
        # Find questions that might be on this page
        # Since we don't have page info in questions, we'll distribute images across questions
        # Simple approach: add images to questions based on their order
        
        # For now, let's add all images to a single "images" array at the paper level
        # Or we can try to match by question number if images are named appropriately
        
        for img in page_images:
            # Create image object for JSON
            image_obj = {
                "path": f"/papers/images/{img['filename']}",
                "description": f"Image from page {page_num}",
                "width": img.get('width', 0),
                "height": img.get('height', 0)
            }
            
            # Try to find which question this image belongs to
            # For Paper 13, images on page 2 likely belong to Q1 or Q2
            # Images on page 7 likely belong to Q6 or Q7
            
            # Simple heuristic based on page number
            if page_num <= 3:
                # Early pages - likely Q1-Q3
                target_q_index = min(page_num - 1, len(paper_data['questions']) - 1)
            elif page_num <= 8:
                # Middle pages - Q4-Q7
                target_q_index = min(page_num - 2, len(paper_data['questions']) - 1)
            else:
                # Later pages - Q8+
                target_q_index = min(page_num - 3, len(paper_data['questions']) - 1)
            
            # Add image to the question
            if 0 <= target_q_index < len(paper_data['questions']):
                question = paper_data['questions'][target_q_index]
                
                if 'images' not in question:
                    question['images'] = []
                
                question['images'].append(image_obj)
                linked_count += 1
                print(f"  Linked {img['filename']} to Q{question['number']}")
    
    # Save updated JSON
    with open(paper_json_path, 'w', encoding='utf-8') as f:
        json.dump(paper_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Linked {linked_count} images to questions")
    print(f"Updated JSON saved to: {paper_json_path}")
    print("\nNote: Image placement is based on page numbers.")
    print("Review the JSON and adjust image placement if needed.")

def main():
    if len(sys.argv) < 3:
        print("Usage: python link-images-to-json.py <paper_json> <images_json>")
        print("\nExample:")
        print("  python link-images-to-json.py public/papers/0417_s20_qp_13.json public/papers/images/0417_s20_qp_13_all_images.json")
        sys.exit(1)
    
    paper_json_path = sys.argv[1]
    images_json_path = sys.argv[2]
    
    # Check if files exist
    if not Path(paper_json_path).exists():
        print(f"Error: Paper JSON not found: {paper_json_path}")
        sys.exit(1)
    
    if not Path(images_json_path).exists():
        print(f"Error: Images JSON not found: {images_json_path}")
        sys.exit(1)
    
    link_images_to_json(paper_json_path, images_json_path)

if __name__ == '__main__':
    main()

# Made with Bob