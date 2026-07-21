import fitz  # PyMuPDF
from PIL import Image
import io

# Open the PDF
pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
doc = fitz.open(pdf_path)

output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

# Find question number on page (left margin only)
def find_question_on_page(page, q_num):
    """Find question number on page (left margin only)"""
    text_instances = page.search_for(str(q_num))
    for inst in text_instances:
        if inst.x0 < 100:  # Left margin
            return inst.y0
    return None

print("\n=== Extracting Q20 (Complete) ===")

# Find Q20 and Q21 across all pages
q20_page = None
q20_y = None
q21_page = None
q21_y = None

for page_num in range(len(doc)):
    page = doc[page_num]
    if q20_y is None:
        y = find_question_on_page(page, 20)
        if y:
            q20_page = page_num
            q20_y = y
            print(f"Found Q20 on page {page_num} at y={y}")
    
    if q21_y is None:
        y = find_question_on_page(page, 21)
        if y:
            q21_page = page_num
            q21_y = y
            print(f"Found Q21 on page {page_num} at y={y}")

if q20_page is None or q21_page is None:
    print("ERROR: Could not find Q20 or Q21")
    doc.close()
    exit(1)

# Q20 is at bottom of one page, Q21 on another
page_q20 = doc[q20_page]
page_q21 = doc[q21_page]

if q20_page == q21_page:
    # Same page - simple extraction
    clip = fitz.Rect(0, q20_y - 10, page_q20.rect.width, q21_y - 10)
    pix = page_q20.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    output_path = f"{output_dir}/q20.png"
    img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
    print(f"[OK] Q20 (same page) -> q20.png")
else:
    # Different pages - merge
    # Page 1: From Q20 to page end
    # If Q20 is on page 0 (front page), skip more header space
    start_y = q20_y - 10
    if q20_page == 0:
        # Page 0 has extra header info, start from Q20 number itself
        start_y = q20_y + 5  # Start just after the "20" number
        print(f"Page 0 detected - skipping header, starting at y={start_y}")
    
    clip1 = fitz.Rect(0, start_y, page_q20.rect.width, page_q20.rect.height)
    pix1 = page_q20.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip1)
    img1 = Image.open(io.BytesIO(pix1.tobytes("png")))
    print(f"Page {q20_page}: Extracted from y={start_y} to page end")
    
    # Page 2: From top (skip header) to Q21
    clip2 = fitz.Rect(0, 50, page_q21.rect.width, q21_y - 10)
    pix2 = page_q21.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip2)
    img2 = Image.open(io.BytesIO(pix2.tobytes("png")))
    print(f"Page {q21_page}: Extracted from y=50 to y={q21_y-10}")
    
    # Merge vertically
    total_height = img1.height + img2.height
    merged = Image.new('RGB', (img1.width, total_height), 'white')
    merged.paste(img1, (0, 0))
    merged.paste(img2, (0, img1.height))
    
    output_path = f"{output_dir}/q20.png"
    merged.save(output_path, 'PNG', quality=95, dpi=(150, 150))
    print(f"[OK] Q20 merged from pages {q20_page}-{q21_page} -> q20.png")

doc.close()
print("\n[DONE] Q20 re-extracted with complete content from both pages")

# Made with Bob
