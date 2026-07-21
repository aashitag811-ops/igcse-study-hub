import fitz  # PyMuPDF
from PIL import Image
import io

# Open the PDF
pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
doc = fitz.open(pdf_path)

output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

def extract_question(doc, question_num, start_page, start_y, end_page, end_y):
    """Extract a question that might span multiple pages"""
    
    if start_page == end_page:
        # Single page extraction
        page = doc[start_page]
        clip = fitz.Rect(0, start_y - 10, page.rect.width, end_y)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        output_path = f"{output_dir}/q{question_num}.png"
        img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
        print(f"[OK] Q{question_num} -> q{question_num}.png")
    else:
        # Multi-page extraction
        page1 = doc[start_page]
        clip1 = fitz.Rect(0, start_y - 10, page1.rect.width, page1.rect.height - 40)
        pix1 = page1.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip1)
        img1 = Image.open(io.BytesIO(pix1.tobytes("png")))
        
        page2 = doc[end_page]
        # Ensure end_y is greater than start (40)
        if end_y <= 40:
            end_y = 100  # Minimum height for second page
        clip2 = fitz.Rect(0, 40, page2.rect.width, end_y)
        pix2 = page2.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip2)
        img2 = Image.open(io.BytesIO(pix2.tobytes("png")))
        
        # Merge vertically
        total_height = img1.height + img2.height
        merged = Image.new('RGB', (img1.width, total_height), 'white')
        merged.paste(img1, (0, 0))
        merged.paste(img2, (0, img1.height))
        
        output_path = f"{output_dir}/q{question_num}.png"
        merged.save(output_path, 'PNG', quality=95, dpi=(150, 150))
        print(f"[OK] Q{question_num} merged from pages {start_page}-{end_page} -> q{question_num}.png")

# Find question number on page (left margin only)
def find_question_on_page(page, q_num):
    """Find question number on page (left margin only)"""
    text_instances = page.search_for(str(q_num))
    for inst in text_instances:
        if inst.x0 < 100:  # Left margin
            return inst.y0
    return None

# Extract Q13
print("\n=== Extracting Q13 ===")
for page_num in range(1, len(doc)):
    page = doc[page_num]
    q13_y = find_question_on_page(page, 13)
    if q13_y:
        print(f"Found Q13 on page {page_num} at y={q13_y}")
        q14_y = find_question_on_page(page, 14)
        if q14_y:
            print(f"Found Q14 on same page at y={q14_y}")
            # Stop 25px before Q14 to avoid capturing its first line
            extract_question(doc, 13, page_num, q13_y, page_num, q14_y - 25)
        else:
            next_page = doc[page_num + 1]
            q14_y = find_question_on_page(next_page, 14)
            if q14_y:
                print(f"Found Q14 on next page at y={q14_y}")
                extract_question(doc, 13, page_num, q13_y, page_num + 1, q14_y - 25)
        break

# Extract Q14
print("\n=== Extracting Q14 ===")
for page_num in range(1, len(doc)):
    page = doc[page_num]
    q14_y = find_question_on_page(page, 14)
    if q14_y:
        print(f"Found Q14 on page {page_num} at y={q14_y}")
        q15_y = find_question_on_page(page, 15)
        if q15_y:
            print(f"Found Q15 on same page at y={q15_y}")
            # Stop 25px before Q15
            extract_question(doc, 14, page_num, q14_y, page_num, q15_y - 25)
        else:
            next_page = doc[page_num + 1]
            q15_y = find_question_on_page(next_page, 15)
            if q15_y:
                print(f"Found Q15 on next page at y={q15_y}")
                extract_question(doc, 14, page_num, q14_y, page_num + 1, q15_y - 25)
        break

# Extract Q15
print("\n=== Extracting Q15 ===")
for page_num in range(1, len(doc)):
    page = doc[page_num]
    q15_y = find_question_on_page(page, 15)
    if q15_y:
        print(f"Found Q15 on page {page_num} at y={q15_y}")
        q16_y = find_question_on_page(page, 16)
        if q16_y:
            print(f"Found Q16 on same page at y={q16_y}")
            # Stop 25px before Q16
            extract_question(doc, 15, page_num, q15_y, page_num, q16_y - 25)
        else:
            next_page = doc[page_num + 1]
            q16_y = find_question_on_page(next_page, 16)
            if q16_y:
                print(f"Found Q16 on next page at y={q16_y}")
                extract_question(doc, 15, page_num, q15_y, page_num + 1, q16_y - 25)
        break

doc.close()
print("\n[DONE] Q13, Q14, and Q15 re-extracted with proper boundaries")

# Made with Bob
