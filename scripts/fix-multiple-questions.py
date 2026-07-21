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
            end_y = 100
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

def fix_question_pair(q_num, next_q_num):
    """Fix a question that has overlap with next question"""
    print(f"\n=== Extracting Q{q_num} ===")
    for page_num in range(1, len(doc)):
        page = doc[page_num]
        q_y = find_question_on_page(page, q_num)
        if q_y:
            print(f"Found Q{q_num} on page {page_num} at y={q_y}")
            next_q_y = find_question_on_page(page, next_q_num)
            if next_q_y:
                print(f"Found Q{next_q_num} on same page at y={next_q_y}")
                # Stop 30px before next question
                extract_question(doc, q_num, page_num, q_y, page_num, next_q_y - 30)
            else:
                next_page = doc[page_num + 1]
                next_q_y = find_question_on_page(next_page, next_q_num)
                if next_q_y:
                    print(f"Found Q{next_q_num} on next page at y={next_q_y}")
                    extract_question(doc, q_num, page_num, q_y, page_num + 1, next_q_y - 30)
            break

# Fix Q20 (has line of Q21)
fix_question_pair(20, 21)

# Fix Q24 (is cut)
fix_question_pair(24, 25)

# Fix Q34 (has line of Q35)
fix_question_pair(34, 35)

# Fix Q39 (has line of Q40)
fix_question_pair(39, 40)

doc.close()
print("\n[DONE] Q20, Q24, Q34, and Q39 re-extracted with proper boundaries")

# Made with Bob
