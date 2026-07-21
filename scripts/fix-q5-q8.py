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
        clip = fitz.Rect(0, start_y - 10, page.rect.width, end_y + 10)
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
        clip2 = fitz.Rect(0, 40, page2.rect.width, end_y + 10)
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

# Find Q5, Q6, Q8, Q9 positions
def find_question_on_page(page, q_num):
    """Find question number on page"""
    text_instances = page.search_for(str(q_num))
    for inst in text_instances:
        if inst.x0 < 100:  # Left margin
            return inst.y0
    return None

# Extract Q5 (find where it starts and where Q6 starts)
print("\n=== Extracting Q5 ===")
for page_num in range(1, len(doc)):
    page = doc[page_num]
    q5_y = find_question_on_page(page, 5)
    if q5_y:
        print(f"Found Q5 on page {page_num} at y={q5_y}")
        # Find Q6
        q6_y = find_question_on_page(page, 6)
        if q6_y:
            print(f"Found Q6 on same page at y={q6_y}")
            extract_question(doc, 5, page_num, q5_y, page_num, q6_y - 10)
        else:
            # Q6 might be on next page
            next_page = doc[page_num + 1]
            q6_y = find_question_on_page(next_page, 6)
            if q6_y:
                print(f"Found Q6 on next page {page_num + 1} at y={q6_y}")
                extract_question(doc, 5, page_num, q5_y, page_num + 1, q6_y - 10)
            else:
                # Use page end
                extract_question(doc, 5, page_num, q5_y, page_num, page.rect.height - 40)
        break

# Extract Q8 (find where it starts and where Q9 starts)
print("\n=== Extracting Q8 ===")
for page_num in range(1, len(doc)):
    page = doc[page_num]
    q8_y = find_question_on_page(page, 8)
    if q8_y:
        print(f"Found Q8 on page {page_num} at y={q8_y}")
        # Find Q9
        q9_y = find_question_on_page(page, 9)
        if q9_y:
            print(f"Found Q9 on same page at y={q9_y}")
            extract_question(doc, 8, page_num, q8_y, page_num, q9_y - 10)
        else:
            # Q9 might be on next page
            next_page = doc[page_num + 1]
            q9_y = find_question_on_page(next_page, 9)
            if q9_y:
                print(f"Found Q9 on next page {page_num + 1} at y={q9_y}")
                extract_question(doc, 8, page_num, q8_y, page_num + 1, q9_y - 10)
            else:
                # Use page end
                extract_question(doc, 8, page_num, q8_y, page_num, page.rect.height - 40)
        break

doc.close()
print("\n[DONE] Q5 and Q8 re-extracted")

# Made with Bob
