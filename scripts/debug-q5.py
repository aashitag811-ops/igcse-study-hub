"""
Debug Q5 - Find which page it's on and what's being captured
"""

import fitz

pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
doc = fitz.open(pdf_path)

print("Searching for Question 5 in PDF...\n")

for page_num in range(len(doc)):
    page = doc[page_num]
    
    # Search for "5 " at start of line
    search_results = page.search_for("5 ")
    
    if search_results:
        print(f"Page {page_num + 1} (index {page_num}):")
        for i, rect in enumerate(search_results):
            # Get surrounding text
            clip = fitz.Rect(rect.x0 - 10, rect.y0 - 10, rect.x1 + 200, rect.y1 + 50)
            text = page.get_textbox(clip)
            print(f"  Match {i+1}: {text[:100]}")
            print(f"  Coordinates: {rect}")
        print()

doc.close()

# Made with Bob
