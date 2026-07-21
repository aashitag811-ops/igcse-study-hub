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

print("=== Fixing Q10 and Q35 ===\n")

# Fix Q10 - on page 3
print("Fixing Q10...")
page = doc[3]
q10_y = find_question_on_page(page, 10)
q11_y = find_question_on_page(page, 11)

if q10_y and q11_y:
    print(f"Q10 on page 3 at y={q10_y}")
    print(f"Q11 on page 3 at y={q11_y}")
    # Trim closer to Q11 (10px margin)
    clip = fitz.Rect(0, q10_y - 10, page.rect.width, q11_y - 10)
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    output_path = f"{output_dir}/q10.png"
    img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
    print(f"[OK] Q10 (trimmed) -> q10.png\n")
else:
    print(f"ERROR: Could not find Q10 or Q11 on page 3\n")

# Fix Q35 - search all pages
print("Fixing Q35...")
found = False
for page_num in range(len(doc)):
    page = doc[page_num]
    q35_y = find_question_on_page(page, 35)
    if q35_y:
        q36_y = find_question_on_page(page, 36)
        if q36_y:
            print(f"Q35 on page {page_num} at y={q35_y}")
            print(f"Q36 on page {page_num} at y={q36_y}")
            # Trim closer to Q36 (10px margin)
            clip = fitz.Rect(0, q35_y - 10, page.rect.width, q36_y - 10)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            output_path = f"{output_dir}/q35.png"
            img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
            print(f"[OK] Q35 (trimmed) -> q35.png\n")
            found = True
            break

if not found:
    print("ERROR: Could not find Q35 and Q36 on same page\n")

doc.close()
print("[DONE] Q10 and Q35 fixed!")

# Made with Bob
