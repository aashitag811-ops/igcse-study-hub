"""
Extract Question Number Y-Coordinates from PDF
Analyzes PDF text layer to find question numbers and their positions
Generates coordinate mapping for floating ER buttons
"""

import sys
import json
import re
from pathlib import Path
import fitz  # PyMuPDF

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def extract_question_coordinates(pdf_path: str) -> dict:
    """
    Extract question number positions from PDF
    Returns dict with question numbers and their Y-coordinates per page
    """
    try:
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        coordinates = []
        
        for page_num in range(total_pages):
            page = doc[page_num]
            
            # Get text with position information
            text_instances = page.get_text("dict")
            
            # Look for question number patterns at start of line
            # Must be standalone question numbers (not part of other text)
            question_pattern = re.compile(r'^\s*(\d+)\s*$|^(\d+)\s+[A-Z]', re.MULTILINE)
            
            for block in text_instances.get("blocks", []):
                if block.get("type") == 0:  # Text block
                    for line in block.get("lines", []):
                        line_text = ""
                        line_bbox = line.get("bbox", [0, 0, 0, 0])
                        
                        # Concatenate text from spans
                        for span in line.get("spans", []):
                            line_text += span.get("text", "")
                        
                        # Check if this line contains a question number
                        line_stripped = line_text.strip()
                        
                        # Only match if it's a standalone number or number followed by capital letter
                        if line_stripped and len(line_stripped) <= 3 and line_stripped.isdigit():
                            q_num = int(line_stripped)
                            
                            # Get Y-coordinate (top of bounding box)
                            y_coord = line_bbox[1]
                            
                            # Only add if it's a reasonable question number (1-40)
                            # and has reasonable font size (not too small)
                            if 1 <= q_num <= 40 and line_bbox[3] - line_bbox[1] > 8:
                                coordinates.append({
                                    "qNum": q_num,
                                    "topPx": int(y_coord),
                                    "page": page_num + 1,
                                    "text": line_text.strip()[:50].encode('ascii', 'replace').decode('ascii')
                                })
        
        # Remove duplicates and filter out likely false positives
        # Keep only the first occurrence of each question number
        seen_questions = {}
        for coord in coordinates:
            q_num = coord["qNum"]
            if q_num not in seen_questions:
                seen_questions[q_num] = coord
        
        # Convert back to list and sort by question number
        unique_coords = list(seen_questions.values())
        unique_coords.sort(key=lambda x: x["qNum"])
        
        doc.close()
        
        return {
            "pdfPath": pdf_path,
            "totalPages": total_pages,
            "questionsFound": len(unique_coords),
            "coordinates": unique_coords
        }
        
    except Exception as e:
        print(f"Error processing PDF: {e}", file=sys.stderr)
        return {"error": str(e)}

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract-question-coordinates.py <pdf_path> [output_json]")
        print("Example: python extract-question-coordinates.py public/pdfs/0610_m20_qp_22.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not Path(pdf_path).exists():
        print(f"Error: PDF file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Extracting question coordinates from: {pdf_path}")
    result = extract_question_coordinates(pdf_path)
    
    if "error" in result:
        print(f"Failed: {result['error']}", file=sys.stderr)
        sys.exit(1)
    
    print(f"\n[OK] Found {result['questionsFound']} questions across {result['totalPages']} pages")
    print("\nQuestion Coordinates:")
    print("-" * 60)
    
    for coord in result["coordinates"]:
        text_preview = coord['text'][:40] if len(coord['text']) > 40 else coord['text']
        print(f"Q{coord['qNum']:2d} | Page {coord['page']} | Y={coord['topPx']:4d}px | {text_preview}")
    
    # Save to JSON if output path specified
    if output_path:
        # Create directory if it doesn't exist
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\n[OK] Saved coordinates to: {output_path}")
    else:
        # Print JSON to stdout
        print("\n" + "=" * 60)
        print("JSON Output:")
        print("=" * 60)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()

# Made with Bob