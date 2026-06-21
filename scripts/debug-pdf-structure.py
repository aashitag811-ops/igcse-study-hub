"""
Debug script to see actual PDF content and structure
"""
import fitz
import sys

def debug_pdf(pdf_path, max_lines=100):
    """Show first N lines of PDF with details"""
    doc = fitz.open(pdf_path)
    
    print(f"=== PDF: {pdf_path} ===")
    print(f"Total pages: {len(doc)}")
    print("\n=== First {max_lines} lines ===\n")
    
    line_count = 0
    for page_num in range(min(3, len(doc))):  # First 3 pages
        page = doc[page_num]
        text = page.get_text()
        
        print(f"\n--- PAGE {page_num + 1} ---\n")
        
        for line in text.split('\n'):
            line = line.strip()
            if line:
                try:
                    print(f"{line_count:3d}: {line}")
                except UnicodeEncodeError:
                    print(f"{line_count:3d}: {line.encode('utf-8', errors='replace').decode('utf-8')}")
                line_count += 1
                
                if line_count >= max_lines:
                    doc.close()
                    return
    
    doc.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python debug-pdf-structure.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    debug_pdf(pdf_path, max_lines=150)

# Made with Bob
